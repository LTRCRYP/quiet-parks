import { cachedJson, sleep } from "../lib/cache";
import type { Climate, ClimateMonth } from "../../lib/types";

/**
 * Open-Meteo historical weather API (ERA5 reanalysis), no key required.
 * We average 10 years of daily values into monthly figures at the park's
 * NPS coordinate. ERA5 is a ~9 km grid, so the figures describe the grid cell
 * (whose elevation we record), not a specific trailhead.
 */
export const CLIMATE_START = 2015;
export const CLIMATE_END = 2024;
export const CLIMATE_SOURCE = "Open-Meteo historical weather API (ERA5), 10-year monthly means";

interface ArchiveResponse {
  elevation: number;
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    snowfall_sum: (number | null)[];
  };
}

export async function fetchClimate(parkCode: string, lat: number, lon: number): Promise<Climate | null> {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: `${CLIMATE_START}-01-01`,
    end_date: `${CLIMATE_END}-12-31`,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    timezone: "auto",
  });
  let res: ArchiveResponse;
  try {
    res = await cachedJson<ArchiveResponse>(`climate-${parkCode}.json`, `https://archive-api.open-meteo.com/v1/archive?${qs}`);
  } catch (e) {
    process.stderr.write(`  climate ${parkCode}: ${(e as Error).message}\n`);
    return null;
  }
  await sleep(6000); // stay under Open-Meteo per-minute budget; 10-year daily requests are weighted heavily
  const d = res.daily;
  if (!d?.time?.length) return null;

  // Per month: averages of daily highs/lows; per month-year totals of precip/snow, then averaged.
  const hi: number[][] = Array.from({ length: 12 }, () => []);
  const lo: number[][] = Array.from({ length: 12 }, () => []);
  const precipTotals = new Map<string, number>();
  const snowTotals = new Map<string, number>();
  const wetDays = new Map<string, number>();
  for (let i = 0; i < d.time.length; i++) {
    const m = Number(d.time[i].slice(5, 7)) - 1;
    const ym = d.time[i].slice(0, 7);
    if (d.temperature_2m_max[i] != null) hi[m].push(d.temperature_2m_max[i] as number);
    if (d.temperature_2m_min[i] != null) lo[m].push(d.temperature_2m_min[i] as number);
    const p = d.precipitation_sum[i];
    if (p != null) {
      precipTotals.set(ym, (precipTotals.get(ym) ?? 0) + p);
      if (p >= 0.1) wetDays.set(ym, (wetDays.get(ym) ?? 0) + 1);
      else wetDays.set(ym, wetDays.get(ym) ?? 0);
    }
    const s = d.snowfall_sum[i];
    if (s != null) snowTotals.set(ym, (snowTotals.get(ym) ?? 0) + s);
  }
  const years = CLIMATE_END - CLIMATE_START + 1;
  const months: ClimateMonth[] = [];
  for (let m = 0; m < 12; m++) {
    const mm = String(m + 1).padStart(2, "0");
    const sumFor = (map: Map<string, number>) =>
      [...map.entries()].filter(([k]) => k.endsWith(`-${mm}`)).reduce((a, [, v]) => a + v, 0);
    if (!hi[m].length || !lo[m].length) return null;
    months.push({
      avgHighF: round1(hi[m].reduce((a, b) => a + b, 0) / hi[m].length),
      avgLowF: round1(lo[m].reduce((a, b) => a + b, 0) / lo[m].length),
      precipIn: round2(sumFor(precipTotals) / years),
      snowIn: round2(sumFor(snowTotals) / years),
      wetDays: round1(sumFor(wetDays) / years),
    });
  }
  return {
    latitude: lat, longitude: lon, elevationM: res.elevation,
    startYear: CLIMATE_START, endYear: CLIMATE_END, months, source: CLIMATE_SOURCE,
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
