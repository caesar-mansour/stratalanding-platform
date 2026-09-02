/**
 * THE PRESSRUN — the pressroom's voices (world swap #3; slots preserved).
 *
 * All files pre-subset woff2 in src/fonts/ (pyftsubset locally, NEVER in CI).
 * Fraunces Black is instanced at opsz 144 / WONK 1 / SOFT 0 — the hot-metal
 * wonk IS the brand. display:'optional' + metric fallbacks everywhere; the
 * SSR display headline is the LCP and never waits on a font (the 4.4s
 * lesson, kept). The strata var names + weight slots are kept so every band
 * renders the new faces without markup churn (declared weight = rendered
 * file). Imported ONLY by world components → preload links stay route-scoped.
 */

import localFont from "next/font/local";

/** Display — Fraunces Black, the hot-metal press voice. Italic = the misregister word. */
export const zodiak = localFont({
  src: [
    { path: "../../fonts/fraunces-black.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/fraunces-blackitalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-strata-display",
  display: "optional",
  preload: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Display at monument scale — the ink-room prices (same Black instance). */
export const zodiakBlack = localFont({
  src: [{ path: "../../fonts/fraunces-black.woff2", weight: "900", style: "normal" }],
  variable: "--font-strata-price",
  display: "optional",
  preload: false,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Body — the survey report's reading serif. */
export const newsreader = localFont({
  src: [{ path: "../../fonts/newsreader-regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-strata-body",
  display: "optional",
  preload: false,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** UI — nav, buttons, forms. */
export const switzer = localFont({
  src: [{ path: "../../fonts/switzer-medium.woff2", weight: "500", style: "normal" }],
  variable: "--font-strata-ui",
  display: "optional",
  preload: true,
  fallback: ["Arial", "Helvetica", "sans-serif"],
  adjustFontFallback: "Arial",
});

/** Press mono — tickets, marks, specs. The signature layer. */
export const fragmentMono = localFont({
  src: [{ path: "../../fonts/plexmono-medium.woff2", weight: "400", style: "normal" }],
  variable: "--font-strata-mono",
  display: "optional",
  preload: true,
  fallback: ["Consolas", "Menlo", "monospace"],
  // localFont only allows 'Arial' | 'Times New Roman' | false here; mono
  // metrics-adjustment isn't supported. Fallback stack above carries it.
  adjustFontFallback: false,
});

/** Every variable class, joined — put on the homepage root wrapper. */
export const strataFontVars = [
  zodiak.variable,
  zodiakBlack.variable,
  newsreader.variable,
  switzer.variable,
  fragmentMono.variable,
].join(" ");
