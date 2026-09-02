"use client";

/**
 * DIRECTOR'S CUT — the mechanics schematic draws itself. DrawSVG on the
 * channel paths of Band10's SVG, once, at the band's cut beat. RSC band
 * stays RSC — this island finds the svg from outside. CSS fallback = the
 * static schematic (already shipped). Tier-B.
 */

import { useEffect } from "react";
import { useStrataTier } from "../tier";

export function SchematicDraw() {
  const tier = useStrataTier();

  useEffect(() => {
    if (tier !== "B") return;
    let killed = false;
    let io: IntersectionObserver | undefined;

    (async () => {
      const band = document.querySelector<HTMLElement>(
        '[data-strata-band="mechanics"]'
      );
      const svg = band?.querySelector("svg");
      if (!band || !svg) return;
      if (band.getBoundingClientRect().top < window.innerHeight * 1.5) return;

      const { getGsapKit } = await import("./gsapKit");
      const { gsap } = await getGsapKit();
      if (killed) return;

      const strokes = Array.from(svg.querySelectorAll("path, rect"));
      io = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          io?.disconnect();
          gsap.fromTo(
            strokes,
            { drawSVG: "0%" },
            {
              drawSVG: "100%",
              duration: 1.1,
              stagger: 0.14,
              ease: "stEnter",
            }
          );
        },
        { rootMargin: "0px 0px -20% 0px", threshold: 0 }
      );
      io.observe(band);
    })();

    return () => {
      killed = true;
      io?.disconnect();
    };
  }, [tier]);

  return null;
}
