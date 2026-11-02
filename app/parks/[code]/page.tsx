import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CrowdBadge } from "@/components/CrowdBadge";
import { VisitsChart } from "@/components/VisitsChart";
import { ParkMap } from "@/components/ParkMap";
import { fetchAlerts } from "@/lib/alerts";
import { bestMonths, scoreMonths } from "@/lib/best-months";
import { parks, getPark, getCrowd, getThingsToDo, getCampgrounds, visitationVintage, climateVintage, acreageVintage } from "@/lib/parks";
import { MONTHS } from "@/lib/types";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return parks.map((p) => ({ code: p.parkCode }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const park = getPark((await params).code);
  return { title: park?.fullName ?? "Park" };
}

const fmt = new Intl.NumberFormat("en-US");

export default async function ParkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const park = getPark(code);
  if (!park) notFound();
  const crowd = getCrowd(code);
  const best = bestMonths(park);
  const months = scoreMonths(park);
  const things = getThingsToDo(code);
  const campgrounds = getCampgrounds(code);
  const alerts = await fetchAlerts(code);
  const hero = park.images[0];
  const closures = alerts?.filter((a) => /closure/i.test(a.category)) ?? [];
  const yearsWithData = park.visitation ? Object.keys(park.visitation.byYear) : [];

  return (
    <article>
      {hero && (
        <figure className="relative aspect-[16/9] w-full bg-paper-2 sm:aspect-[21/9]">
          <Image src={hero.url} alt={hero.altText || park.fullName} fill priority sizes="100vw" className="object-cover" />
          <figcaption className="absolute bottom-2 right-3 rounded-sm bg-black/40 px-2 py-0.5 text-[11px] text-white/90">
            {hero.title ? `${hero.title} · ` : ""}{hero.credit}
          </figcaption>
        </figure>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="grid gap-6 py-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm text-ink-3"><Link href="/" className="hover:underline">Ranking</Link> / {park.designation}</p>
            <h1 className="mt-1 text-4xl leading-tight sm:text-5xl">{park.fullName}</h1>
            <p className="mt-2 text-ink-2">
              {park.states.join(", ")}
              {park.acreage ? ` · ${fmt.format(Math.round(park.acreage.grossAcres))} acres` : " · acreage not available"}
              {park.visitation ? ` · ${fmt.format(park.visitation.annualAvg)} visits / yr` : " · no visitation data"}
            </p>
          </div>
          <div className="md:text-right">
            <p className="text-xs uppercase tracking-wide text-ink-3">Crowd Index</p>
            <CrowdBadge crowd={crowd} size="lg" />
            {crowd && <p className="mt-1 text-xs text-ink-3">#{crowd.rank} quietest of {crowd.cohortSize}</p>}
          </div>
        </header>

        {crowd && (
          <section className="grid gap-4 border-y border-rule py-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-ink-3">Annual visits (5-yr avg)</p>
              <p className="text-lg tabular-nums">{fmt.format(crowd.components.visits!.value)}</p>
              <p className="text-xs text-ink-3">{crowd.components.visits!.percentile}th percentile · weight 40%</p>
            </div>
            <div>
              <p className="text-ink-3">Visits per acre</p>
              <p className="text-lg tabular-nums">{crowd.components.density ? crowd.components.density.value.toFixed(2) : "no acreage data"}</p>
              <p className="text-xs text-ink-3">{crowd.components.density ? `${crowd.components.density.percentile}th percentile · weight 40%` : "component omitted"}</p>
            </div>
            <div>
              <p className="text-ink-3">Share of visits in peak month</p>
              <p className="text-lg tabular-nums">
                {crowd.components.peakiness ? `${Math.round(crowd.components.peakiness.value * 100)}% (${MONTHS[crowd.components.peakiness.peakMonth]})` : "—"}
              </p>
              <p className="text-xs text-ink-3">{crowd.components.peakiness ? `${crowd.components.peakiness.percentile}th percentile · weight 20%` : "component omitted"}</p>
            </div>
          </section>
        )}

        <div className="grid gap-12 py-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-12">
            <section>
              <p className="prose max-w-2xl text-lg leading-relaxed">{park.description}</p>
              <p className="mt-3 text-sm"><a href={park.url} className="text-moss underline">nps.gov/{park.parkCode}</a></p>
            </section>

            <section>
              <h2 className="text-2xl">When to go</h2>
              {best && park.visitation ? (
                <>
                  <div className="mt-4 rounded-sm border border-moss-2 bg-moss-3/40 p-4">
                    <p className="text-xs uppercase tracking-wide text-ink-2">Best months</p>
                    <p className="display mt-1 text-2xl">{best.map((b) => MONTHS[b.month]).join(" · ")}</p>
                    <ul className="mt-2 space-y-1 text-sm text-ink-2">
                      {best.map((b) => <li key={b.month}>{b.rationale}</li>)}
                    </ul>
                    <p className="mt-3 text-xs text-ink-3">
                      Weighted geometric mean of crowds (45%, visits vs. peak month), comfort (35%, ERA5 average highs, precipitation and snowfall) and access (20%, explicit closures in NPS operating hours), so one bad signal sinks a month.
                      {!park.climate && " Climate data was unavailable for this park, so only crowds and access were scored."}
                      {" "}A heuristic, not a forecast. <Link href="/about" className="underline">How it works</Link>.
                    </p>
                  </div>
                  <h3 className="mt-8 text-base text-ink-2">Average recreation visits by month, {park.visitation.startYear}–{park.visitation.endYear}</h3>
                  <VisitsChart visitation={park.visitation} highlight={best.map((b) => b.month)} />
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-ink-2">Month-by-month table</summary>
                    <div className="overflow-x-auto">
                      <table className="mt-2 w-full text-xs tabular-nums">
                        <thead className="text-ink-3">
                          <tr>
                            <th className="py-1 text-left font-normal">Month</th>
                            {yearsWithData.map((y) => <th key={y} className="py-1 text-right font-normal">{y}</th>)}
                            <th className="py-1 text-right font-normal">Avg</th>
                            <th className="py-1 text-right font-normal">High °F</th>
                            <th className="py-1 text-right font-normal">Low °F</th>
                            <th className="py-1 text-right font-normal">Precip in</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MONTHS.map((m, i) => (
                            <tr key={m} className="border-t border-rule">
                              <td className="py-1">{m}</td>
                              {yearsWithData.map((y) => <td key={y} className="py-1 text-right">{fmt.format(park.visitation!.byYear[y][i])}</td>)}
                              <td className="py-1 text-right">{fmt.format(park.visitation!.monthlyAvg[i])}</td>
                              <td className="py-1 text-right">{park.climate ? park.climate.months[i].avgHighF : "—"}</td>
                              <td className="py-1 text-right">{park.climate ? park.climate.months[i].avgLowF : "—"}</td>
                              <td className="py-1 text-right">{park.climate ? park.climate.months[i].precipIn : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                  <p className="mt-2 text-xs text-ink-3">
                    {visitationVintage}. {park.climate ? `${climateVintage}, grid cell at ${Math.round(park.climate.elevationM * 3.281)} ft elevation near ${park.latitude.toFixed(2)}, ${park.longitude.toFixed(2)}.` : "No climate data."}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-ink-2">No visitation data is available for this park, so we can&apos;t rank its months.</p>
              )}
              {months && months.some((m) => m.closed) && (
                <p className="mt-2 text-xs text-ink-3">NPS operating hours list closures covering: {months.filter((m) => m.closed).map((m) => MONTHS[m.month]).join(", ")}.</p>
              )}
            </section>

            <section>
              <h2 className="text-2xl">Things to do</h2>
              {things.length === 0 ? (
                <p className="mt-3 text-ink-2">The NPS API lists no things to do for this park. Activities: {park.activities.join(", ")}.</p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-ink-3">{things.length} listed by the NPS · activities: {park.activities.join(", ")}</p>
                  <ul className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    {things.slice(0, 24).map((t) => (
                      <li key={t.id} className="flex gap-3">
                        {t.image && (
                          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-sm bg-paper-2">
                            <Image src={t.image.url} alt={t.image.altText || t.title} fill sizes="80px" className="object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <a href={t.url} className="font-medium hover:underline">{t.title}</a>
                          <p className="line-clamp-2 text-sm text-ink-2">{t.shortDescription}</p>
                          <p className="text-xs text-ink-3">
                            {t.activities.slice(0, 3).join(", ")}
                            {t.season.length > 0 && t.season.length < 4 ? ` · ${t.season.join("/")}` : ""}
                            {t.isReservationRequired ? " · reservation required" : ""}
                            {t.doFeesApply ? " · fee" : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {things.length > 24 && <p className="mt-3 text-sm text-ink-3">Showing 24 of {things.length}. See all on <a className="underline" href={`${park.url.replace("index.htm", "")}planyourvisit/things2do.htm`}>nps.gov</a>.</p>}
                </>
              )}
            </section>
          </div>

          <aside className="space-y-8 text-sm">
            <div className="h-64 w-full">
              <ParkMap points={[{ lat: park.latitude, lng: park.longitude, label: park.fullName, kind: "park" }]} zoom={7} />
            </div>

            <section>
              <h2 className="text-lg">Alerts &amp; closures</h2>
              {alerts === null ? (
                <p className="mt-2 text-ink-3">Live alerts unavailable right now. Check <a className="underline" href={`${park.url.replace("index.htm", "")}planyourvisit/conditions.htm`}>current conditions</a> on nps.gov.</p>
              ) : alerts.length === 0 ? (
                <p className="mt-2 text-ink-2">No active alerts.</p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {alerts.slice(0, 8).map((a) => (
                    <li key={a.id}>
                      <p className={`text-xs uppercase tracking-wide ${closures.includes(a) ? "text-clay" : "text-ink-3"}`}>{a.category}</p>
                      <p className="font-medium">{a.url ? <a href={a.url} className="hover:underline">{a.title}</a> : a.title}</p>
                      <p className="line-clamp-3 text-ink-2">{a.description}</p>
                    </li>
                  ))}
                  {alerts.length > 8 && <li className="text-ink-3">{alerts.length - 8} more on nps.gov</li>}
                </ul>
              )}
              <p className="mt-2 text-xs text-ink-3">Refreshed hourly from the NPS API.</p>
            </section>

            <section>
              <h2 className="text-lg">Entrance fees</h2>
              {park.entranceFees.length === 0 ? (
                <p className="mt-2 text-ink-2">The NPS lists no entrance fee.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {park.entranceFees.map((f, i) => (
                    <li key={i} className="flex justify-between gap-3"><span className="text-ink-2">{f.title}</span><span className="tabular-nums">${f.cost.toFixed(2)}</span></li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-lg">Hours</h2>
              {park.operatingHours.map((h, i) => (
                <div key={i} className="mt-2">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-ink-2">{summarizeHours(h.standardHours)}</p>
                  {h.exceptions.length > 0 && <p className="text-xs text-ink-3">{h.exceptions.length} seasonal exception{h.exceptions.length > 1 ? "s" : ""}: {h.exceptions.slice(0, 3).map((e) => e.name).join("; ")}</p>}
                </div>
              ))}
            </section>

            {campgrounds.length > 0 && (
              <section>
                <h2 className="text-lg">Campgrounds</h2>
                <ul className="mt-2 space-y-1">
                  {campgrounds.map((c) => (
                    <li key={c.id}>
                      <a href={c.reservationUrl || c.url} className="hover:underline">{c.name}</a>
                      <span className="text-ink-3"> · {c.totalSites || "?"} sites{c.sitesFirstCome ? `, ${c.sitesFirstCome} first-come` : ""}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {park.weatherInfo && (
              <section>
                <h2 className="text-lg">Weather, per the NPS</h2>
                <p className="mt-2 line-clamp-[12] text-ink-2">{park.weatherInfo}</p>
              </section>
            )}

            <p className="text-xs text-ink-3">
              {acreageVintage}{park.acreage && park.acreage.rows.length > 1 ? ` (sum of ${park.acreage.rows.join(" + ")})` : ""}.
              {crowd?.partial && " *Crowd Index is partial: a component was missing and the weights were renormalized."}
            </p>
          </aside>
        </div>
      </div>
    </article>
  );
}

function summarizeHours(h: Record<string, string>): string {
  const vals = Object.values(h);
  if (!vals.length) return "";
  const uniq = [...new Set(vals)];
  if (uniq.length === 1) return uniq[0] === "All Day" ? "Open 24 hours" : uniq[0];
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  return days.filter((d) => h[d]).map((d) => `${d.slice(0, 3)} ${h[d]}`).join(", ");
}
