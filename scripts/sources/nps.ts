import { cachedJson } from "../lib/cache";
import type { Campground, EntranceFee, OperatingHours, ParkImage, ThingToDo } from "../../lib/types";

const BASE = "https://developer.nps.gov/api/v1";

/**
 * Which units count as a "national park". The NPS `designation` field is not
 * a clean enum: the 63 units carry five different values, and National Park of
 * American Samoa has an empty designation, so it is included by code.
 */
export const NATIONAL_PARK_DESIGNATIONS = new Set([
  "National Park",
  "National Park & Preserve",
  "National Parks", // Sequoia & Kings Canyon (one parkCode, two parks)
  "National and State Parks", // Redwood
]);
export const EXTRA_PARK_CODES = new Set(["npsa"]);
export const EXPECTED_PARK_COUNT = 63;

/**
 * Other nature-oriented NPS units ranked alongside the national parks. Any unit
 * with one of these designations is included when the NPS reports recreation
 * visits for it. Historic sites, memorials, battlefields and trails are left out.
 */
export const NATURE_DESIGNATIONS = new Set([
  "National Preserve",
  "National Monument & Preserve",
  "National Seashore",
  "National Lakeshore",
  "National Recreation Area",
  "National River & Recreation Area",
  "National River",
  "National Scenic River",
  "National Scenic Riverway",
  "National Scenic Riverways",
  "National Recreational River",
  "National Wild and Scenic River",
  "Wild & Scenic River",
  "Wild River",
  "Scenic & Recreational River",
  "National Reserve",
  "Ecological & Historic Preserve",
]);

/**
 * National Monuments are a mix of landscapes (Dinosaur, Devils Tower) and
 * historic sites (Statue of Liberty, Stonewall). The NPS data has no field that
 * separates them, so the landscape ones are listed by hand. Add a code here to
 * include a monument; the pipeline warns if the NPS reports no visits for it.
 */
export const NATURE_MONUMENTS = new Set([
  "agfo", "band", "buis", "cabr", "cach", "cakr", "camo", "cavo", "cebr", "colm", "depo", "deto",
  "dino", "elma", "flfo", "fobu", "gicl", "hafo", "jeca", "joda", "kaww", "labe", "muwo", "nabr",
  "orpi", "para", "rabr", "scbl", "sucr", "tica", "tusk", "vicr", "waca",
]);

export interface RawPark {
  parkCode: string;
  fullName: string;
  name: string;
  designation: string;
  states: string;
  description: string;
  weatherInfo: string;
  url: string;
  latitude: string;
  longitude: string;
  activities: { id: string; name: string }[];
  topics: { id: string; name: string }[];
  entranceFees: { cost: string; title: string; description: string }[];
  operatingHours: OperatingHours[];
  images: ParkImage[];
}

async function npsGet<T>(cacheName: string, path: string, params: Record<string, string>, key: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, api_key: key });
  return cachedJson<T>(cacheName, `${BASE}${path}?${qs}`);
}

export function isNationalPark(p: { parkCode: string; designation: string }): boolean {
  return NATIONAL_PARK_DESIGNATIONS.has(p.designation) || EXTRA_PARK_CODES.has(p.parkCode);
}

export function isNatureUnit(p: { parkCode: string; designation: string }): boolean {
  return !isNationalPark(p) && (NATURE_DESIGNATIONS.has(p.designation) || NATURE_MONUMENTS.has(p.parkCode));
}

/** Returns the national parks (asserted to be 63) followed by the other nature units. */
export async function fetchParks(key: string): Promise<{ nationalParks: RawPark[]; natureUnits: RawPark[] }> {
  const res = await npsGet<{ total: string; data: RawPark[] }>("nps-parks.json", "/parks", { limit: "700" }, key);
  if (res.data.length < Number(res.total)) throw new Error(`/parks returned ${res.data.length} of ${res.total}`);
  const nationalParks = res.data.filter(isNationalPark);
  if (nationalParks.length !== EXPECTED_PARK_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_PARK_COUNT} national park units, got ${nationalParks.length}: ` +
        nationalParks.map((p) => p.parkCode).join(","),
    );
  }
  const natureUnits = res.data.filter(isNatureUnit);
  const missing = [...NATURE_MONUMENTS].filter((c) => !res.data.some((p) => p.parkCode === c));
  if (missing.length) throw new Error(`NATURE_MONUMENTS codes not in /parks: ${missing.join(",")}`);
  return { nationalParks, natureUnits };
}

export function normalizeFees(fees: RawPark["entranceFees"]): EntranceFee[] {
  return fees.map((f) => ({ cost: Number(f.cost), title: f.title, description: f.description }));
}

/** activity name -> parkCodes, from /activities/parks (used to cross-check /parks). */
export async function fetchActivitiesByPark(key: string): Promise<Map<string, Set<string>>> {
  const res = await npsGet<{ data: { name: string; parks: { parkCode: string }[] }[] }>(
    "nps-activities-parks.json", "/activities/parks", { limit: "100" }, key,
  );
  const byPark = new Map<string, Set<string>>();
  for (const a of res.data) {
    for (const p of a.parks) {
      if (!byPark.has(p.parkCode)) byPark.set(p.parkCode, new Set());
      byPark.get(p.parkCode)!.add(a.name);
    }
  }
  return byPark;
}

interface RawThing {
  id: string; url: string; title: string; shortDescription: string;
  images: ParkImage[]; relatedParks: { parkCode: string }[];
  activities: { name: string }[]; season: string[]; seasonDescription: string;
  duration: string; doFeesApply: string; isReservationRequired: string;
}

export async function fetchThingsToDo(parkCode: string, key: string): Promise<ThingToDo[]> {
  const res = await npsGet<{ data: RawThing[] }>(
    `nps-thingstodo-${parkCode}.json`, "/thingstodo", { parkCode, limit: "200" }, key,
  );
  return res.data
    .filter((t) => t.relatedParks.some((p) => p.parkCode === parkCode))
    .map((t) => ({
      id: t.id,
      parkCode,
      title: t.title,
      shortDescription: t.shortDescription,
      url: t.url,
      activities: t.activities.map((a) => a.name),
      season: t.season ?? [],
      seasonDescription: t.seasonDescription ?? "",
      duration: t.duration ?? "",
      doFeesApply: t.doFeesApply === "true",
      isReservationRequired: t.isReservationRequired === "true",
      image: t.images?.[0]
        ? { url: t.images[0].url, title: t.images[0].title, altText: t.images[0].altText, caption: t.images[0].caption, credit: t.images[0].credit }
        : null,
    }));
}

interface RawCampground {
  id: string; parkCode: string; name: string; url: string; reservationUrl: string;
  latitude: string; longitude: string;
  numberOfSitesReservable: string; numberOfSitesFirstComeFirstServe: string;
  campsites: { totalSites: string };
}

export async function fetchCampgrounds(parkCodes: Set<string>, key: string): Promise<Campground[]> {
  const res = await npsGet<{ total: string; data: RawCampground[] }>(
    "nps-campgrounds.json", "/campgrounds", { limit: "1000" }, key,
  );
  if (res.data.length < Number(res.total)) throw new Error(`/campgrounds returned ${res.data.length} of ${res.total}`);
  return res.data
    .filter((c) => parkCodes.has(c.parkCode))
    .map((c) => ({
      id: c.id,
      parkCode: c.parkCode,
      name: c.name,
      url: c.url,
      reservationUrl: c.reservationUrl,
      latitude: c.latitude ? Number(c.latitude) : null,
      longitude: c.longitude ? Number(c.longitude) : null,
      sitesReservable: Number(c.numberOfSitesReservable) || 0,
      sitesFirstCome: Number(c.numberOfSitesFirstComeFirstServe) || 0,
      totalSites: Number(c.campsites?.totalSites) || 0,
    }));
}
