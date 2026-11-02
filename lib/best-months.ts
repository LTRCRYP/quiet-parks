import { MONTHS, type OperatingHours, type ParkRecord } from "./types";

/**
 * Best months to visit. Three signals per month, each scaled 0–1 (1 = good):
 *
 *   crowd    1 − (month's average visits / busiest month's average visits).
 *            0 in the peak month, approaching 1 in the emptiest.
 *   comfort  temperature × (0.6 + 0.25 × dryness + 0.15 × snow-free).
 *            Temperature gates the rest: a month you can't comfortably be
 *            outside in doesn't get rescued by being dry.
 *            temperature: 1 when the average high is 50–85 °F, falling linearly
 *            to 0 at freezing (32 °F) and at 100 °F.
 *            dryness: 1 at ≤ 1 in of monthly precipitation, 0 at ≥ 6 in.
 *            snow-free: 1 at no snowfall, 0 at ≥ 12 in in the month.
 *   access   1 unless NPS operating-hours data has an exception whose hours are
 *            "Closed" every day and whose date range covers most of the month,
 *            or the month averages under 1% of the peak month's visits (a park
 *            nobody can reach, e.g. Voyageurs during ice-out); then 0.
 *            Free-text alerts are NOT scored (they are shown as caveats).
 *
 *   score = crowd^0.45 × comfort^0.35 × access^0.20   (weighted geometric mean)
 *
 * A geometric mean rather than a weighted sum so that one terrible signal
 * (highs in the 20s, or a closure) sinks a month even when it is empty; an
 * additive blend recommended January in Yellowstone. Missing climate drops the
 * comfort term and renormalizes the exponents. This is a
 * heuristic ranking, not a forecast; the UI should say so and show the inputs.
 */
export const MONTH_WEIGHTS = { crowd: 0.45, comfort: 0.35, access: 0.2 } as const;

export interface MonthScore {
  month: number;
  score: number;
  crowd: number;
  comfort: number | null;
  access: number;
  /** Percent below the peak month's visits. */
  belowPeakPct: number;
  avgHighF: number | null;
  precipIn: number | null;
  closed: boolean;
  /** Under 1% of peak-month visits: treated as inaccessible. */
  nearZero: boolean;
  rationale: string;
}

function tempScore(highF: number): number {
  if (highF >= 50 && highF <= 85) return 1;
  if (highF < 50) return Math.max(0, (highF - 32) / 18);
  return Math.max(0, (100 - highF) / 15);
}
const dryScore = (precipIn: number) => Math.min(1, Math.max(0, (6 - precipIn) / 5));
const snowScore = (snowIn: number) => Math.min(1, Math.max(0, (12 - snowIn) / 12));
const EPS = 0.01; // floor so a zero signal doesn't erase the others entirely

/** Days of `month` (0-based) in a non-leap year covered by [start, end]. */
function daysCovered(start: string, end: string, month: number): number {
  const s = new Date(start), e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  const year = s.getFullYear();
  let covered = 0;
  for (let y = year; y <= e.getFullYear(); y++) {
    const first = new Date(y, month, 1), last = new Date(y, month + 1, 0);
    const lo = Math.max(first.getTime(), s.getTime()), hi = Math.min(last.getTime(), e.getTime());
    if (hi >= lo) covered += Math.round((hi - lo) / 86_400_000) + 1;
  }
  return covered;
}

export function monthClosed(hours: OperatingHours[], month: number): boolean {
  const daysInMonth = new Date(2025, month + 1, 0).getDate();
  for (const h of hours) {
    for (const ex of h.exceptions ?? []) {
      const vals = Object.values(ex.exceptionHours ?? {});
      if (!vals.length || !vals.every((v) => /closed/i.test(v))) continue;
      if (daysCovered(ex.startDate, ex.endDate, month) >= daysInMonth / 2) return true;
    }
  }
  return false;
}

export function scoreMonths(park: ParkRecord): MonthScore[] | null {
  const v = park.visitation;
  if (!v) return null;
  const peak = Math.max(...v.monthlyAvg);
  if (peak <= 0) return null;
  return v.monthlyAvg.map((visits, m) => {
    const crowd = 1 - visits / peak;
    const c = park.climate?.months[m] ?? null;
    const comfort = c ? tempScore(c.avgHighF) * (0.6 + 0.25 * dryScore(c.precipIn) + 0.15 * snowScore(c.snowIn)) : null;
    const closed = monthClosed(park.operatingHours, m);
    const nearZero = visits < peak * 0.01;
    const access = closed || nearZero ? 0 : 1;
    const parts = [
      { w: MONTH_WEIGHTS.crowd, s: crowd },
      ...(comfort !== null ? [{ w: MONTH_WEIGHTS.comfort, s: comfort }] : []),
      { w: MONTH_WEIGHTS.access, s: access },
    ];
    const wsum = parts.reduce((a, p) => a + p.w, 0);
    const score = Math.exp(parts.reduce((a, p) => a + (p.w / wsum) * Math.log(Math.max(EPS, p.s)), 0));
    const belowPeakPct = Math.round(crowd * 100);
    const bits: string[] = [];
    bits.push(belowPeakPct === 0 ? "the busiest month" : `~${belowPeakPct}% below peak crowds`);
    if (c) {
      bits.push(`highs in the ${Math.floor(c.avgHighF / 10) * 10}s`);
      if (c.precipIn >= 4) bits.push("a wet month");
      else if (c.precipIn <= 0.5) bits.push("very dry");
      if (c.snowIn >= 10) bits.push("significant snow");
    } else {
      bits.push("no climate data");
    }
    if (closed) bits.push("listed as closed in NPS operating hours");
    if (nearZero) bits.push("almost no visits reported, likely inaccessible");
    return {
      month: m, score: Math.round(score * 1000) / 1000, crowd, comfort, access, belowPeakPct,
      avgHighF: c?.avgHighF ?? null, precipIn: c?.precipIn ?? null, closed, nearZero,
      rationale: `${MONTHS[m]}: ${bits.join(", ")}.`,
    };
  });
}

export function bestMonths(park: ParkRecord, n = 3): MonthScore[] | null {
  const scores = scoreMonths(park);
  if (!scores) return null;
  return [...scores].sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.month - b.month);
}
