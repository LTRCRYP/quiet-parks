import { NearMe } from "@/components/NearMe";
import { summaries } from "@/lib/parks";

export const metadata = { title: "Near me" };

export default function NearPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="py-12">
        <h1 className="text-4xl leading-tight sm:text-5xl">What&apos;s near you</h1>
        <p className="mt-3 max-w-2xl text-lg text-ink-2">National parks within driving range, with their Crowd Index, plus other federal lands from Recreation.gov.</p>
      </section>
      <NearMe parks={summaries} />
    </div>
  );
}
