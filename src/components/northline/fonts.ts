/**
 * NORTHLINE — the two faces the root layout doesn't already carry.
 *
 * The root layout (src/app/layout.tsx) loads Outfit (--font-heading) and Inter
 * (--font-body) for every route with display:'optional', which is the trick
 * that keeps the SSR <h1> LCP from ever waiting on a webfont. Northline uses
 * those two for display and body, so nothing changes there.
 *
 * It needs two more, and both already exist in src/fonts as pre-subset woff2 —
 * no new dependency, no Google round-trip, no new bytes beyond these files:
 *
 *   Instrument Serif Italic — THE ornament. Exactly six words on the whole page
 *     ("brochure", "machine", "dealt", "down", "working", "hire") plus the
 *     manifesto block. This is the face the approved design actually uses, and
 *     it happens to already be vendored here from an earlier direction.
 *   IBM Plex Mono — every label, kicker, timestamp, chip and digit. Standing in
 *     for JetBrains Mono: same technical register, already subset, already here.
 *
 * Both preload:true — they are above the fold (the hero H1 carries the italic,
 * the hero ledger head carries the mono). Imported ONLY by the homepage, so the
 * preload links stay route-scoped and no other route pays for them.
 */

import localFont from "next/font/local";

/** The ornament. Italic only — Instrument Serif has no bold and needs none. */
export const nlSerif = localFont({
  src: [{ path: "../../fonts/instrumentserif-italic.woff2", weight: "400", style: "italic" }],
  variable: "--font-nl-serif",
  display: "optional",
  preload: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Labels, digits, marginalia — the layer that makes the page read as a ledger. */
export const nlMono = localFont({
  src: [
    { path: "../../fonts/plexmono-regular.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/plexmono-medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-nl-mono",
  display: "optional",
  preload: true,
  fallback: ["Consolas", "Menlo", "monospace"],
  // localFont only accepts 'Arial' | 'Times New Roman' | false here, and mono
  // metric adjustment isn't supported — the fallback stack above carries it.
  adjustFontFallback: false,
});

/** Both variable classes, joined. Goes on the homepage root wrapper. */
export const northlineFontVars = [nlSerif.variable, nlMono.variable].join(" ");
