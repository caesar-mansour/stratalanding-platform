"use client";

/**
 * THE CORE RAIL — the site's most recognizable artifact.
 * An empty bore on arrival that FILLS with each stratum's tone as you pass
 * it; by bedrock you've collected the full core. Desktop ≥xl only (returns
 * null on server-detected mobile — zero hydration cost there).
 *
 * Laws (feasibility-locked):
 * - ONE IntersectionObserver over band sentinels, rootMargin -40%/-40%.
 * - Discrete per-stratum fills (scaleY transition = THE FILL). Never a
 *   scroll listener, never per-pixel.
 * - Fill state only ever deepens (a core doesn't un-drill on scroll-up;
 *   deepest-reached is the collected sample).
 * - Clicks descend via smoothScrollTo(el, -88) (Lenis contract).
 * - data-rail-dark flips ink at the water table (fixed-chrome recolor only).
 */

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/lib/MobileContext";
import { smoothScrollTo } from "@/components/motion/SmoothScroll";
import { BANDS, RAIL_SEGMENTS, BAND_ATTR } from "./bands";

export function Rail() {
  const isMobile = useIsMobile();
  const [deepest, setDeepest] = useState(-1); // index into RAIL_SEGMENTS
  const [dark, setDark] = useState(false);
  const [current, setCurrent] = useState<string>("");
  const rootRef = useRef<HTMLElement | null>(null);
  const metersRef = useRef<HTMLParagraphElement | null>(null);

  // THE PRESS CYCLE: the station ticks with scroll (PLATE → DELIVER) —
  // direct textContent via a rAF loop that PARKS at rest (never React state)
  useEffect(() => {
    if (isMobile) return;
    const el = metersRef.current;
    if (!el) return;
    let raf = 0;
    let running = false;
    let last = -1;
    const tick = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const STATIONS = [
        "PLATE",
        "INK",
        "REGISTER",
        "PULL",
        "DRY",
        "STAMP",
        "DELIVER",
      ];
      const p = max > 0 ? window.scrollY / max : 0;
      const m = Math.min(STATIONS.length - 1, Math.floor(p * STATIONS.length));
      if (m !== last) {
        last = m;
        el.textContent = STATIONS[m];
        raf = requestAnimationFrame(tick);
      } else {
        running = false; // parked
      }
    };
    const onScroll = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) return;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(`[${BAND_ATTR}]`)
    );
    if (!els.length) return;

    const keyToSegment = new Map(
      RAIL_SEGMENTS.map((s, i) => [s.key, i] as const)
    );
    const keyToBand = new Map(BANDS.map((b) => [b.key, b] as const));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const key = entry.target.getAttribute(BAND_ATTR) ?? "";
          const band = keyToBand.get(key);
          if (!band) continue;
          setCurrent(band.code ? `${band.code} / ${band.name}` : band.name);
          setDark(band.world === "deep");
          const seg = keyToSegment.get(key);
          if (seg !== undefined) setDeepest((d) => Math.max(d, seg));
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <nav
      ref={rootRef}
      aria-label="Press cycle"
      data-rail-dark={dark || undefined}
      className="st-rail fixed left-0 top-0 bottom-0 z-40 hidden w-16 xl:flex flex-col items-center justify-center"
      style={{ contain: "layout paint" }}
    >
      {/* the bore */}
      <div className="st-rail-bore relative flex h-[min(60vh,540px)] w-2.5 flex-col overflow-hidden">
        {RAIL_SEGMENTS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            aria-label={`Go to ${s.name}`}
            onClick={() => {
              const el = document.querySelector<HTMLElement>(
                `[${BAND_ATTR}="${s.key}"]`
              );
              if (el) smoothScrollTo(el, -88);
            }}
            className="st-rail-seg relative flex-1 cursor-pointer"
          >
            <span
              className="st-rail-fill absolute inset-0"
              style={{
                background: s.railTone,
                transform: i <= deepest ? "scaleY(1)" : "scaleY(0)",
              }}
            />
          </button>
        ))}
      </div>
      {/* live meters — the dive computer ticks with the descent */}
      <p
        ref={metersRef}
        aria-hidden
        className="st-mono-sm st-rail-readout mt-5 tabular-nums"
      >
        0M
      </p>
      {/* current station readout, rotated pressroom-style */}
      <p
        className="st-mono-sm st-rail-readout mt-3 whitespace-nowrap"
        style={{ writingMode: "vertical-rl" }}
        aria-live="polite"
      >
        {current || "THE PRESS BED"}
      </p>
    </nav>
  );
}
