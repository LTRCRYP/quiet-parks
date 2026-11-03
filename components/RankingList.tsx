"use client";
import { useMemo, useState } from "react";
import { ParkCard } from "./ParkCard";
import { FAMILIES, type Family } from "@/lib/families";
import type { ParkSummary } from "@/lib/parks";

const REGIONS: Record<string, string[]> = {
  "Northeast": ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA"],
  "Southeast": ["MD", "DE", "DC", "VA", "WV", "NC", "SC", "GA", "FL", "KY", "TN", "AL", "MS", "AR", "LA"],
  "Midwest": ["OH", "IN", "IL", "MI", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
  "Southwest": ["TX", "OK", "NM", "AZ"],
  "Mountain West": ["CO", "UT", "NV", "WY", "MT", "ID"],
  "Pacific": ["CA", "OR", "WA"],
  "Alaska": ["AK"],
  "Islands": ["HI", "AS", "VI", "PR", "GU", "MP"],
};
const OUTSIDE_LOWER_48 = new Set(["Alaska", "Islands"]);
const GEMS_HIDDEN = 15;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="px-label">{label}</span>
      {children}
    </label>
  );
}

export function RankingList({ parks, activities, states }: {
  parks: ParkSummary[]; activities: string[]; states: string[];
}) {
  const [family, setFamily] = useState<Family | "">("");
  const [lower48, setLower48] = useState(true);
  const [region, setRegion] = useState("");
  const [state, setState] = useState("");
  const [activity, setActivity] = useState("");
  const [fee, setFee] = useState("");
  const [gems, setGems] = useState(false);
  const [order, setOrder] = useState<"quiet" | "busy" | "name">("quiet");

  /** Units in scope for the type + geography switches; "hidden gems" is relative to this set. */
  const scope = useMemo(
    () => parks.filter((p) => (!family || p.family === family) && (!lower48 || p.lower48)),
    [parks, family, lower48],
  );
  const mostVisited = useMemo(() => {
    return new Set(
      scope
        .filter((p) => p.annualVisits !== null)
        .sort((a, b) => b.annualVisits! - a.annualVisits!)
        .slice(0, GEMS_HIDDEN)
        .map((p) => p.parkCode),
    );
  }, [scope]);

  const list = useMemo(() => {
    let out = scope.filter((p) => {
      if (region && !p.states.some((s) => REGIONS[region]?.includes(s))) return false;
      if (state && !p.states.includes(state)) return false;
      if (activity && !p.activities.includes(activity)) return false;
      if (fee === "free" && p.hasEntranceFee) return false;
      if (fee === "fee" && !p.hasEntranceFee) return false;
      if (gems && mostVisited.has(p.parkCode)) return false;
      return true;
    });
    const score = (p: ParkSummary) => p.crowd?.score ?? Number.POSITIVE_INFINITY;
    if (order === "quiet") out = [...out].sort((a, b) => score(a) - score(b));
    else if (order === "busy") out = [...out].sort((a, b) => (b.crowd?.score ?? -1) - (a.crowd?.score ?? -1));
    else out = [...out].sort((a, b) => a.fullName.localeCompare(b.fullName));
    return out;
  }, [scope, region, state, activity, fee, gems, order, mostVisited]);

  const familyCount = (f: Family) => parks.filter((p) => p.family === f && (!lower48 || p.lower48)).length;
  const sel = "px-input w-full px-2 py-1.5 text-sm";
  const notes = [
    lower48 && "hiding Alaska, Hawaii and the territories",
    gems && `hiding the ${GEMS_HIDDEN} most-visited`,
  ].filter(Boolean);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Field label="Type">
          <select className={sel} value={family} onChange={(e) => setFamily(e.target.value as Family | "")}>
            <option value="">All ({scope.length})</option>
            {FAMILIES.map((f) => <option key={f} value={f}>{f}s ({familyCount(f)})</option>)}
          </select>
        </Field>
        <Field label="Region">
          <select className={sel} value={region} onChange={(e) => { setRegion(e.target.value); setState(""); }}>
            <option value="">All</option>
            {Object.keys(REGIONS)
              .filter((r) => !lower48 || !OUTSIDE_LOWER_48.has(r))
              .map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="State">
          <select className={sel} value={state} onChange={(e) => { setState(e.target.value); setRegion(""); }}>
            <option value="">All</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Activity">
          <select className={sel} value={activity} onChange={(e) => setActivity(e.target.value)}>
            <option value="">Any</option>
            {activities.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Entrance fee">
          <select className={sel} value={fee} onChange={(e) => setFee(e.target.value)}>
            <option value="">Any</option>
            <option value="free">Free</option>
            <option value="fee">Has a fee</option>
          </select>
        </Field>
      </div>

      <div className="pixel mt-3 flex flex-wrap items-center gap-2 text-base">
        <button
          type="button"
          className="px-chip"
          aria-pressed={lower48}
          title="Hide Alaska, Hawaii and the territories"
          onClick={() => {
            const next = !lower48;
            setLower48(next);
            if (next && OUTSIDE_LOWER_48.has(region)) setRegion("");
          }}
        >
          Lower 48 only
        </button>
        <button type="button" className="px-chip" aria-pressed={gems} title={`Hide the ${GEMS_HIDDEN} most-visited units in view`} onClick={() => setGems(!gems)}>
          Hidden gems
        </button>
        <div className="px-seg ml-auto" role="group" aria-label="Sort">
          <button type="button" aria-pressed={order === "quiet"} onClick={() => setOrder("quiet")}>Quietest</button>
          <button type="button" aria-pressed={order === "busy"} onClick={() => setOrder("busy")}>Busiest</button>
          <button type="button" aria-pressed={order === "name"} onClick={() => setOrder("name")}>A–Z</button>
        </div>
      </div>

      <div className="px-rule mt-4" />
      <p className="mt-3 text-sm text-ink-3">
        {list.length} of {parks.length} units{notes.length ? ` · ${notes.join(" · ")}` : ""}. Ranks are out of all {parks.length}, so filtered lists skip numbers.
      </p>
      <div>
        {list.map((p) => <ParkCard key={p.parkCode} park={p} rank={p.crowd?.rank} />)}
      </div>
    </div>
  );
}
