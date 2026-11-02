import Link from "next/link";
import Image from "next/image";
import { CrowdBadge } from "./CrowdBadge";
import type { ParkSummary } from "@/lib/parks";
import { MONTHS } from "@/lib/types";

const fmt = new Intl.NumberFormat("en-US");

export function ParkCard({ park, rank, distanceMiles }: { park: ParkSummary; rank?: number; distanceMiles?: number }) {
  const c = park.crowd;
  return (
    <article className="group grid grid-cols-[112px_1fr] gap-4 border-b border-rule py-5 sm:grid-cols-[160px_1fr] sm:gap-6">
      <Link href={`/parks/${park.parkCode}`} className="relative block aspect-[4/3] overflow-hidden rounded-sm bg-paper-2">
        {park.image && (
          <Image src={park.image.url} alt={park.image.altText || park.fullName} fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
      </Link>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl leading-tight">
              {rank !== undefined && <span className="mr-2 text-ink-3 tabular-nums">{rank}.</span>}
              <Link href={`/parks/${park.parkCode}`} className="hover:underline">{park.fullName}</Link>
            </h3>
            <p className="mt-0.5 text-sm text-ink-2">
              {park.states.join(", ")}
              {distanceMiles !== undefined && <> · {Math.round(distanceMiles)} mi away</>}
              {park.hasEntranceFee ? " · entrance fee" : " · no entrance fee"}
            </p>
          </div>
          <CrowdBadge crowd={c} />
        </div>
        {c && (
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-ink-2">
            <Component label="Visits / yr" value={fmt.format(c.components.visits!.value)} pct={c.components.visits!.percentile} />
            <Component
              label="Visits / acre"
              value={c.components.density ? c.components.density.value.toFixed(c.components.density.value < 10 ? 2 : 0) : "no acreage"}
              pct={c.components.density?.percentile ?? null}
            />
            <Component
              label="Peak month share"
              value={c.components.peakiness ? `${Math.round(c.components.peakiness.value * 100)}% in ${MONTHS[c.components.peakiness.peakMonth]}` : "—"}
              pct={c.components.peakiness?.percentile ?? null}
            />
          </dl>
        )}
        {park.best && (
          <p className="mt-3 text-sm">
            <span className="text-ink-3">Best months </span>
            {park.best.map((b) => MONTHS[b.month]).join(", ")}
          </p>
        )}
      </div>
    </article>
  );
}

function Component({ label, value, pct }: { label: string; value: string; pct: number | null }) {
  return (
    <div>
      <dt className="text-ink-3">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
      {pct !== null && (
        <dd className="mt-1 h-1 w-full overflow-hidden rounded-full bg-paper-2" title={`${pct}th percentile among national parks`}>
          <div className="h-full rounded-full bg-moss-2" style={{ width: `${pct}%` }} />
        </dd>
      )}
    </div>
  );
}
