"use client";
import { useMemo, useState } from "react";
import { ParkCard } from "./ParkCard";
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

export function RankingList({ parks, activities, states, top15 }: {
  parks: ParkSummary[]; activities: string[]; states: string[]; top15: string[];
}) {
  const [region, setRegion] = useState("");
  const [state, setState] = useState("");
  const [activity, setActivity] = useState("");
  const [fee, setFee] = useState("");
  const [gems, setGems] = useState(false);
  const [order, setOrder] = useState<"quiet" | "busy" | "name">("quiet");

  const list = useMemo(() => {
    const top = new Set(top15);
    let out = parks.filter((p) => {
      if (region && !p.states.some((s) => REGIONS[region]?.includes(s))) return false;
      if (state && !p.states.includes(state)) return false;
      if (activity && !p.activities.includes(activity)) return false;
      if (fee === "free" && p.hasEntranceFee) return false;
      if (fee === "fee" && !p.hasEntranceFee) return false;
      if (gems && top.has(p.parkCode)) return false;
      return true;
    });
    const score = (p: ParkSummary) => p.crowd?.score ?? Number.POSITIVE_INFINITY;
    if (order === "quiet") out = [...out].sort((a, b) => score(a) - score(b));
    else if (order === "busy") out = [...out].sort((a, b) => (b.crowd?.score ?? -1) - (a.crowd?.score ?? -1));
    else out = [...out].sort((a, b) => a.fullName.localeCompare(b.fullName));
    return out;
  }, [parks, region, state, activity, fee, gems, order, top15]);

  const sel = "rounded-sm border border-rule bg-paper px-2 py-1.5 text-sm text-ink";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-4 text-sm">
        <select className={sel} value={region} onChange={(e) => { setRegion(e.target.value); setState(""); }} aria-label="Region">
          <option value="">All regions</option>
          {Object.keys(REGIONS).map((r) => <option key={r}>{r}</option>)}
        </select>
        <select className={sel} value={state} onChange={(e) => { setState(e.target.value); setRegion(""); }} aria-label="State">
          <option value="">All states</option>
          {states.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={sel} value={activity} onChange={(e) => setActivity(e.target.value)} aria-label="Activity">
          <option value="">Any activity</option>
          {activities.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className={sel} value={fee} onChange={(e) => setFee(e.target.value)} aria-label="Entrance fee">
          <option value="">Fee or free</option>
          <option value="free">No entrance fee</option>
          <option value="fee">Has entrance fee</option>
        </select>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={gems} onChange={(e) => setGems(e.target.checked)} className="accent-[var(--moss)]" />
          Hidden gems <span className="text-ink-3">(hide the 15 most-visited)</span>
        </label>
        <select className={`${sel} ml-auto`} value={order} onChange={(e) => setOrder(e.target.value as typeof order)} aria-label="Sort">
          <option value="quiet">Quietest first</option>
          <option value="busy">Busiest first</option>
          <option value="name">By name</option>
        </select>
      </div>
      <p className="mt-3 text-xs text-ink-3">{list.length} of {parks.length} parks</p>
      <div>
        {list.map((p) => <ParkCard key={p.parkCode} park={p} rank={p.crowd?.rank} />)}
      </div>
    </div>
  );
}
