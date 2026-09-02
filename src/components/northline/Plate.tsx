import Image from "next/image";

/**
 * THE PLATE — a StrataLanding background plate behind a dark stage.
 *
 * These are the brand's own artwork: deep navy grounds with blueprint
 * construction lines, glowing arcs, wireframe UI cards and the layered-stack
 * mark. They were authored as 4:5 social posts (1122x1402), so:
 *
 *  - scripts/bg-plates.cjs converts them to 13-31KB AVIF/WebP in public/nl/;
 *    the 70MB PNG sources are gitignored and never ship.
 *  - the aspect is kept and `object-fit: cover` does the cropping, because the
 *    compositions load their content at the EDGES with an empty centre — a
 *    formula 16:9 crop throws the artwork away. `position` picks which edge
 *    stays in frame per stage.
 *
 * TWO RULES THIS COMPONENT ENFORCES:
 *  1. never `priority`. The SSR <h1> is the deliberate LCP element and no
 *     homepage image may compete with it.
 *  2. always under a veil. The plates run brighter and more saturated than
 *     #0B1B3A; at full strength they read as pasted stock art. The veil plus
 *     ~0.55 opacity makes them texture INSIDE the brand, and keeps text
 *     contrast where it needs to be.
 */

interface PlateProps {
  /** Which plate — matches public/nl/plate-<id>.avif */
  id: "anatomy" | "spine" | "watching" | "manifesto" | "studio";
  /** object-position; pick the edge that carries the artwork for this stage. */
  position?: string;
  /** Plate strength before the veil. Keep low — this sits behind live text. */
  opacity?: number;
  className?: string;
}

export function Plate({ id, position = "50% 50%", opacity = 0.55, className = "" }: PlateProps) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* `unoptimized` is deliberate, and it is the cheaper choice here.
          scripts/bg-plates.cjs already encodes these to AVIF against a 120KB
          budget (they land at 13-31KB), so routing them through the image
          optimizer would re-encode an already-optimal file — paying server work
          to possibly grow it, and warning because quality 70 is not in
          next.config's images.qualities allow-list. Serving the file as authored
          keeps the budget exactly and removes both costs. */}
      <Image
        src={`/nl/plate-${id}.avif`}
        alt=""
        fill
        sizes="100vw"
        unoptimized
        loading="lazy"
        style={{ objectFit: "cover", objectPosition: position, opacity }}
      />
      {/* The veil: pulls the plate back into brand navy and guarantees the
          text contrast the raw artwork would not. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(7,16,34,0.72) 0%, rgba(10,23,48,0.55) 45%, rgba(7,16,34,0.80) 100%)",
        }}
      />
    </div>
  );
}
