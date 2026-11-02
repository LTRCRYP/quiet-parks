import parksJson from "@/data/parks.json";
import manifestJson from "@/data/manifest.json";
import thingsJson from "@/data/things-to-do.json";
import campgroundsJson from "@/data/campgrounds.json";
import { computeCrowdIndex, type CrowdIndex } from "./crowd-index";
import { bestMonths, type MonthScore } from "./best-months";
import type { Campground, DataManifest, ParkRecord, ThingToDo } from "./types";

export const parks = parksJson as ParkRecord[];
export const manifest = manifestJson as DataManifest;
const things = thingsJson as ThingToDo[];
const campgrounds = campgroundsJson as Campground[];

const crowdIndex = computeCrowdIndex(parks);

export interface ParkSummary {
  parkCode: string;
  fullName: string;
  name: string;
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

/** parkCodes of the N most-visited parks (5-year average), for the "hidden gems" toggle. */
export function mostVisited(n = 15): Set<string> {
  return new Set(
    [...parks]
      .filter((p) => p.visitation)
      .sort((a, b) => b.visitation!.annualAvg - a.visitation!.annualAvg)
      .slice(0, n)
      .map((p) => p.parkCode),
  );
}

export const getPark = (code: string) => parks.find((p) => p.parkCode === code) ?? null;
export const getCrowd = (code: string) => crowdIndex.get(code) ?? null;
export const getThingsToDo = (code: string) => things.filter((t) => t.parkCode === code);
export const getCampgrounds = (code: string) => campgrounds.filter((c) => c.parkCode === code);

export const allActivities = [...new Set(parks.flatMap((p) => p.activities))].sort();
export const allStates = [...new Set(parks.flatMap((p) => p.states))].sort();

export const visitationVintage = `Visitation: ${manifest.visitation.startYear}–${manifest.visitation.endYear} monthly averages, NPS Visitor Use Statistics`;
export const climateVintage = `Climate: ${manifest.climate.startYear}–${manifest.climate.endYear} means, Open-Meteo ERA5`;
export const acreageVintage = `Acreage: NPS Listing of Acreage, ${manifest.acreage.asOf}`;
