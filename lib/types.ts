/** Shared data shapes. `data/parks.json` is an array of `ParkRecord`. */

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export interface ParkImage {
  url: string;
  title: string;
  altText: string;
  caption: string;
  credit: string;
}

export interface EntranceFee {
  cost: number;
  title: string;
  description: string;
}

export interface OperatingHours {
  name: string;
  description: string;
  standardHours: Record<string, string>;
  exceptions: {
    name: string;
    startDate: string;
    endDate: string;
    exceptionHours: Record<string, string>;
  }[];
}

export interface Visitation {
  /** IRMA unit codes summed into this record (normally one; SEKI = SEQU + KICA). */
  unitCodes: string[];
  startYear: number;
  endYear: number;
  /** Recreation visits by year, 12 entries each, index 0 = January. */
  byYear: Record<string, number[]>;
  /** Average of the years above, per month. */
  monthlyAvg: number[];
  annualAvg: number;
  source: string;
}

export interface Acreage {
  grossAcres: number;
  /** Row names in the NPS Listing of Acreage that were summed. */
  rows: string[];
  asOf: string;
  source: string;
}

export interface ClimateMonth {
  avgHighF: number;
  avgLowF: number;
  /** Mean total precipitation for the month, inches. */
  precipIn: number;
  /** Mean total snowfall for the month, inches. */
  snowIn: number;
  /** Mean number of days with >= 0.1 in precipitation. */
  wetDays: number;
}

export interface Climate {
  latitude: number;
  longitude: number;
  /** Elevation (m) of the model grid cell Open-Meteo used. */
  elevationM: number;
  startYear: number;
  endYear: number;
  months: ClimateMonth[];
  source: string;
}

export interface ParkRecord {
  parkCode: string;
  fullName: string;
  name: string;
  designation: string;
  states: string[];
  description: string;
  weatherInfo: string;
  url: string;
  latitude: number;
  longitude: number;
  activities: string[];
  topics: string[];
  entranceFees: EntranceFee[];
  operatingHours: OperatingHours[];
  images: ParkImage[];
  visitation: Visitation | null;
  acreage: Acreage | null;
  climate: Climate | null;
}

export interface ThingToDo {
  id: string;
  parkCode: string;
  title: string;
  shortDescription: string;
  url: string;
  activities: string[];
  season: string[];
  seasonDescription: string;
  duration: string;
  doFeesApply: boolean;
  isReservationRequired: boolean;
  image: ParkImage | null;
}

export interface Campground {
  id: string;
  parkCode: string;
  name: string;
  url: string;
  reservationUrl: string;
  latitude: number | null;
  longitude: number | null;
  sitesReservable: number;
  sitesFirstCome: number;
  totalSites: number;
}

export interface DataManifest {
  generatedAt: string;
  parkCount: number;
  visitation: { startYear: number; endYear: number; package: string; source: string };
  acreage: { asOf: string; source: string };
  climate: { startYear: number; endYear: number; source: string };
  nps: { fetchedAt: string; source: string };
}
