import { NextResponse } from "next/server";
import zcta from "@/data/zcta.json";

const table = zcta as unknown as Record<string, [number, number]>;
const cityCache = new Map<string, { lat: number; lng: number; label: string } | null>();

/** GET /api/geocode?q=89311 | ?q=Boise, ID  ->  { lat, lng, label } */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  const zip = q.match(/^\d{5}/)?.[0];
  if (zip && /^\d{5}(-\d{4})?$/.test(q)) {
    const hit = table[zip];
    if (!hit) return NextResponse.json({ error: `ZIP ${zip} not found` }, { status: 404 });
    return NextResponse.json({ lat: hit[0], lng: hit[1], label: `ZIP ${zip}`, source: "Census ZCTA 2020" });
  }

  const key = q.toLowerCase();
  if (!cityCache.has(key)) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`,
        { headers: { "User-Agent": "quiet-parks (github.com/quiet-parks)", "Accept-Language": "en" }, next: { revalidate: 86400 } },
      );
      const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      cityCache.set(key, json[0] ? { lat: Number(json[0].lat), lng: Number(json[0].lon), label: json[0].display_name.split(",").slice(0, 2).join(",") } : null);
    } catch {
      cityCache.set(key, null);
    }
  }
  const hit = cityCache.get(key);
  if (!hit) return NextResponse.json({ error: `Couldn't find "${q}"` }, { status: 404 });
  return NextResponse.json({ ...hit, source: "Nominatim / OpenStreetMap" });
}
