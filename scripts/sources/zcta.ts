import { cachedDownload } from "../lib/cache";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * US Census 2020 ZCTA Gazetteer: ZIP Code Tabulation Area centroids (public domain).
 * Produces data/zcta.json as { "89311": [38.9941, -114.2033], ... } (4 dp, ~11 m).
 */
export const ZCTA_URL = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_zcta_national.zip";

export async function buildZctaTable(): Promise<Record<string, [number, number]>> {
  const zip = await cachedDownload("zcta-2020.zip", ZCTA_URL);
  const dir = mkdtempSync(join(tmpdir(), "zcta-"));
  const zipPath = join(dir, "gaz.zip");
  writeFileSync(zipPath, zip);
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", dir]);
  const text = readFileSync(join(dir, "2020_Gaz_zcta_national.txt"), "utf8");
  const out: Record<string, [number, number]> = {};
  const lines = text.split("\n");
  const header = lines[0].split("\t").map((s) => s.trim());
  const iZip = header.indexOf("GEOID"), iLat = header.indexOf("INTPTLAT"), iLon = header.indexOf("INTPTLONG");
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    if (c.length <= iLon) continue;
    out[c[iZip].trim()] = [Number(Number(c[iLat]).toFixed(4)), Number(Number(c[iLon]).toFixed(4))];
  }
  return out;
}
