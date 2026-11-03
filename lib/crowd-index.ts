import type { ParkRecord } from "./types";

/**
 * Crowd Index: 0–100, lower = quieter. Computed across the whole cohort in
 * data/parks.json (the 63 national parks plus the other nature units), so it
 * is a *relative* measure: a score of 50 means "median among ranked units".
 *
 * Three components, each expressed as a percentile rank (0–100) within the cohort:
 *
 *   visits     percentile of average annual recreation visits (5-year mean).
 *   density    percentile of visits per gross acre. A 90-acre park with 2M
 *              visits is far denser than a 2M-acre park with 2M visits.
 *   peakiness  percentile of the share of annual visits that land in the single
 *              busiest month (1/12 = perfectly even; 0.35 = a third of the year's
 *              visitors in one month). High peakiness means the park is much
 *              busier than its annual number suggests when most people go.
 *
 *   index = 0.40 * visits + 0.40 * density + 0.20 * peakiness
 *
 * Percentile rank uses mid-rank for ties: (count below + 0.5 * count equal) / n.
 * If a component is missing (no acreage, no visitation) the remaining weights
 * are renormalized and `partial` is set so the UI can say so. A park with no
 * visitation at all gets `null`, never a guessed number.
 *
 * To tune: change WEIGHTS. Everything else follows.
 */
export const WEIGHTS = { visits: 0.4, density: 0.4, peakiness: 0.2 } as const;

export interface CrowdComponents {
  visits: { value: number; percentile: number } | null;
  density: { value: number; percentile: number } | null;
  peakiness: { value: number; percentile: number; peakMonth: number } | null;
}

export interface CrowdIndex {
  score: number;
  partial: boolean;
  components: CrowdComponents;
  /** 1 = quietest in cohort. */
  rank: number;
  cohortSize: number;
}

function percentileRanks(values: (number | null)[]): (number | null)[] {
  const present = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  const n = present.length;
  return values.map((v) => {
    if (v === null || n === 0) return null;
    let below = 0, equal = 0;
    for (const x of present) {
      if (x < v) below++;
      else if (x === v) equal++;
    }
    return Math.round(((below + 0.5 * equal) / n) * 1000) / 10;
  });
}

export function computeCrowdIndex(parks: ParkRecord[]): Map<string, CrowdIndex | null> {
  const visits = parks.map((p) => p.visitation?.annualAvg ?? null);
  const density = parks.map((p) =>
    p.visitation && p.acreage && p.acreage.grossAcres > 0 ? p.visitation.annualAvg / p.acreage.grossAcres : null,
  );
  const peak = parks.map((p) => {
    if (!p.visitation || p.visitation.annualAvg <= 0) return null;
    const m = p.visitation.monthlyAvg;
    const max = Math.max(...m);
    return { share: max / p.visitation.annualAvg, month: m.indexOf(max) };
  });
  const pv = percentileRanks(visits);
  const pd = percentileRanks(density);
  const pp = percentileRanks(peak.map((x) => x?.share ?? null));

  const scored = parks.map((p, i) => {
    if (pv[i] === null) return null;
    const parts: { w: number; v: number }[] = [{ w: WEIGHTS.visits, v: pv[i]! }];
    if (pd[i] !== null) parts.push({ w: WEIGHTS.density, v: pd[i]! });
    if (pp[i] !== null) parts.push({ w: WEIGHTS.peakiness, v: pp[i]! });
    const wsum = parts.reduce((a, x) => a + x.w, 0);
    const score = Math.round((parts.reduce((a, x) => a + x.w * x.v, 0) / wsum) * 10) / 10;
    const components: CrowdComponents = {
      visits: { value: visits[i]!, percentile: pv[i]! },
      density: pd[i] !== null ? { value: density[i]!, percentile: pd[i]! } : null,
      peakiness: pp[i] !== null ? { value: peak[i]!.share, percentile: pp[i]!, peakMonth: peak[i]!.month } : null,
    };
    return { score, partial: parts.length < 3, components };
  });

  const order = scored
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s !== null)
    .sort((a, b) => a.s!.score - b.s!.score);
  const result = new Map<string, CrowdIndex | null>();
  parks.forEach((p) => result.set(p.parkCode, null));
  order.forEach((x, rank) => {
    result.set(parks[x.i].parkCode, { ...x.s!, rank: rank + 1, cohortSize: order.length });
  });
  return result;
}
