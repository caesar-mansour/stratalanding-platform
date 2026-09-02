/**
 * THE TYPE SYSTEM — three faces, each locked to one role.
 *
 * Outfit for display and section headings only. Inter for everything else.
 * JetBrains Mono for digits, prices, day codes and uppercase micro-labels —
 * never prose (Dovetail's verified role for a mono face: "at 12px or 14px with
 * positive letter-spacing… for labels, data, or code elements").
 *
 * Outfit and Inter are already loaded by the root layout for the rest of the
 * site, so the display and body faces add ZERO new payload here.
 *
 * `display: "optional"` on the two loaded-critical faces is load-bearing for
 * the perf gate: the LCP element is the SSR headline, and "optional" guarantees
 * it paints in the metric-matched fallback rather than blocking on a webfont.
 *
 * Weight ceiling is enforced at the loader, not just in CSS: Outfit ships 400
 * and 500 ONLY, so a stray `font-weight: 800` cannot render heavy — it will
 * synthesise or clamp instead of silently shipping the thing that got rejected.
 * The rule: never use bolding (weights above 500) for headlines; the system
 * relies on lighter weights for stylistic authority.
 */
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";

/** Display + section headings. Never above weight 500, never above 64px. */
export const oneDisplay = Outfit({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "optional",
  variable: "--font-one-display",
});

/** Everything under 30px: nav, sublines, body, captions, buttons. */
export const oneBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "optional",
  variable: "--font-one-body",
});

/**
 * Digits only, always tabular. Not preloaded — it is never the LCP element,
 * and the prices it sets live far below the fold.
 */
export const oneMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  variable: "--font-one-mono",
});

export const oneFontVars = [oneDisplay.variable, oneBody.variable, oneMono.variable].join(" ");
