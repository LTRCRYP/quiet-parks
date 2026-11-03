import type { CrowdIndex } from "@/lib/crowd-index";

export function crowdLabel(score: number): string {
  if (score < 20) return "Very quiet";
  if (score < 40) return "Quiet";
  if (score < 60) return "Moderate";
  if (score < 80) return "Busy";
  return "Very busy";
}

function tone(score: number): string {
  if (score < 40) return "bg-moss-3 text-ink";
  if (score < 60) return "bg-paper-2 text-ink";
  return "bg-[var(--clay)]/20 text-ink";
}

export function CrowdBadge({ crowd, size = "md" }: { crowd: CrowdIndex | null; size?: "md" | "lg" }) {
  if (!crowd) {
    return <span className="pixel px-frame px-2 py-0.5 text-sm text-ink-3">No crowd data</span>;
  }
  const big = size === "lg";
  return (
    <span className="inline-flex items-baseline gap-2" title={`Crowd Index ${crowd.score} (0 = quietest, 100 = busiest)`}>
      <span className={`display tabular-nums ${big ? "text-5xl" : "text-2xl"} leading-none`}>{Math.round(crowd.score)}</span>
      <span className={`pixel px-tag ${big ? "px-2.5 py-0.5 text-lg" : "px-2 text-sm"} whitespace-nowrap ${tone(crowd.score)}`}>
        {crowdLabel(crowd.score)}{crowd.partial ? "*" : ""}
      </span>
    </span>
  );
}
