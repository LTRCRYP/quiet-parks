# Quiet Parks

America's least-crowded national parks: a ranked, filterable list of all 63 national park units, a detail page for each with monthly visitation and best months to visit, and a "near me" view that also surfaces other federal public lands.

Static-first Next.js (App Router) + TypeScript + Tailwind + Recharts + Leaflet. All visitation, acreage and climate data is pulled by a script and committed as JSON, so the site builds with no API access. The only runtime fetches are NPS alerts (1-hour cache), the Recreation.gov lookup on the near-me page, and city geocoding.

## Run it

```bash
cp .env.example .env     # add NPS_API_KEY and RIDB_API_KEY (both free)
npm install
npm run dev
```

`npm run build` produces a fully static site plus two small route handlers (`/api/geocode`, `/api/nearby`); park pages revalidate hourly so alerts stay fresh. Deploys to Vercel with zero config; set the two env vars in the project settings.

## Refresh the data

```bash
npm run fetch-data
```

Writes `data/parks.json`, `data/things-to-do.json`, `data/campgrounds.json`, `data/zcta.json`, `data/manifest.json` and `data/warnings.txt`. Raw downloads are cached in `.cache/` (gitignored); delete a file there to force a refetch. The script fails loudly rather than guessing: a missing acreage alias or an unexpected park count is an error, and a park missing a source gets `null` for that field.

When a new year's visitation package is released (early in the year, on data.gov), update the three constants at the top of `scripts/sources/visitation.ts` (package name, download URL, end year). When a new acreage listing is posted, update the URL and date in `scripts/sources/acreage.ts`. Commit the regenerated JSON.

## Data sources

| What | Source | Notes |
|---|---|---|
| Park metadata, photos, fees, hours, things to do, campgrounds, alerts | [NPS API](https://www.nps.gov/subjects/developer/api-documentation.htm) | Free key. `designation` is not a clean enum (see below). |
| Monthly recreation visits, 1979–2025 | [NPS Visitor Use Statistics Data Package, 2025](https://catalog.data.gov/dataset/nps-visitor-use-statistics-data-package-2025) (CSV on IRMA) | Long format `UnitCode,Year,Month,Statistic,Value`; we use `TRV`. Visits, not unique visitors. Preliminary current-year months are only in the IRMA report viewer and are not used. |
| Gross acreage | [NPS Listing of Acreage](https://www.nps.gov/subjects/lwcf/acreagereports.htm) (quarterly XLSX) | No unit codes, abbreviated names; hand-maintained alias map in `scripts/sources/acreage.ts`. |
| Climate | [Open-Meteo historical API](https://open-meteo.com/en/docs/historical-weather-api) (ERA5) | No key. Daily values 2015–2024 averaged to monthly at the park's NPS coordinate. 9 km grid; elevation of the cell is recorded. |
| Other federal lands | [RIDB](https://ridb.recreation.gov/docs) `/recareas` and `/facilities` | Free key. One point per area, so large forests can be missed by a radius search. |
| ZIP centroids | [Census 2020 ZCTA Gazetteer](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html) | Public domain, bundled. |
| City geocoding | [Nominatim](https://nominatim.org/release-docs/latest/api/Search/) | Proxied through `/api/geocode` with a User-Agent and a 24 h cache. |
| Map tiles | OpenStreetMap via Leaflet | |

### Things that don't line up (and how they're handled)

- **Which units are "national parks".** `designation == "National Park"` returns 52. The full set also needs `National Park & Preserve` (8), `National Parks` (Sequoia & Kings Canyon, one parkCode), `National and State Parks` (Redwood), and `npsa`, whose designation is an empty string. The pipeline asserts the count is 63.
- **Visitation unit codes** are the uppercase parkCode, except Sequoia & Kings Canyon, which report separately as `SEQU` and `KICA` and are summed.
- **Acreage** rows for park-and-preserve units are split (e.g. `DENALI NP` + `DENALI N PRESERVE`) and summed, since visitation covers the whole unit. Everglades adds its `EVERGLADES EXPANSION` row per the sheet's footnote. Chiricahua is still listed as `CHIRICAHUA NM`.
- **COVID and counting changes.** 2021 is depressed for cruise-dependent parks (Glacier Bay) and Hawaii; Redwood's 2025 count roughly doubled, which looks like a method change. Per-year numbers are shown in each park's table so this is visible.

## Crowd Index

Defined in `lib/crowd-index.ts`. For each park, three components are turned into percentile ranks (0–100) among the national parks with data:

| Component | Input | Weight |
|---|---|---|
| visits | mean annual recreation visits, 2021–2025 | 0.40 |
| density | annual visits ÷ gross acres | 0.40 |
| peakiness | share of annual visits in the busiest month | 0.20 |

`index = 0.40·visits + 0.40·density + 0.20·peakiness`, lower = quieter. Percentile rank uses mid-rank for ties. If a component is missing, the remaining weights are renormalized and the score is flagged `partial`. A park with no visitation has no score. Change `WEIGHTS` to tune.

## Best months

Defined in `lib/best-months.ts`. Per month: crowd = 1 − visits/peak-month visits; comfort = 0.7·temperature + 0.3·dryness (full marks for average highs of 55–80 °F and ≤ 1 in of precipitation); access = 0 if NPS operating hours have an all-"Closed" exception covering most of the month, else 1. `score = 0.5·crowd + 0.3·comfort + 0.2·access`; the top three months are shown with a one-line rationale built only from data that exists. Free-text alerts are shown, not scored.

## Layout

```
scripts/fetch-data.ts     pipeline entry; scripts/sources/* one module per source
data/                     generated JSON (committed)
lib/crowd-index.ts        the score
lib/best-months.ts        month scoring
lib/parks.ts              loads data/, computes summaries once at build
app/                      / ranking, /parks/[code], /near, /about, /api/geocode, /api/nearby
components/               cards, filters, chart, map, near-me
```

## Later

Designed so these don't require restructuring: expanding to all ~430 NPS units (the pipeline filter and the `EXPECTED_PARK_COUNT` assertion are the only gates; the acreage alias map would need to grow), campground reservability from RIDB, similar-park recommendations, and a month-first view (`scoreMonths` already returns all twelve).
