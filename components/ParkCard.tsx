import Link from "next/link";
import Image from "next/image";
import { CrowdBadge } from "./CrowdBadge";
import type { ParkSummary } from "@/lib/parks";
import { MONTHS } from "@/lib/types";
import { BiomeIcon } from "./pixel/Pixel";

const fmt = new Intl.NumberFormat("en-US");

export function ParkCard({ park, rank, distanceMiles }: { park: ParkSummary; rank?: number; distanceMiles?: number }) {
  const c = park.crowd;
  return (
    <article className="group grid grid-cols-[112px_1fr] gap-4 border-b-2 border-dotted border-rule py-5 sm:grid-cols-[160px_1fr] sm:gap-6">
      <Link href={`/parks/${park.parkCode}`} className="px-frame relative block aspect-[4/3] overflow-hidden bg-paper-2">
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
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-2">
              <BiomeIcon biome={park.biome} scale={1.5} />
              <span>{park.designation} · {park.states.join(", ")}
              {distanceMiles !== undefined && <> · {Math.round(distanceMiles)} mi away</>}
              {park.hasEntranceFee ? " · entrance fee" : " · no entrance fee"}</span>
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
            <span className="pixel text-ink-3">Best months </span>
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
      <dt className="pixel text-sm text-ink-3">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
      {pct !== null && (
        <dd className="px-bar mt-1.5 h-1.5 w-full bg-paper-2" title={`${pct}th percentile among ranked units`}>
          <div className="h-full bg-moss-2" style={{ width: `${pct}%` }} />
        </dd>
      )}
    </div>
  );
}
