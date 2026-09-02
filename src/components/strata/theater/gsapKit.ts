"use client";

/**
 * DIRECTOR'S CUT — the single GSAP loading point.
 *
 * The ONLY place club plugins are imported/registered (they're installed —
 * full Club set in node_modules/gsap). Every theater island awaits
 * getGsapKit(); everything bundles into one shared async chunk that never
 * ships to mobile (callers gate on Tier B first) and never loads before
 * the SSR hero has painted.
 *
 * Authors the two brand eases as CustomEase: "stEnter" (0.2,0,0,1) and
 * "stExit" (0.6,0,0.4,1) — the same two curves tokens.css declares. Two
 * easings site-wide is law; these are their GSAP names.
 */

import type { gsap as GsapType } from "gsap";

export interface GsapKit {
  gsap: typeof GsapType;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
  SplitText: typeof import("gsap/SplitText").SplitText;
  ScrambleTextPlugin: unknown;
  DrawSVGPlugin: unknown;
}

let kit: Promise<GsapKit> | null = null;

export function getGsapKit(): Promise<GsapKit> {
  return (kit ??= Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("gsap/SplitText"),
    import("gsap/ScrambleTextPlugin"),
    import("gsap/DrawSVGPlugin"),
    import("gsap/CustomEase"),
  ]).then(
    ([
      gsapMod,
      { ScrollTrigger },
      { SplitText },
      { ScrambleTextPlugin },
      { DrawSVGPlugin },
      { CustomEase },
    ]) => {
      const gsap = gsapMod.gsap;
      gsap.registerPlugin(
        ScrollTrigger,
        SplitText,
        ScrambleTextPlugin,
        DrawSVGPlugin,
        CustomEase
      );
      // the two authored curves — never invent a third
      if (!CustomEase.get("stEnter")) CustomEase.create("stEnter", "0.2,0,0,1");
      if (!CustomEase.get("stExit")) CustomEase.create("stExit", "0.6,0,0.4,1");
      return { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin };
    }
  ));
}
