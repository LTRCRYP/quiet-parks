import { cachedDownload } from "../lib/cache";
import type { Visitation } from "../../lib/types";

/**
 * NPS Visitor Use Statistics Data Package, 2025 (data.gov), hosted on IRMA.
 * Long-format CSV: UnitCode,Year,Month,Statistic,Value. We keep Statistic=TRV
 * (Recreation Visits). When a new package is released, update these three
 * constants; the DataStore reference and file ids change every year.
 */
export const VISITATION_PACKAGE = "NPS Visitor Use Statistics Data Package, 2025";
export const VISITATION_URL = "https://irma.nps.gov/DataStore/DownloadFile/756959?Reference=2317666";
export const VISITATION_SOURCE = "NPS Visitor Use Statistics (IRMA), data.gov package 2025";
export const VISITATION_START = 2021;
export const VISITATION_END = 2025;

/** IRMA unit codes per parkCode when they differ from the uppercase parkCode. */
const UNIT_OVERRIDES: Record<string, string[]> = {
  seki: ["SEQU", "KICA"],
};

export function unitCodesFor(parkCode: string): string[] {
  return UNIT_OVERRIDES[parkCode] ?? [parkCode.toUpperCase()];
}

/** Returns a map unitCode -> year -> 12 monthly TRV values (null where unreported). */
export async function loadRecreationVisits(unitCodes: Set<string>): Promise<Map<string, Map<number, (number | null)[]>>> {
  const buf = await cachedDownload("vustats-main-data-2025.csv", VISITATION_URL);
  const out = new Map<string, Map<number, (number | null)[]>>();
  const text = buf.toString("utf8");
  let pos = 0;
  while (pos < text.length) {
    const nl = text.indexOf("\n", pos);
    const line = text.slice(pos, nl === -1 ? text.length : nl);
    pos = nl === -1 ? text.length : nl + 1;
    // "ABLI",1979,1,"TRV",1586
    if (!line.includes('"TRV"')) continue;
    const parts = line.split(",");
    if (parts.length !== 5) continue;
    const unit = parts[0].replace(/"/g, "");
    if (!unitCodes.has(unit)) continue;
    const year = Number(parts[1]);
    if (year < VISITATION_START || year > VISITATION_END) continue;
    const month = Number(parts[2]);
    const value = Number(parts[4]);
    if (!out.has(unit)) out.set(unit, new Map());
    const years = out.get(unit)!;
    if (!years.has(year)) years.set(year, Array(12).fill(null));
    years.get(year)![month - 1] = value;
  }
  return out;
}

export function buildVisitation(
  parkCode: string,
  visits: Map<string, Map<number, (number | null)[]>>,
  warn: (msg: string) => void,
): Visitation | null {
  const codes = unitCodesFor(parkCode);
  const byYear: Record<string, number[]> = {};
  for (let y = VISITATION_START; y <= VISITATION_END; y++) {
    const sum = Array(12).fill(0) as number[];
    for (const c of codes) {
      const row = visits.get(c)?.get(y);
      if (!row || row.some((v) => v === null)) {
        warn(`${parkCode}: unit ${c} missing months in ${y}; visitation omitted`);
        return null;
      }
      row.forEach((v, i) => (sum[i] += v as number));
    }
    byYear[String(y)] = sum;
  }
  const years = Object.values(byYear);
  const monthlyAvg = Array.from({ length: 12 }, (_, m) =>
    Math.round(years.reduce((a, yr) => a + yr[m], 0) / years.length),
  );
  const annualAvg = Math.round(years.reduce((a, yr) => a + yr.reduce((x, y) => x + y, 0), 0) / years.length);
  return { unitCodes: codes, startYear: VISITATION_START, endYear: VISITATION_END, byYear, monthlyAvg, annualAvg, source: VISITATION_SOURCE };
}
