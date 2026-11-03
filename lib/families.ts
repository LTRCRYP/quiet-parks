/** Grouping of NPS designations for the ranking filter. No data imports, so client components can use it. */
export const FAMILIES = [
  "National Park",
  "National Monument",
  "Preserve & reserve",
  "Seashore & lakeshore",
  "Recreation area",
  "River",
] as const;
export type Family = (typeof FAMILIES)[number];

export function familyOf(p: { isNationalPark: boolean; designation: string }): Family {
  if (p.isNationalPark) return "National Park";
  const d = p.designation;
  if (/River|Riverway/.test(d)) return "River";
  if (/Preserve|Reserve/.test(d)) return "Preserve & reserve";
  if (/Monument/.test(d)) return "National Monument";
  if (/Seashore|Lakeshore/.test(d)) return "Seashore & lakeshore";
  if (/Recreation Area/.test(d)) return "Recreation area";
  return "Preserve & reserve";
}

/** States and territories outside the contiguous 48. */
const OUTSIDE_LOWER_48 = new Set(["AK", "HI", "AS", "VI", "PR", "GU", "MP"]);

/** True if any of the unit's states is in the contiguous US. */
export function inLower48(states: string[]): boolean {
  return states.some((s) => !OUTSIDE_LOWER_48.has(s));
}
