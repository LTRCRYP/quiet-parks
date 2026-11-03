# Quiet Parks

America's least-crowded parks: a ranked, filterable list of all 63 national parks plus the other nature-oriented NPS units (preserves, seashores, lakeshores, recreation areas, rivers and landscape monuments), a detail page for each with monthly visitation and best months to visit, and a "near me" view that also surfaces other federal public lands. The ranking has a "Lower 48 only" switch (on by default) and a type filter.

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
- **Which other units are "nature".** `NATURE_DESIGNATIONS` in `scripts/sources/nps.ts` lists the preserve, seashore, lakeshore, recreation-area and river designations (the NPS uses nine different river designations). National Monuments mix landscapes with historic sites and nothing in the API separates them, so `NATURE_MONUMENTS` is a hand-picked list of codes. A non-national-park unit is dropped with a warning if the visitation package has no complete 2021–2025 series for it (Castle Mountains, Parashant, Virgin Islands Coral Reef, Pinelands, Lower Delaware, Obed) or if it averages under 1,000 visits a year (`MIN_NATURE_VISITS`), which in practice means its visitors are tallied under a neighbouring unit (Rio Grande WSR → Big Bend, Alagnak → Katmai, Aniakchak).
- **Visitation unit codes** are the uppercase parkCode, except Sequoia & Kings Canyon, which report separately as `SEQU` and `KICA` and are summed.
- **Acreage** rows for park-and-preserve units are split (e.g. `DENALI NP` + `DENALI N PRESERVE`) and summed, since visitation covers the whole unit. Everglades adds its `EVERGLADES EXPANSION` row per the sheet's footnote. Chiricahua is still listed as `CHIRICAHUA NM`.
- **COVID and counting changes.** 2021 is depressed for cruise-dependent parks (Glacier Bay) and Hawaii; Redwood's 2025 count roughly doubled, which looks like a method change. Per-year numbers are shown in each park's table so this is visible.

## Crowd Index

Defined in `lib/crowd-index.ts`. For each unit, three components are turned into percentile ranks (0–100) among all ranked units with data (national parks and other landscapes form one cohort, so a score is comparable across types):

| Component | Input | Weight |
|---|---|---|
| visits | mean annual recreation visits, 2021–2025 | 0.40 |
| density | annual visits ÷ gross acres | 0.40 |
| peakiness | share of annual visits in the busiest month | 0.20 |

`index = 0.40·visits + 0.40·density + 0.20·peakiness`, lower = quieter. Percentile rank uses mid-rank for ties. If a component is missing, the remaining weights are renormalized and the score is flagged `partial`. A park with no visitation has no score. Change `WEIGHTS` to tune.

## Pixel art

The landscapes are drawn in `lib/pixel-art.ts` as character grids (one character per pixel, mapped to CSS variables so they follow dark mode) and rendered by `components/pixel/Pixel.tsx` as crisp SVG rects. `PixelScene` tiles a 192 px scene inside an SVG pattern at integer scale; the sun is drawn once per scene, anchored to the right edge. Each park's scene is picked by `biomeFor()` from its name and NPS topics. That choice is decoration only and never feeds a number. Type is Jersey 25 for headings, labels and controls and DotGothic16 for running text, both pixel faces with unambiguous digits (Pixelify Sans was tried first and dropped because its 5 and 8 blur together at small sizes). The smallest text step is raised to 13 px because DotGothic16 is a 16 px bitmap design.

## Best months

Defined in `lib/best-months.ts`. Per month: crowd = 1 − visits/peak-month visits; comfort = temperature · (0.6 + 0.25·dryness + 0.15·snow-free), so temperature gates the rest (full marks for average highs of 50–85 °F, zero at or below freezing, ≤ 1 in of precipitation and no snowfall); access = 0 if NPS operating hours have an all-"Closed" exception covering most of the month or the month averages under 1% of peak-month visits, else 1. `score = crowd^0.45 · comfort^0.35 · access^0.2`, a weighted geometric mean so that one bad signal sinks a month (a plain weighted sum recommended January in Yellowstone). The top three months are shown with a one-line rationale built only from data that exists. Free-text alerts are shown, not scored.

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
