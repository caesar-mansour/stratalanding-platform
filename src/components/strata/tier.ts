"use client";

/**
 * THE STRATA CUT — the single device gate + the section-view once-guard.
 * Ported from night/tier.ts (proven logic; the night dir dies in the S6
 * sweep). Every band reads THIS gate; nothing re-derives the predicate.
 *
 * Tier "B" = desktop ≥1025px, fine pointer, motion on, device ≥ mid, not
 * server-detected mobile. SSR + first client render ALWAYS return "A" —
 * zero hydration mismatch, zero mobile cost. The Cleave scrub and the
 * Archive takeover run on B only; mobile gets the single OPEN grammar.
 */

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/lib/MobileContext";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useDeviceTier, usePerformanceLevel } from "@/lib/animation-perf";
import { trackSectionView } from "@/lib/analytics";

export type StrataTier = "A" | "B";

export function useStrataTier(): StrataTier {
  const isMobile = useIsMobile();
  const reduce = useReducedMotion();
  const deviceTier = useDeviceTier();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1025px) and (pointer: fine)");
    setDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return !isMobile && desktop && !reduce && deviceTier !== "low" ? "B" : "A";
}

/** High tier — theatrical extras on high-end devices running smoothly only. */
export function useStrataTierHigh(): boolean {
  const tier = useStrataTier();
  const deviceTier = useDeviceTier();
  const level = usePerformanceLevel();
  return tier === "B" && deviceTier === "high" && level === "full";
}

/**
 * Fire trackSectionView exactly once when a band enters the reading band.
 * Same -30% threshold the analytics dashboards were calibrated against.
 */
export function useSectionView(
  ref: React.RefObject<Element | null>,
  analyticsId?: string
): void {
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !analyticsId || fired.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired.current) continue;
          fired.current = true;
          trackSectionView(analyticsId);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -30% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, analyticsId]);
}

/**
 * THE CUT trigger — adds .is-cut once when the band enters view, arming the
 * SCORE + OPEN transitions defined in tokens.css. Reduced motion never arms
 * (the finished atlas: everything already open via the CSS media query).
 */
export function useCut(ref: React.RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-cut");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.classList.add("is-cut");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}
