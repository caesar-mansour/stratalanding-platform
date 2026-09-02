"use client";

/**
 * SmoothScroll — site feel upgrade.
 * Lenis inertia/momentum scrolling wired into the GSAP ticker so ScrollTrigger
 * scenes stay in sync. Scoped to the homepage (rendered in app/page.tsx), so
 * admin/portal routes keep native scroll. Off under reduced-motion + coarse
 * pointers (native scroll feels better on touch). Exposes window.__lenis so the
 * few programmatic in-page scrolls (nav anchors, logo→top) can route through it.
 *
 * PERF LAW: gsap + Lenis are dynamically imported AFTER the pointer/motion
 * checks — phones and reduced-motion users ship ZERO bytes of either.
 * (Static imports here previously sent ~30KB gz of gsap to mobile that an
 * early-return never executed.)
 */

import { useEffect } from "react";
import type Lenis from "lenis";
import { useReducedMotion } from "@/lib/useReducedMotion";

export default function SmoothScroll() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || typeof window === "undefined") return;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (coarse) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ default: LenisCtor }, { gsap }, { ScrollTrigger }] =
        await Promise.all([
          import("lenis"),
          import("gsap"),
          import("gsap/ScrollTrigger"),
        ]);
      if (disposed) return;

      gsap.registerPlugin(ScrollTrigger);

      const lenis = new LenisCtor({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      });
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Below-the-fold sections are dynamically imported, so heights change
      // after mount — keep ScrollTrigger's measurements honest. Debounced
      // (trailing 200ms) so chunk-hydration bursts coalesce into one refresh
      // instead of a mid-scrub refresh storm.
      let refreshT: number | undefined;
      const ro = new ResizeObserver(() => {
        window.clearTimeout(refreshT);
        refreshT = window.setTimeout(() => ScrollTrigger.refresh(), 200);
      });
      ro.observe(document.body);
      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);

      cleanup = () => {
        window.removeEventListener("load", onLoad);
        window.clearTimeout(refreshT);
        ro.disconnect();
        gsap.ticker.remove(tick);
        lenis.destroy();
        (window as unknown as { __lenis?: Lenis }).__lenis = undefined;
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [reduce]);

  return null;
}

/** Route a programmatic scroll through Lenis when active, else native (offset preserved). */
export function smoothScrollTo(target: HTMLElement | number, offset = -80) {
  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
  if (lenis) {
    lenis.scrollTo(target, { offset });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
    return;
  }
  const y = target.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top: y, behavior: "smooth" });
}
