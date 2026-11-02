import { RankingList } from "@/components/RankingList";
import { summaries, allActivities, allStates, mostVisited, visitationVintage, acreageVintage } from "@/lib/parks";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="py-12 sm:py-16">
        <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">The national parks almost nobody visits.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">
          Sixty-three national parks, ranked by how crowded they actually are. The Crowd Index blends
          annual visits, visits per acre and how lopsided the season is, so a small busy park and a
          vast empty one land where they belong.
        </p>
        <p className="mt-3 text-xs text-ink-3">{visitationVintage}. {acreageVintage}.</p>
      </section>
      <RankingList parks={summaries} activities={allActivities} states={allStates} top15={[...mostVisited(15)]} />
    </div>
  );
}
