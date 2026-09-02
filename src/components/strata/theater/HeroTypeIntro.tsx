"use client";

/**
 * DIRECTOR'S CUT — the hero type performs.
 *
 * SSR text is the truth: the h1 renders visible and IS the LCP. This
 * island only ever touches it when it can do so invisibly:
 *
 *   Tier B → await document.fonts.ready (display:optional — metrics final,
 *   lines can never re-wrap post-split) → getGsapKit() → THE THEATER-BUDGET
 *   GUARD: run only if the curtain exists, this is a cold visit, and
 *   performance.now() < 1100 — i.e. the split can begin while the curtain
 *   still covers the hero. Late gsap (slow network) or a repeat visit ⇒
 *   the h1 is never touched. No FOUC is possible by construction.
 *
 * Inside ONE requestAnimationFrame (no intermediate paint): SplitText
 * lines+mask, set yPercent:110, then the lines climb as the sea parts.
 * onComplete: split.revert() — pristine SSR DOM restored (SEO/a11y/
 * selection clean) — and the curtain node is removed as cleanup.
 */

import { useEffect } from "react";
import { useStrataTier } from "../tier";

export function HeroTypeIntro() {
  const tier = useStrataTier();

  useEffect(() => {
    if (tier !== "B") return;
    let cancelled = false;

    (async () => {
      try {
        await document.fonts.ready;
        const { getGsapKit } = await import("./gsapKit");
        const { gsap, SplitText } = await getGsapKit();
        if (cancelled) return;

        const h1 = document.querySelector<HTMLElement>("[data-hero-h1]");
        const sub = document.querySelector<HTMLElement>("[data-hero-sub]");
        const theater = document.getElementById("st-theater");
        const coldVisit = !document.documentElement.dataset.theaterSeen;

        // THE BUDGET GUARD — the no-FOUC law.
        const run =
          !!h1 && !!theater && coldVisit && performance.now() < 1100;
        if (!run) {
          theater?.remove();
          return;
        }

        requestAnimationFrame(() => {
          if (cancelled) return;
          const split = SplitText.create(h1, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            aria: "auto",
          });
          gsap.set(split.lines, { yPercent: 110 });

          const italic = h1.querySelector<HTMLElement>(".italic");
          const tl = gsap.timeline({
            defaults: { ease: "stEnter" },
            onComplete: () => {
              split.revert();
              theater?.remove();
            },
          });

          // the curtain parts 450–950ms; the text climbs as the sea opens
          tl.to(
            split.lines,
            { yPercent: 0, duration: 0.7, stagger: 0.09 },
            0.5
          );
          if (sub) {
            tl.fromTo(
              sub,
              { opacity: 0, y: 10 },
              { opacity: 1, y: 0, duration: 0.5 },
              0.9
            );
          }
          // one glow sweep across the italic word, then back to plain color
          if (italic) {
            tl.fromTo(
              italic,
              { textShadow: "0 0 0px rgba(34,211,238,0)" },
              {
                textShadow:
                  "0 0 22px rgba(34,211,238,0.85), 0 0 60px rgba(34,211,238,0.35)",
                duration: 0.35,
                yoyo: true,
                repeat: 1,
                ease: "stExit",
                clearProps: "textShadow",
              },
              1.15
            );
          }
        });
      } catch {
        // any failure: SSR text simply sits there, untouched
        document.getElementById("st-theater")?.remove();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tier]);

  return null;
}
