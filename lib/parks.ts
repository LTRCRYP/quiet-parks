import parksJson from "@/data/parks.json";
import manifestJson from "@/data/manifest.json";
import thingsJson from "@/data/things-to-do.json";
import campgroundsJson from "@/data/campgrounds.json";
import { computeCrowdIndex, type CrowdIndex } from "./crowd-index";
import { bestMonths, type MonthScore } from "./best-months";
import { familyOf, inLower48, type Family } from "./families";
import { biomeFor, type Biome } from "./pixel-art";
import type { Campground, DataManifest, ParkRecord, ThingToDo } from "./types";

/** Designations that make a unit one of the 63 national parks (mirrors scripts/sources/nps.ts). */
const NATIONAL_PARK_DESIGNATIONS = new Set(["National Park", "National Park & Preserve", "National Parks", "National and State Parks"]);

// Older data files predate the isNationalPark field; derive it so the UI never shows a zero count.
export const parks: ParkRecord[] = (parksJson as Array<Omit<ParkRecord, "isNationalPark"> & { isNationalPark?: boolean }>).map((p) => ({
  ...p,
  isNationalPark: p.isNationalPark ?? (NATIONAL_PARK_DESIGNATIONS.has(p.designation) || p.parkCode === "npsa"),
}));
export const manifest = manifestJson as DataManifest;
const things = thingsJson as ThingToDo[];
const campgrounds = campgroundsJson as Campground[];

const crowdIndex = computeCrowdIndex(parks);

export interface ParkSummary {
  parkCode: string;
  fullName: string;
  name: string;
  designation: string;
  family: Family;
  lower48: boolean;
  biome: Biome;
  states: string[];
  latitude: number;
  longitude: number;
  activities: string[];
  hasEntranceFee: boolean;
  image: ParkRecord["images"][number] | null;
  annualVisits: number | null;
  grossAcres: number | null;
  crowd: CrowdIndex | null;
  best: MonthScore[] | null;
}

/** Slim records for the ranking page and near-me (no descriptions, no series). */
export const summaries: ParkSummary[] = parks.map((p) => ({
  parkCode: p.parkCode,
  fullName: p.fullName,
  name: p.name,
  designation: p.designation,
  family: familyOf(p),
  lower48: inLower48(p.states),
  biome: biomeFor(p),
  states: p.states,
  latitude: p.latitude,
  longitude: p.longitude,
  activities: p.activities,
  hasEntranceFee: p.entranceFees.some((f) => f.cost > 0),
  image: p.images[0] ?? null,
  annualVisits: p.visitation?.annualAvg ?? null,
  grossAcres: p.acreage?.grossAcres ?? null,
  crowd: crowdIndex.get(p.parkCode) ?? null,
  best: bestMonths(p),
}));

export const nationalParkCount = parks.filter((p) => p.isNationalPark).length;

export const getPark = (code: string) => parks.find((p) => p.parkCode === code) ?? null;
export const getCrowd = (code: string) => crowdIndex.get(code) ?? null;
export const getThingsToDo = (code: string) => things.filter((t) => t.parkCode === code);
export const getCampgrounds = (code: string) => campgrounds.filter((c) => c.parkCode === code);

export const allActivities = [...new Set(parks.flatMap((p) => p.activities))].sort();
export const allStates = [...new Set(parks.flatMap((p) => p.states))].sort();

export const visitationVintage = `Visitation: ${manifest.visitation.startYear}–${manifest.visitation.endYear} monthly averages, NPS Visitor Use Statistics`;
export const climateVintage = `Climate: ${manifest.climate.startYear}–${manifest.climate.endYear} means, Open-Meteo ERA5`;
export const acreageVintage = `Acreage: NPS Listing of Acreage, ${manifest.acreage.asOf}`;
