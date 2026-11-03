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
  // ---- other nature units (see NATURE_DESIGNATIONS / NATURE_MONUMENTS in nps.ts) ----
  // preserves and reserves
  bela: ["BERING LAND BRIDGE N PRES"],
  bicy: ["BIG CYPRESS N PRESERVE", "BIG CYPRESS ADDITION"], // footnote 5: add both rows
  bith: ["BIG THICKET N PRESERVE"],
  liri: ["LITTLE RIVER CANYON"],
  moja: ["MOJAVE NATIONAL PRESERVE"],
  noat: ["NOATAK N PRESERVE"],
  tapr: ["TALLGRASS PRAIRIE NPRE"],
  vall: ["VALLES CALDERA N PRES"],
  yuch: ["YUKON-CHARLEY RIVERS N PR"],
  ania: ["ANIAKCHAK NM", "ANIAKCHAK N PRESERVE"],
  crmo: ["CRATERS OF THE MOON NM", "CRATERS OF THE MOON NPRES"],
  orca: ["OREGON CAVES NM & PRES"],
  ciro: ["CITY OF ROCKS NRESERVE"],
  timu: ["TIMUCUAN ECO & H PRES"],
  // seashores and lakeshores
  asis: ["ASSATEAGUE ISLAND NS"], // footnote 2: includes USFWS-administered acres
  caco: ["CAPE COD NS"],
  caha: ["CAPE HATTERAS NS"],
  calo: ["CAPE LOOKOUT NS"],
  cana: ["CANAVERAL NS"],
  cuis: ["CUMBERLAND ISLAND NS"],
  fiis: ["FIRE ISLAND NS"],
  guis: ["GULF ISLANDS NS"],
  pais: ["PADRE ISLAND NS"],
  pore: ["POINT REYES NS"],
  apis: ["APOSTLE ISLANDS NL"],
  piro: ["PICTURED ROCKS NL"],
  slbe: ["SLEEPING BEAR DUNES NL"],
  // recreation areas
  amis: ["AMISTAD NRA"],
  bica: ["BIGHORN CANYON NRA"],
  boha: ["BOSTON HARBOR ISLAND NRA"],
  chat: ["CHATTAHOOCHEE RVR NRA"],
  chic: ["CHICKASAW NRA"],
  cure: ["CURECANTI NRA"],
  dewa: ["DEL WATER GAP NRA", "MIDDLE DELAWARE NSR"], // the river is listed separately but managed as part of the NRA
  gari: ["GAULEY RIVER NRA"],
  gate: ["GATEWAY NRA"],
  glca: ["GLEN CANYON NRA"],
  goga: ["GOLDEN GATE NRA"],
  lake: ["LAKE MEAD NRA"],
  lamr: ["LAKE MEREDITH NRA"],
  laro: ["LAKE ROOSEVELT NRA"],
  samo: ["SANTA MONICA MTS NRA"],
  whis: ["WHISKEYTOWN-S-T NRA"], // footnote 3: NPS portion only
  // rivers
  alag: ["ALAGNAK WILD RVR"],
  biso: ["BIG SOUTH FORK NR & RA"],
  blue: ["BLUESTONE NSR"],
  buff: ["BUFFALO N RVR"],
  miss: ["MISSISSIPPI N RVR & RA"],
  mnrr: ["MISSOURI N REC RIVER"],
  niob: ["NIOBRARA N. SCENIC RIVER"],
  ozar: ["OZARK NS RIVERWAYS"],
  rigr: ["RIO GRANDE WILD & SR"],
  sacn: ["SAINT CROIX NSR", "LOWER ST CROIX NSR"], // visitation is reported for the whole riverway
  upde: ["UPPER DEL SCENIC & R RVR"],
  // monuments (landscape ones only; see NATURE_MONUMENTS)
  agfo: ["AGATE FOSSIL BEDS NM"],
  band: ["BANDELIER NM"],
  buis: ["BUCK ISLAND REEF NM"],
  cabr: ["CABRILLO NM"],
  cach: ["CANYON DE CHELLY NM"],
  cakr: ["CAPE KRUSENSTERN NM"],
  camo: ["CASTLE MOUNTAINS NM"],
  cavo: ["CAPULIN VOLCANO NM"],
  cebr: ["CEDAR BREAKS NM"],
  colm: ["COLORADO NM"],
  depo: ["DEVILS POSTPILE NM"],
  deto: ["DEVILS TOWER NM"],
  dino: ["DINOSAUR NM"],
  elma: ["EL MALPAIS NM"],
  flfo: ["FLORISSANT FOSSIL BEDS NM"],
  fobu: ["FOSSIL BUTTE NM"],
  gicl: ["GILA CLIFF DWELNGS NM"],
  hafo: ["HAGERMAN FOSSIL BEDS"],
  jeca: ["JEWEL CAVE NM"],
  joda: ["JOHN DAY FOS BEDS NM"],
  kaww: ["KATAHDIN WOODS AND WATERS NM"],
  labe: ["LAVA BEDS NM"],
  muwo: ["MUIR WOODS NM"],
  nabr: ["NATURAL BRIDGES NM"],
  orpi: ["ORGAN PIPE CACTUS NM"],
  // para (Grand Canyon-Parashant) is BLM-managed and not in the NPS acreage listing
  rabr: ["RAINBOW BRIDGE NM"],
  scbl: ["SCOTTS BLUFF NM"],
  sucr: ["SUNSET CRATER VOLC NM"],
  tica: ["TIMPANOGOS CAVE NM"],
  tusk: ["TULE SPRINGS FOSSIL BEDS NM"],
  vicr: ["VIRGIN ISLANDS CORAL REEF"],
  waca: ["WALNUT CANYON NM"],
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
