import { useId } from "react";
import { PALETTE, SCENES, BIOME_ICON, height, width, type Biome, type Rows } from "@/lib/pixel-art";

/** Run-length encode a sprite into <rect>s. */
export function spriteRects(rows: Rows, ox = 0, oy = 0, keyPrefix = "") {
  const out: React.ReactElement[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      if (ch !== "." && PALETTE[ch]) {
        out.push(
          <rect key={`${keyPrefix}${y}-${x}`} x={ox + x} y={oy + y} width={run} height={1} fill={`var(--px-${PALETTE[ch]})`} />,
        );
      }
      x += run;
    }
  });
  return out;
}

/** A standalone sprite, sized in CSS pixels by `scale`. */
export function PixelIcon({ rows, scale = 2, className = "", title }: { rows: Rows; scale?: number; className?: string; title?: string }) {
  const w = width(rows), h = height(rows);
  return (
    <svg
      className={`pixel-art inline-block shrink-0 ${className}`}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {spriteRects(rows)}
    </svg>
  );
}

export function BiomeIcon({ biome, scale = 2, className = "" }: { biome: Biome; scale?: number; className?: string }) {
  return <PixelIcon rows={BIOME_ICON[biome]} scale={scale} className={className} title={`${biome} landscape`} />;
}

/**
 * A full-width horizon that tiles seamlessly. Each tile is drawn once inside a
 * <pattern> at integer scale so pixels stay crisp at any viewport width.
 */
export function PixelScene({ biome, scale = 3, className = "" }: { biome: Biome; scale?: number; className?: string }) {
  const id = useId();
  const s = SCENES[biome];
  const items: React.ReactElement[] = [];
  const sky: React.ReactElement[] = [];
  s.items.forEach((it, i) => {
    const y = it.y !== undefined ? it.y : s.ground - height(it.rows) - (it.lift ?? 0);
    if (it.sky) {
      // Once per scene: anchored a fixed distance from the right edge so it never repeats.
      sky.push(...spriteRects(it.rows, -(width(it.rows) + 40), y, `s${i}-`));
      return;
    }
    items.push(...spriteRects(it.rows, it.x, y, `i${i}-`));
    // Wrap items that spill past the right edge so the tile seams cleanly.
    if (it.x + width(it.rows) > s.w) items.push(...spriteRects(it.rows, it.x - s.w, y, `w${i}-`));
    if (it.x < 0) items.push(...spriteRects(it.rows, it.x + s.w, y, `v${i}-`));
  });
  return (
    <svg className={`pixel-art block w-full ${className}`} height={s.h * scale} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width={s.w * scale} height={s.h * scale} patternUnits="userSpaceOnUse">
          <g transform={`scale(${scale})`}>
            {spriteRects(s.groundRows, 0, s.ground, "g-")}
            {items}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {sky.length > 0 && (
        <svg x="100%" overflow="visible">
          <g transform={`scale(${scale})`}>{sky}</g>
        </svg>
      )}
    </svg>
  );
}
