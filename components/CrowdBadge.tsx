import type { CrowdIndex } from "@/lib/crowd-index";

export function crowdLabel(score: number): string {
  if (score < 20) return "Very quiet";
  if (score < 40) return "Quiet";
  if (score < 60) return "Moderate";
  if (score < 80) return "Busy";
  return "Very busy";
}

export function CrowdBadge({ crowd, size = "md" }: { crowd: CrowdIndex | null; size?: "md" | "lg" }) {
  if (!crowd) {
    return <span className="rounded-full border border-rule px-2.5 py-1 text-xs text-ink-3">No crowd data</span>;
  }
  const big = size === "lg";
  return (
    <span className="inline-flex items-baseline gap-2" title={`Crowd Index ${crowd.score} (0 = quietest, 100 = busiest)`}>
      <span className={`display tabular-nums ${big ? "text-5xl" : "text-2xl"} leading-none`}>{Math.round(crowd.score)}</span>
      <span className={`${big ? "text-sm" : "text-xs"} whitespace-nowrap text-ink-2`}>
        {crowdLabel(crowd.score)}{crowd.partial ? "*" : ""}
      </span>
    </span>
  );
}
