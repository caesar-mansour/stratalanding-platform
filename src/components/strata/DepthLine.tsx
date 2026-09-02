"use client";

/**
 * THE DEPTH LINE — mobile's core sample. A 3px strata-colored bar under the
 * navbar that fills left→right with descent. Designed for mobile, not a
 * shrunk rail.
 *
 * Dual path (browserslist pins iOS ≥15.4):
 * - @supports (animation-timeline: scroll()) → pure-CSS compositor scaleX,
 *   zero JS (the CSS lives in tokens.css: .st-depthline-css).
 * - else: passive scroll listener coalesced through rAF writing scaleX only.
 * Desktop (non-mobile SSR detection) renders nothing — the Rail owns it.
 */

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/lib/MobileContext";
import { RAIL_SEGMENTS } from "./bands";

const GRADIENT = `linear-gradient(90deg, ${RAIL_SEGMENTS.map(
  (s, i) =>
    `${s.railTone} ${(i / RAIL_SEGMENTS.length) * 100}%, ${s.railTone} ${
      ((i + 1) / RAIL_SEGMENTS.length) * 100
    }%`
).join(", ")})`;

export function DepthLine() {
  const isMobile = useIsMobile();
  const barRef = useRef<HTMLDivElement | null>(null);
  const [cssPath, setCssPath] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    if (
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline: scroll()")
    ) {
      setCssPath(true);
      return;
    }
    // rAF-coalesced fallback: one compositor-only write per frame.
    const bar = barRef.current;
    if (!bar) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        bar.style.transform = `scaleX(${p})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  if (!isMobile) return null;

  return (
    <div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[55] h-[3px] bg-transparent"
    >
      <div
        ref={barRef}
        className={cssPath ? "st-depthline-css h-full" : "h-full"}
        style={{
          background: GRADIENT,
          transform: cssPath ? undefined : "scaleX(0)",
          transformOrigin: "left",
        }}
      />
    </div>
  );
}
