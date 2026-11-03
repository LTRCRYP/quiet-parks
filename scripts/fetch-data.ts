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
/**
 * Nature units reporting fewer visits than this are left out. Below it the
 * count usually means the NPS tallies the unit's visitors under a neighbour
 * (Rio Grande WSR under Big Bend, Alagnak under Katmai), so a rank would mislead.
 * National parks are always kept.
 */
const MIN_NATURE_VISITS = 1000;
const warnings: string[] = [];
const warn = (m: string) => { warnings.push(m); process.stderr.write(`  ! ${m}\n`); };
const log = (m: string) => process.stderr.write(`${m}\n`);

async function main() {
  loadEnv();
  const npsKey = requireEnv("NPS_API_KEY");
  mkdirSync(DATA_DIR, { recursive: true });

  log("NPS /parks");
  const { nationalParks, natureUnits } = await fetchParks(npsKey);
  const nationalParkCodes = new Set(nationalParks.map((p) => p.parkCode));
  const raw = [...nationalParks, ...natureUnits];
  log(`  ${nationalParks.length} national parks, ${natureUnits.length} other nature units`);

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

    const isNationalPark = nationalParkCodes.has(p.parkCode);
    const visitation = buildVisitation(p.parkCode, visits, warn);
    if (!visitation && !isNationalPark) {
      warn(`${p.parkCode}: no recreation visits reported; nature unit skipped`);
      continue;
    }
    if (visitation && !isNationalPark && visitation.annualAvg < MIN_NATURE_VISITS) {
      warn(`${p.parkCode}: only ${visitation.annualAvg} visits/yr reported (under ${MIN_NATURE_VISITS}); nature unit skipped`);
      continue;
    }
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
      isNationalPark,
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
  const codes = new Set(parks.map((p) => p.parkCode));
  const campgrounds = await fetchCampgrounds(codes, npsKey);

  log("Census ZCTA centroids");
  const zcta = await buildZctaTable();

  const manifest: DataManifest = {
    generatedAt: new Date().toISOString(),
    parkCount: parks.length,
    nationalParkCount: parks.filter((p) => p.isNationalPark).length,
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
