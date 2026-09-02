/**
 * THE OBSERVATORY — the four voices (SYSTEM.md, Fonts).
 *
 * Pre-subset woff2 in src/fonts/ (Instrument Serif R+I 38KB, Space Mono 13KB;
 * Newsreader + Switzer shared with the previous world). display:'optional'
 * with metric-matched fallbacks everywhere — the SSR display headline is the
 * LCP and never waits on a font. Preloaded: Instrument Serif Regular, Space
 * Mono, Switzer. Not preloaded: Italic (emphasis-only), Newsreader (body,
 * below-fold-dominant).
 *
 * Imported ONLY by Observatory world roots → preload links stay route-scoped.
 */

import localFont from "next/font/local";

/** Display — the didone voice of the dome. One weight + true italic. */
export const instrumentSerif = localFont({
  src: [
    { path: "../fonts/instrumentserif-regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrumentserif-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-os-display",
  display: "optional",
  preload: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Body — the observing log's reading serif (shared file with the DIVE). */
export const osNewsreader = localFont({
  src: [{ path: "../fonts/newsreader-regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-os-body",
  display: "optional",
  preload: false,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** UI — forms, nav (shared file with the DIVE). */
export const osSwitzer = localFont({
  src: [{ path: "../fonts/switzer-medium.woff2", weight: "500", style: "normal" }],
  variable: "--font-os-ui",
  display: "optional",
  preload: true,
  fallback: ["Arial", "Helvetica", "sans-serif"],
  adjustFontFallback: "Arial",
});

/** Chart mono — RA/DEC, spectra, catalog entries. The signature layer. */
export const spaceMono = localFont({
  src: [{ path: "../fonts/spacemono-regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-os-mono",
  display: "optional",
  preload: true,
  fallback: ["Consolas", "Menlo", "monospace"],
  // mono metric adjustment unsupported by localFont; stack above carries it
  adjustFontFallback: false,
});

/** Every variable class, joined — put on the Observatory world root. */
export const osFontVars = [
  instrumentSerif.variable,
  osNewsreader.variable,
  osSwitzer.variable,
  spaceMono.variable,
].join(" ");
