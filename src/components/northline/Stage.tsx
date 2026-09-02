/**
 * THE STAGE — the pinned-scene primitive. All five scroll scenes compose from it.
 *
 * A stage is a tall section with a sticky 100vh child. The section's height IS
 * the scene's runtime: the engine reads `rel / (offsetHeight - vh)` to get the
 * scene's own 0..1 progress and drives every layer from that one number.
 *
 * WHY THE PINNING IS CSS AND NOT JAVASCRIPT. Two reasons, both learned the
 * hard way on this page:
 *
 *  1. No hydration jump. useStrataTier() deliberately returns "A" on SSR and
 *     first client render. If the pinning depended on it, every desktop visitor
 *     would render an unpinned stack and then snap into a pinned scene — a
 *     large, measurable CLS event on the most important page we own. Media
 *     queries resolve before first paint, so the server HTML is already right.
 *  2. Mobile costs nothing. Below 1040px, on a coarse pointer, or under
 *     reduced motion, nl.css collapses the stage to `height:auto` and the
 *     sticky child to `position:static` — the scene becomes an ordinary
 *     stacked section, no engine, no scroll-scrub, no JS at all. The CSS
 *     view() reveals still run; they are cheap and work fine on phones.
 *
 * THE VISIBILITY CONTRACT. Every layer inside a stage must render VISIBLE in
 * SSR. The engine hides and sequences them on its first frame. Authoring a
 * layer with inline `opacity:0` (as the design-chat source does) would leave it
 * permanently invisible wherever the engine doesn't mount — which is every
 * phone, every reduced-motion user, and every browser with JS disabled.
 *
 * `pace` mirrors the engine's scrollPace: authored height x 0.6 is the shipped
 * pace, so a 760vh scene actually costs ~456vh of scrolling.
 */

import type { ReactNode } from "react";

export type StageName = "journey" | "anatomy" | "spine" | "portal" | "process";

interface StageProps {
  /** Scene key. The engine dispatches to its method of the same name. */
  name: StageName;
  /** Authored height in vh. Journey 760, anatomy 900, spine 340, portal 440, process 360. */
  height: number;
  /**
   * Multiplies the authored height.
   *
   * ⚠️ LEAVE THIS AT 1. The source's engine writes `760 * scrollPace` onto the
   * JOURNEY stage only (see collect() in NLEngine.ts) — every other scene keeps
   * the height its markup declares. Applying the 0.6 pace to all five, as this
   * defaulted to, ran anatomy at 540vh instead of 900, spine at 204 instead of
   * 340, portal at 264 instead of 440 and process at 216 instead of 360.
   * Verified against the rendered source: it is 33.4 viewports tall, and with
   * the shortened scenes this page was 24.9. Every scene played ~40% faster
   * than the design was choreographed for, which reads as rushed — the beats
   * are tuned to the scroll distance, not to a duration.
   */
  pace?: number;
  /** Anchor id, when the section is a nav or funnel target. */
  id?: string;
  /** Dark stages carry the navy ground and flip the whole token ladder. */
  tone?: "dark";
  /** Human label for the right rail and dev tooling. */
  label: string;
  /**
   * The colour field's band for this scene, as `#rrggbb`.
   *
   * It goes on the SECTION and never on the sticky child: bgfield() measures
   * each band with getBoundingClientRect, and a sticky child's rect is pinned
   * to the viewport for the whole scene — which would make the band ordering
   * nonsense. See ColourField.tsx.
   */
  bg?: string;
  className?: string;
  /** The sticky viewport's contents. */
  children: ReactNode;
}

export function Stage({
  name,
  height,
  pace = 1,
  id,
  tone,
  label,
  bg,
  className = "",
  children,
}: StageProps) {
  return (
    <section
      id={id}
      data-nlstage={name}
      data-screen-label={label}
      {...(tone ? { "data-tone": tone } : {})}
      {...(bg ? { "data-bg": bg } : {})}
      className={`nl-stage relative ${className}`}
      style={{ height: `${Math.round(height * pace)}vh` }}
    >
      {/* The engine writes this element's exit fade (opacity/blur/scale over the
          last 5% of the scene), so it must be the section's FIRST child. */}
      <div className="nl-stage-sticky">{children}</div>
    </section>
  );
}
