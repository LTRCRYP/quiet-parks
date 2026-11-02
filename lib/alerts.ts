export interface Alert {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
}

/** Live NPS alerts. Cached for an hour by Next's fetch cache; never required for the page to render. */
export async function fetchAlerts(parkCode: string): Promise<Alert[] | null> {
  const key = process.env.NPS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://developer.nps.gov/api/v1/alerts?parkCode=${parkCode}&limit=50&api_key=${key}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data: Alert[] };
    return json.data.map((a) => ({ id: a.id, title: a.title, description: a.description, category: a.category, url: a.url }));
  } catch {
    return null;
  }
}
