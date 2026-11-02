import * as XLSX from "xlsx";
import { cachedDownload } from "../lib/cache";
import type { Acreage } from "../../lib/types";

/**
 * NPS Land Resources Division "Listing of Acreage" (quarterly XLSX).
 * https://www.nps.gov/subjects/lwcf/acreagereports.htm
 * Sheet "Listing of Acreage", column "Gross Area Acres". The sheet has no unit
 * codes and abbreviates names, so the alias map below is maintained by hand.
 * The pipeline fails loudly if an alias is not found rather than guessing.
 */
export const ACREAGE_AS_OF = "2026-09-30";
export const ACREAGE_URL = "https://www.nps.gov/subjects/lwcf/upload/NPS-Acreage-09-30-2026.xlsx";
export const ACREAGE_SOURCE = "NPS Land Resources Division, Listing of Acreage";

/** parkCode -> rows in the acreage listing that make up the unit. */
const ACREAGE_ROWS: Record<string, string[]> = {
  acad: ["ACADIA NP"],
  arch: ["ARCHES NP"],
  badl: ["BADLANDS NP"],
  bibe: ["BIG BEND NP"],
  bisc: ["BISCAYNE NP"],
  blca: ["BLACK CANYON OF GUNNISON"],
  brca: ["BRYCE CANYON NP"],
  cany: ["CANYONLANDS NP"],
  care: ["CAPITOL REEF NP"],
  cave: ["CARLSBAD CAVERNS NP"],
  chir: ["CHIRICAHUA NM"], // redesignated a National Park; the acreage listing still says NM
  chis: ["CHANNEL ISLANDS NP"],
  cong: ["CONGAREE NP"],
  crla: ["CRATER LAKE NP"],
  cuva: ["CUYAHOGA VALLEY NP"],
  deva: ["DEATH VALLEY NP"],
  drto: ["DRY TORTUGAS NP"],
  ever: ["EVERGLADES NP", "EVERGLADES EXPANSION"], // footnote 6: add both rows
  glac: ["GLACIER NP"],
  grba: ["GREAT BASIN NP"],
  grca: ["GRAND CANYON NP"],
  grsm: ["GREAT SMOKY MTS NP"],
  grte: ["GRAND TETON NP"],
  gumo: ["GUADALUPE MTS NP"],
  hale: ["HALEAKALA NP"],
  havo: ["HAWAII VOLCANOES NP"],
  hosp: ["HOT SPRINGS NP"],
  indu: ["INDIANA DUNES NP"],
  isro: ["ISLE ROYALE NP"],
  jeff: ["GATEWAY ARCH NP"],
  jotr: ["JOSHUA TREE NP"],
  kefj: ["KENAI FJORDS NP"],
  kova: ["KOBUK VALLEY NP"],
  lavo: ["LASSEN VOLCANIC NP"],
  maca: ["MAMMOTH CAVE NP"],
  meve: ["MESA VERDE NP"],
  mora: ["MT RAINIER NP"],
  noca: ["NORTH CASCADES NP"],
  olym: ["OLYMPIC NP"],
  pefo: ["PETRIFIED FOREST NP"],
  pinn: ["PINNACLES NP"],
  romo: ["ROCKY MT NP"],
  sagu: ["SAGUARO NP"],
  shen: ["SHENANDOAH NP"],
  thro: ["T ROOSEVELT NP"],
  viis: ["VIRGIN ISLANDS NP"],
  voya: ["VOYAGEURS NP"],
  whsa: ["WHITE SANDS NP"],
  wica: ["WIND CAVE NP"],
  yell: ["YELLOWSTONE NP"],
  yose: ["YOSEMITE NP"],
  zion: ["ZION NP"],
  // Park & Preserve units: visitation is reported for the whole unit, so sum both rows.
  dena: ["DENALI NP", "DENALI N PRESERVE"],
  gaar: ["GATES OF THE ARCTIC NP", "GATES OF ARCTIC N PRES"],
  glba: ["GLACIER BAY NP", "GLACIER BAY N PRESERVE"],
  grsa: ["GREAT SAND DUNES NP", "GREAT SAND DUNES N PRES"],
  katm: ["KATMAI NP", "KATMAI N PRESERVE"],
  lacl: ["LAKE CLARK NP", "LAKE CLARK N PRESERVE"],
  neri: ["NEW RIVER GORGE NP & PRES"],
  wrst: ["WRANGELL-ST ELIAS NP", "WRANGELL-ST ELIAS N PRES"],
  seki: ["SEQUOIA NP", "KINGS CANYON NP"],
  redw: ["REDWOOD NP"],
  npsa: ["NP OF AMERICAN SAMOA"],
};

export async function loadAcreageTable(): Promise<Map<string, number>> {
  const buf = await cachedDownload("nps-acreage.xlsx", ACREAGE_URL);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets["Listing of Acreage"];
  if (!sheet) throw new Error("Acreage workbook has no 'Listing of Acreage' sheet");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown as unknown[][];
  const header = rows.findIndex((r) => r[0] === "Area Name");
  const grossCol = (rows[header] as string[]).indexOf("Gross Area Acres");
  if (header < 0 || grossCol < 0) throw new Error("Acreage sheet layout changed: header row not found");
  const table = new Map<string, number>();
  for (const r of rows.slice(header + 1)) {
    const name = typeof r[0] === "string" ? r[0].trim() : "";
    const gross = r[grossCol];
    if (name && typeof gross === "number") table.set(name, gross);
  }
  return table;
}

export function buildAcreage(parkCode: string, table: Map<string, number>): Acreage | null {
  const rows = ACREAGE_ROWS[parkCode];
  if (!rows) return null;
  let total = 0;
  for (const r of rows) {
    const v = table.get(r);
    if (v === undefined) throw new Error(`Acreage row "${r}" for ${parkCode} not found; update ACREAGE_ROWS`);
    total += v;
  }
  return { grossAcres: Math.round(total * 100) / 100, rows, asOf: ACREAGE_AS_OF, source: ACREAGE_SOURCE };
}
