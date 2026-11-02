"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ParkCard } from "./ParkCard";
import { ParkMap, type MapPoint } from "./ParkMap";
import { haversineMiles } from "@/lib/geo";
import type { ParkSummary } from "@/lib/parks";
import type { NearbyLand } from "@/app/api/nearby/route";

type Origin = { lat: number; lng: number; label: string };

export function NearMe({ parks }: { parks: ParkSummary[] }) {
  const [q, setQ] = useState("");
  const [radius, setRadius] = useState(300);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [lands, setLands] = useState<NearbyLand[] | null>(null);
  const [landsError, setLandsError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function go(o: Origin) {
    setOrigin(o); setLands(null); setLandsError(null);
    try {
      const r = await fetch(`/api/nearby?lat=${o.lat}&lng=${o.lng}&radius=${radius}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setLands(j.lands);
    } catch (e) {
      setLandsError((e as Error).message);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Looking up…");
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? r.statusText);
      setStatus(null);
      await go({ lat: j.lat, lng: j.lng, label: j.label });
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  function locate() {
    if (!navigator.geolocation) { setStatus("Geolocation isn't available in this browser."); return; }
    setStatus("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setStatus(null); go({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" }); },
      () => setStatus("Couldn't get your location. Try a city or ZIP."),
      { timeout: 10000 },
    );
  }

  const nearParks = useMemo(() => {
    if (!origin) return [];
    return parks
      .map((p) => ({ p, d: haversineMiles(origin.lat, origin.lng, p.latitude, p.longitude) }))
      .filter((x) => x.d <= radius)
      .sort((a, b) => a.d - b.d);
  }, [origin, parks, radius]);

  const points: MapPoint[] = origin
    ? [
        { lat: origin.lat, lng: origin.lng, label: origin.label, kind: "you" },
        ...nearParks.map(({ p }) => ({ lat: p.latitude, lng: p.longitude, label: p.fullName, href: `/parks/${p.parkCode}`, kind: "park" as const })),
        ...(lands ?? []).slice(0, 60).map((l) => ({ lat: l.lat, lng: l.lng, label: `${l.name} (${l.agency})`, href: l.url, kind: "other" as const })),
      ]
    : [];

  const input = "rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink";
  return (
    <div>
      <form onSubmit={search} className="flex flex-wrap items-center gap-2">
        <input className={`${input} w-64`} placeholder="City or ZIP code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="City or ZIP" />
        <button type="submit" className="rounded-sm bg-moss px-3 py-2 text-sm text-white hover:opacity-90">Search</button>
        <button type="button" onClick={locate} className="rounded-sm border border-rule px-3 py-2 text-sm hover:bg-paper-2">Use my location</button>
        <label className="ml-auto flex items-center gap-2 text-sm text-ink-2">
          Within
          <select className={input} value={radius} onChange={(e) => { setRadius(Number(e.target.value)); }} aria-label="Radius">
            {[100, 200, 300, 500].map((r) => <option key={r} value={r}>{r} mi</option>)}
          </select>
        </label>
      </form>
      {status && <p className="mt-2 text-sm text-ink-2">{status}</p>}

      {origin && (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <h2 className="text-2xl">National parks within {radius} miles of {origin.label}</h2>
            {nearParks.length === 0 ? (
              <p className="mt-3 text-ink-2">None. Widen the radius, or see the <Link href="/" className="underline">full ranking</Link>.</p>
            ) : (
              nearParks.map(({ p, d }) => <ParkCard key={p.parkCode} park={p} distanceMiles={d} />)
            )}

            <h2 className="mt-12 text-2xl">Other federal public lands</h2>
            <p className="mt-1 text-sm text-ink-3">
              National forests, BLM land, wildlife refuges and Army Corps lakes from Recreation.gov. No crowd data exists for these.
              Recreation.gov stores one point per area (often an office), so some large nearby areas may be missing.
            </p>
            {landsError && <p className="mt-3 text-sm text-clay">Couldn&apos;t load nearby lands: {landsError}</p>}
            {lands === null && !landsError && <p className="mt-3 text-sm text-ink-3">Loading…</p>}
            {lands && lands.length === 0 && <p className="mt-3 text-ink-2">Recreation.gov lists nothing within {radius} miles.</p>}
            {lands && lands.length > 0 && (
              <ul className="mt-4 divide-y divide-rule">
                {lands.slice(0, 40).map((l) => (
                  <li key={l.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                    <div className="min-w-0">
                      <a href={l.url} className="font-medium hover:underline">{l.name}</a>
                      <span className="text-ink-3"> · {l.agency}{l.facilityType ? ` · ${l.facilityType}` : ""}</span>
                    </div>
                    <div className="shrink-0 text-right text-ink-3">
                      <span className="tabular-nums">{Math.round(l.distanceMiles)} mi</span>
                      <span className="ml-2 rounded-full border border-rule px-2 py-0.5 text-[11px]">no crowd data</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="h-[420px] lg:sticky lg:top-6">
            <ParkMap points={points} fit />
          </div>
        </div>
      )}
    </div>
  );
}
