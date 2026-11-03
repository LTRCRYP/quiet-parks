import { manifest, parks, nationalParkCount, visitationVintage, climateVintage, acreageVintage } from "@/lib/parks";
import { WEIGHTS } from "@/lib/crowd-index";
import { MONTH_WEIGHTS } from "@/lib/best-months";

export const metadata = { title: "Method" };

export default function About() {
  const withAcreage = parks.filter((p) => p.acreage).length;
  const withClimate = parks.filter((p) => p.climate).length;
  const withVisits = parks.filter((p) => p.visitation).length;
  return (
    <div className="prose mx-auto max-w-2xl px-4 py-12 leading-relaxed sm:px-6">
      <h1 className="text-4xl">How the numbers work</h1>

      <h2 className="mt-10 text-2xl">Which parks</h2>
      <p className="mt-3"><strong>National parks:</strong> every NPS unit whose designation is National Park, National Park &amp; Preserve, National Parks (Sequoia &amp; Kings Canyon, counted once as the NPS does) or National and State Parks (Redwood), plus National Park of American Samoa, which the NPS API lists with a blank designation. That is {nationalParkCount} units.</p>
      <p className="mt-3"><strong>Other landscapes:</strong> {parks.length - nationalParkCount} more NPS units whose designation is a preserve, reserve, seashore, lakeshore, recreation area or river, plus the national monuments that protect a landscape rather than a building or event (Dinosaur, Devils Tower, Lava Beds and so on). The NPS data has no field that separates landscape monuments from historic ones, so that list is kept by hand in <code>scripts/sources/nps.ts</code>. A unit is only included when the NPS reports at least 1,000 recreation visits a year for it; a few partnership rivers and co-managed monuments do not report at all, and a few others (Rio Grande Wild &amp; Scenic River, Alagnak Wild River, Aniakchak) report a few hundred because their visitors are counted under a neighbouring park, so ranking them would mislead. Historic sites, memorials, battlefields, parkways and trails are not ranked.</p>
      <p className="mt-3">The ranking has a <strong>Lower 48 only</strong> switch, on by default, because eight Alaska parks otherwise fill the top of the list. Turn it off to see Alaska, Hawaii, American Samoa and the Virgin Islands.</p>

      <h2 className="mt-10 text-2xl">Crowd Index</h2>
      <p className="mt-3">A 0–100 score where lower means quieter, computed relative to every other ranked unit (national parks and other landscapes together). Three components, each a percentile rank among the {withVisits} units with visitation data:</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li><strong>Annual visits</strong> (weight {WEIGHTS.visits * 100}%): average recreation visits per year, {manifest.visitation.startYear}–{manifest.visitation.endYear}.</li>
        <li><strong>Visits per acre</strong> (weight {WEIGHTS.density * 100}%): annual visits divided by gross acreage. Gateway Arch and Great Smoky Mountains both score high here for opposite reasons.</li>
        <li><strong>Peakiness</strong> (weight {WEIGHTS.peakiness * 100}%): the share of a year&apos;s visits that fall in the single busiest month. A park at 30% is far more crowded in season than its annual total suggests.</li>
      </ul>
      <p className="mt-3">If a component is missing the remaining weights are renormalized and the score is marked with an asterisk. Nothing is estimated. Currently {withAcreage} of {parks.length} units have acreage and all {withVisits} have five complete years of visitation.</p>

      <h2 className="mt-10 text-2xl">Best months</h2>
      <p className="mt-3">Each month gets a score from three signals: crowds ({MONTH_WEIGHTS.crowd * 100}%, how far below the park&apos;s peak month its visits are), comfort ({MONTH_WEIGHTS.comfort * 100}%, an average daily high between 50 and 85 °F scores full marks, zero at freezing, with penalties for wet and snowy months) and access ({MONTH_WEIGHTS.access * 100}%, zero if NPS operating hours list the park as closed for most of the month, or if the month averages under 1% of peak-month visits). The signals are combined as a weighted geometric mean rather than a sum, so an empty month with highs in the 20s does not win on crowds alone. The three highest-scoring months are shown. Free-text alerts and road closures are displayed but not scored, because they can&apos;t be parsed reliably. Treat it as a starting point, not a forecast.</p>
      <p className="mt-3">Climate comes from the ERA5 reanalysis at the park&apos;s NPS coordinate. ERA5 is a 9 km grid, so for mountainous parks the numbers describe the grid cell (its elevation is shown on each page), not a specific trailhead. {withClimate} of {parks.length} units have climate data.</p>

      <h2 className="mt-10 text-2xl">Sources and vintage</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        <li>{visitationVintage}. Visits, not unique visitors; counting methods differ by park.</li>
        <li>{acreageVintage}. Gross acres, with park-and-preserve units summed.</li>
        <li>{climateVintage}.</li>
        <li>Park descriptions, photos, fees, hours, things to do and alerts: NPS API, fetched {manifest.nps.fetchedAt}.</li>
        <li>Nearby federal lands: Recreation.gov RIDB, live. ZIP centroids: US Census 2020 ZCTA gazetteer. City lookup: Nominatim.</li>
      </ul>
      <p className="mt-6 text-sm text-ink-3">Data generated {manifest.generatedAt.slice(0, 10)}.</p>
    </div>
  );
}
