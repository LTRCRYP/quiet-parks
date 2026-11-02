import { NextResponse } from "next/server";
import { haversineMiles } from "@/lib/geo";

export interface NearbyLand {
  id: string;
  name: string;
  agency: string;
  type: "recarea" | "facility";
  facilityType?: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  url: string;
  reservable: boolean;
}

interface RidbRecArea {
  RecAreaID: string; RecAreaName: string; RecAreaLatitude: number; RecAreaLongitude: number;
  Reservable: boolean; ORGANIZATION?: { OrgAbbrevName: string; OrgName: string }[];
}
interface RidbFacility {
  FacilityID: string; FacilityName: string; FacilityLatitude: number; FacilityLongitude: number;
  FacilityTypeDescription: string; Reservable: boolean; ParentRecAreaID?: string;
  ORGANIZATION?: { OrgAbbrevName: string; OrgName: string }[];
}

const AGENCY_LABEL: Record<string, string> = {
  USFS: "National Forest (USFS)", FS: "National Forest (USFS)", BLM: "BLM land", FWS: "Wildlife Refuge (FWS)",
  USACE: "Army Corps lake", NPS: "National Park Service", BOR: "Bureau of Reclamation", TVA: "TVA",
};

/**
 * GET /api/nearby?lat=&lng=&radius=300  ->  federal lands from RIDB within radius.
 * RIDB stores one point per rec area (often the office), so large forests can
 * sit outside a radius even when their land is nearby; we say so in the UI.
 */
export async function GET(req: Request) {
  const key = process.env.RIDB_API_KEY;
  if (!key) return NextResponse.json({ error: "RIDB_API_KEY not configured" }, { status: 503 });
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat")), lng = Number(sp.get("lng"));
  const radius = Math.min(500, Math.max(10, Number(sp.get("radius") ?? 300)));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "lat/lng required" }, { status: 400 });

  const headers = { apikey: key };
  const base = "https://ridb.recreation.gov/api/v1";
  const q = `latitude=${lat}&longitude=${lng}&radius=${radius}&limit=50&full=true`;
  try {
    const [ra, fa] = await Promise.all([
      fetch(`${base}/recareas?${q}`, { headers, next: { revalidate: 86400 } }).then((r) => r.json() as Promise<{ RECDATA: RidbRecArea[] }>),
      fetch(`${base}/facilities?${q}&activity=CAMPING`, { headers, next: { revalidate: 86400 } }).then((r) => r.json() as Promise<{ RECDATA: RidbFacility[] }>),
    ]);
    const out: NearbyLand[] = [];
    for (const r of ra.RECDATA ?? []) {
      const org = r.ORGANIZATION?.[0]?.OrgAbbrevName ?? "";
      if (org === "NPS" || !r.RecAreaLatitude) continue; // NPS units are covered by the parks list
      out.push({
        id: `ra-${r.RecAreaID}`, name: r.RecAreaName, agency: AGENCY_LABEL[org] ?? (r.ORGANIZATION?.[0]?.OrgName || "Federal land"),
        type: "recarea", lat: r.RecAreaLatitude, lng: r.RecAreaLongitude,
        distanceMiles: haversineMiles(lat, lng, r.RecAreaLatitude, r.RecAreaLongitude),
        url: `https://www.recreation.gov/camping/gateways/${r.RecAreaID}`, reservable: r.Reservable,
      });
    }
    for (const f of fa.RECDATA ?? []) {
      const org = f.ORGANIZATION?.[0]?.OrgAbbrevName ?? "";
      if (org === "NPS" || !f.FacilityLatitude) continue;
      out.push({
        id: `fa-${f.FacilityID}`, name: f.FacilityName, agency: AGENCY_LABEL[org] ?? (f.ORGANIZATION?.[0]?.OrgName || "Federal land"),
        type: "facility", facilityType: f.FacilityTypeDescription, lat: f.FacilityLatitude, lng: f.FacilityLongitude,
        distanceMiles: haversineMiles(lat, lng, f.FacilityLatitude, f.FacilityLongitude),
        url: `https://www.recreation.gov/camping/campgrounds/${f.FacilityID}`, reservable: f.Reservable,
      });
    }
    out.sort((a, b) => a.distanceMiles - b.distanceMiles);
    return NextResponse.json({ lands: out.filter((l) => l.distanceMiles <= radius) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
