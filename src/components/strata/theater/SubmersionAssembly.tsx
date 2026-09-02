"use client";

/**
 * DIRECTOR'S CUT — the SUBMERSION line assembles letter by letter as the
 * world darkens. SplitText chars scatter (±12px, opacity 0.15) and settle
 * under a scroll scrub as the plunge crosses the viewport. Tier-B only;
 * Tier-A/reduced/mobile keep the untouched SSR line. In-view skip law:
 * if the plunge is already near the viewport at mount (deep link), the
 * line is never hidden.
 */

import { useEffect } from "react";
import { useStrataTier } from "../tier";

export function SubmersionAssembly() {
  const tier = useStrataTier();

  useEffect(() => {
    if (tier !== "B") return;
    let killed = false;
    let teardown: (() => void) | undefined;

    (async () => {
      const target = document.querySelector<HTMLElement>(
        "[data-submersion-line]"
      );
      if (!target) return;
      // deep-link guard: already near view → leave the SSR line alone
      if (target.getBoundingClientRect().top < window.innerHeight * 1.5) return;

      await document.fonts.ready;
      const { getGsapKit } = await import("./gsapKit");
      const { gsap, SplitText, ScrollTrigger } = await getGsapKit();
      if (killed) return;

      // THE LA/YERS LAW (Press Book §XIII): chars-only splits let the browser
      // wrap MID-WORD ("the la / yers"). Words are the wrap units — chars
      // animate inside them; word wrappers keep natural wrapping intact.
      const split = SplitText.create(target, {
        type: "words,chars",
        wordsClass: "st-split-word",
        aria: "auto",
      });

      const rand = (i: number) =>
        // deterministic scatter (no Math.random needed — index-derived)
        ((i * 9301 + 49297) % 233280) / 233280;

      split.chars.forEach((c, i) => {
        gsap.set(c, {
          x: (rand(i) - 0.5) * 24,
          y: (rand(i + 7) - 0.5) * 24,
          opacity: 0.15,
        });
      });

      const tween = gsap.to(split.chars, {
        x: 0,
        y: 0,
        opacity: 1,
        ease: "none",
        stagger: { each: 0.02, from: "start" },
        scrollTrigger: {
          trigger: target,
          start: "top 78%",
          end: "top 22%",
          scrub: true,
        },
      });

      teardown = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        split.revert();
      };
    })();

    return () => {
      killed = true;
      teardown?.();
    };
  }, [tier]);

  return null;
}
