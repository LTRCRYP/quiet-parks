/**
 * Pipeline: pulls park metadata (NPS API), recreation visits (NPS Visitor Use
 * Statistics package), acreage (NPS Listing of Acreage), climate (Open-Meteo)
 * and ZIP centroids (Census), and writes normalized JSON to data/.
 *
 *   npm run fetch-data
 *
 * Raw downloads are cached in .cache/; delete a file there to refetch it.
 * Nothing is interpolated: a park missing a source gets `null` for that field.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, requireEnv } from "./lib/env";
import {
  fetchParks, fetchActivitiesByPark, fetchThingsToDo, fetchCampgrounds, normalizeFees,
} from "./sources/nps";
import {
  loadRecreationVisits, buildVisitation, unitCodesFor,
  VISITATION_START, VISITATION_END, VISITATION_PACKAGE, VISITATION_SOURCE,
} from "./sources/visitation";
import { loadAcreageTable, buildAcreage, ACREAGE_AS_OF, ACREAGE_SOURCE } from "./sources/acreage";
import { fetchClimate, CLIMATE_START, CLIMATE_END, CLIMATE_SOURCE } from "./sources/climate";
import { buildZctaTable } from "./sources/zcta";
import type { DataManifest, ParkRecord, ThingToDo } from "../lib/types";

const DATA_DIR = resolve(process.cwd(), "data");
const warnings: string[] = [];
const warn = (m: string) => { warnings.push(m); process.stderr.write(`  ! ${m}\n`); };
const log = (m: string) => process.stderr.write(`${m}\n`);

async function main() {
  loadEnv();
  const npsKey = requireEnv("NPS_API_KEY");
  mkdirSync(DATA_DIR, { recursive: true });

  log("NPS /parks");
  const raw = await fetchParks(npsKey);
  const codes = new Set(raw.map((p) => p.parkCode));

  log("NPS /activities/parks");
  const activitiesByPark = await fetchActivitiesByPark(npsKey);

  log("Visitation CSV");
  const unitCodes = new Set(raw.flatMap((p) => unitCodesFor(p.parkCode)));
  const visits = await loadRecreationVisits(unitCodes);

  log("Acreage XLSX");
  const acreageTable = await loadAcreageTable();

  log("Climate (Open-Meteo), things to do");
  const parks: ParkRecord[] = [];
  const things: ThingToDo[] = [];
  for (const p of raw.sort((a, b) => a.parkCode.localeCompare(b.parkCode))) {
    const lat = Number(p.latitude), lon = Number(p.longitude);
    const fromParks = new Set(p.activities.map((a) => a.name));
    const fromIndex = activitiesByPark.get(p.parkCode) ?? new Set<string>();
    const activities = [...new Set([...fromParks, ...fromIndex])].sort();

    const visitation = buildVisitation(p.parkCode, visits, warn);
    const acreage = buildAcreage(p.parkCode, acreageTable);
    if (!acreage) warn(`${p.parkCode}: no acreage alias`);
    const climate = await fetchClimate(p.parkCode, lat, lon);
    if (!climate) warn(`${p.parkCode}: no climate`);
    things.push(...(await fetchThingsToDo(p.parkCode, npsKey)));

    parks.push({
      parkCode: p.parkCode,
      fullName: p.fullName,
      name: p.name,
      designation: p.designation || "National Park",
      states: p.states.split(",").map((s) => s.trim()).filter(Boolean),
      description: p.description,
      weatherInfo: p.weatherInfo,
      url: p.url,
      latitude: lat,
      longitude: lon,
      activities,
      topics: p.topics.map((t) => t.name),
      entranceFees: normalizeFees(p.entranceFees),
      operatingHours: p.operatingHours,
      images: p.images.map((i) => ({ url: i.url, title: i.title, altText: i.altText, caption: i.caption, credit: i.credit })),
      visitation,
      acreage,
      climate,
    });
    process.stderr.write(`  ${p.parkCode} ok\n`);
  }

  log("NPS /campgrounds");
  const campgrounds = await fetchCampgrounds(codes, npsKey);

  log("Census ZCTA centroids");
  const zcta = await buildZctaTable();

  const manifest: DataManifest = {
    generatedAt: new Date().toISOString(),
    parkCount: parks.length,
    visitation: { startYear: VISITATION_START, endYear: VISITATION_END, package: VISITATION_PACKAGE, source: VISITATION_SOURCE },
    acreage: { asOf: ACREAGE_AS_OF, source: ACREAGE_SOURCE },
    climate: { startYear: CLIMATE_START, endYear: CLIMATE_END, source: CLIMATE_SOURCE },
    nps: { fetchedAt: new Date().toISOString().slice(0, 10), source: "NPS API (developer.nps.gov)" },
  };

  writeFileSync(resolve(DATA_DIR, "parks.json"), JSON.stringify(parks, null, 1));
  writeFileSync(resolve(DATA_DIR, "things-to-do.json"), JSON.stringify(things, null, 1));
  writeFileSync(resolve(DATA_DIR, "campgrounds.json"), JSON.stringify(campgrounds, null, 1));
  writeFileSync(resolve(DATA_DIR, "zcta.json"), JSON.stringify(zcta));
  writeFileSync(resolve(DATA_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(resolve(DATA_DIR, "warnings.txt"), warnings.join("\n") + "\n");

  log(`\nWrote ${parks.length} parks, ${things.length} things to do, ${campgrounds.length} campgrounds, ${Object.keys(zcta).length} ZCTAs.`);
  log(`${warnings.length} warnings (data/warnings.txt).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
