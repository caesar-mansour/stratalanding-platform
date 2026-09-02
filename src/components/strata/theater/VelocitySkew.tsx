"use client";

/**
 * DIRECTOR'S CUT — the page has mass. Fast scroll subtly skews media along
 * the scroll axis (clamp ±4°), springing back to 0 at rest. Reads
 * window.__lenis.velocity (SmoothScroll exposes it); ONE rAF loop that
 * parks at rest; applies only to [data-skew] elements currently visible
 * (one IO tracks membership). Media only — never text. Tier-B.
 */

import { useEffect } from "react";
import { useStrataTier } from "../tier";

export function VelocitySkew() {
  const tier = useStrataTier();

  useEffect(() => {
    if (tier !== "B") return;
    let killed = false;
    let raf = 0;
    let io: IntersectionObserver | undefined;
    let cleanup: (() => void) | undefined;

    (async () => {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-skew]")
      );
      if (!els.length) return;
      const { getGsapKit } = await import("./gsapKit");
      const { gsap } = await getGsapKit();
      if (killed) return;

      const visible = new Set<HTMLElement>();
      io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) =>
            e.isIntersecting
              ? visible.add(e.target as HTMLElement)
              : visible.delete(e.target as HTMLElement)
          ),
        { rootMargin: "10% 0px" }
      );
      els.forEach((el) => io?.observe(el));

      const setters = new Map(
        els.map((el) => [
          el,
          gsap.quickTo(el, "skewY", { duration: 0.4, ease: "power2" }),
        ])
      );

      let running = false;
      let settled = 0;
      const tick = () => {
        const lenis = (
          window as unknown as { __lenis?: { velocity?: number } }
        ).__lenis;
        const v = lenis?.velocity ?? 0;
        const skew = Math.max(-4, Math.min(4, v / -320));
        visible.forEach((el) => setters.get(el)?.(skew));
        if (Math.abs(v) < 0.05) {
          settled++;
          if (settled > 30) {
            visible.forEach((el) => setters.get(el)?.(0));
            running = false; // parked
            return;
          }
        } else {
          settled = 0;
        }
        raf = requestAnimationFrame(tick);
      };
      const onScroll = () => {
        if (running || killed) return;
        running = true;
        settled = 0;
        raf = requestAnimationFrame(tick);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => window.removeEventListener("scroll", onScroll);
    })();

    return () => {
      killed = true;
      cancelAnimationFrame(raf);
      io?.disconnect();
      cleanup?.();
    };
  }, [tier]);

  return null;
}
