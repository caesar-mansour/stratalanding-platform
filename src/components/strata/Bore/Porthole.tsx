/**
 * THE APERTURE (was: the bore porthole) — RSC, every tier.
 *
 * The eight-element optic: ring chrome (two concentric rings + 24 tick
 * marks + crosshair + survey label), the SSR still of a REAL demo page
 * inside, resolved sharp against the night field — the designed-alive
 * surface that mobile and Tier-A get as the whole experience. Tier-B's
 * BorePortal opens through this exact geometry.
 *
 * Honesty law: labeled FICTIONAL SHOWCASE in the chrome itself.
 */

import manifest from "./reel-manifest.json";

const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

export function Porthole({
  compact = false,
  hero = false,
}: {
  compact?: boolean;
  /** hero scale — the primary artifact of Band 01 */
  hero?: boolean;
}) {
  return (
    <figure
      data-porthole
      className={`relative ${compact ? "mx-auto my-10" : ""}`}
      style={{
        width: compact
          ? "min(78vw, 340px)"
          : hero
          ? "clamp(300px, 24vw, 400px)"
          : "clamp(300px, 26vw, 420px)",
        aspectRatio: "1",
      }}
    >
      {/* ring chrome */}
      <div
        aria-hidden
        className="absolute -inset-3 rounded-full border border-strata-live/30"
      />
      <div
        aria-hidden
        className="st-glow-soft absolute inset-0 rounded-full border-2 border-strata-live/50"
      />
      {/* tick marks */}
      <div aria-hidden className="absolute inset-0">
        {TICKS.map((deg) => (
          <span
            key={deg}
            className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top"
            style={{ transform: `rotate(${deg}deg)` }}
          >
            <span
              className="absolute bottom-0 left-0 h-2 w-px"
              style={{ background: "rgba(34,211,238,0.55)" }}
            />
          </span>
        ))}
      </div>
      {/* crosshair — the optic is aimed */}
      <span
        aria-hidden
        className="absolute bottom-[10px] left-1/2 top-[10px] z-10 w-px"
        style={{ background: "rgba(34,211,238,0.16)" }}
      />
      <span
        aria-hidden
        className="absolute left-[10px] right-[10px] top-1/2 z-10 h-px"
        style={{ background: "rgba(34,211,238,0.16)" }}
      />
      {/* the specimen, resolved sharp in the optic */}
      <div className="absolute inset-[10px] overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={manifest.still}
          alt="A real landing page specimen, seen through the bore."
          width={manifest.w}
          height={manifest.h}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top"
        />
        {/* caustic shimmer — the still is never dead */}
        <span aria-hidden className="st-caustic-shimmer absolute inset-0" />
      </div>
      <figcaption className="st-mono-sm absolute -bottom-7 left-1/2 w-max -translate-x-1/2 text-strata-ink-mute">
        THROUGH THE OPTIC — RESOLVED · FICTIONAL SHOWCASE
      </figcaption>
    </figure>
  );
}
