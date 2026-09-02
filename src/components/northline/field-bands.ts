/**
 * THE COLOUR FIELD'S BAND LIST — the `data-bg` half of the engine contract.
 *
 * ⚠️ THIS FILE HAS NO "use client" AND MUST NEVER GET ONE. Every section that
 * needs a band is a SERVER component. A plain value exported from a "use client"
 * module is replaced by a client-reference proxy when a server component imports
 * it, so `NL_FIELD_BANDS.watching` renders as `undefined`, the attribute is
 * dropped from the HTML entirely, and bgfield() bails on `if (!els.length)` —
 * the field then never paints and nothing in the console says why. That is
 * exactly what happened on the first pass of this port; it is the reason these
 * constants do not live in ColourField.tsx next to the component that documents
 * them.
 *
 * See ColourField.tsx for the engine contract, the ground-indirection mechanism
 * and the full list of per-section edits. This file is only the values.
 *
 * bgfield() parses each value with slice(1,3)/(3,5)/(5,7) + parseInt(_, 16), so
 * every one must be a 7-character `#rrggbb`: no shorthand, no named colour, no
 * var(), no alpha.
 *
 * ⚠️ STATUS, 2026-08-13 — THIS MAP IS DOCUMENTATION, NOT A DEPENDENCY.
 * `grep -rn "field-bands\|NL_FIELD_BANDS" src/` returns this file and
 * ColourField.tsx's prose and NOTHING ELSE. All fifteen shipped bands were
 * applied as literal hex — `data-bg="#0a1730"` on the eleven flow sections,
 * `bg="#071022"` through Stage on the four pinned ones — so nothing here is
 * load-bearing and nothing here can drift the page. The direction of the risk is
 * the other way: this file can go stale against the sections without any test or
 * type failing. The fifteen values below were re-read out of the live DOM at
 * 1600x1000 on 2026-08-13 and every one matches, so it is accurate as of that
 * date; treat a mismatch as this file being wrong, never the section.
 * If you are editing a section, either import from here or fix here too.
 */

/** Transcribed from nl.css, which is the authority for all four. */
export const NL_BONE = "#f6f3ec";
export const NL_PANEL = "#ece6d7";
export const NL_INK_BAND = "#0a1730";
export const NL_INK_DEEP = "#071022";

/**
 * In scroll order. The engine reads DOCUMENT order, not this object — the order
 * here is documentation, and the keys exist so a section writes
 * `data-bg={NL_FIELD_BANDS.watching}` instead of retyping a hex.
 *
 * Each value is what OUR section already paints, not a literal translation of
 * the source's band list — the field's job is to BE the section's ground, and a
 * field that disagreed with the section would jump the moment the ground
 * indirection flips. Two deliberate departures from the source, both recorded
 * in ColourField.tsx: anatomy sits on ink-deep rather than the source's band
 * navy, and marquee gets a band at all (the source's marquee is 71px of flow
 * inside #math and owns none).
 */
export const NL_FIELD_BANDS = {
  /**
   * ⚠️ NOT EMITTED, AND CORRECTLY SO — kept only so nobody "fixes" its absence.
   * An earlier note in ColourField.tsx called Journey's missing band the one
   * failure this design can produce. That was written against a Journey that
   * did not exist yet. The shipped Journey.tsx paints its scene ground as a hard
   * `background: "#f6f3ec"` on `.jstick` (L269) which the ENGINE then lerps bone
   * -> navy across the scene; it never reads `var(--nl-ground-*)`, so it is
   * opaque at every scroll position on every tier and the field is invisible
   * underneath it. Declaring `#f6f3ec` for it would pin the field bone under a
   * scene that ends navy. Journey owns no band for the same reason Hero owns
   * none: at scroll 0 no band top has passed 0.42*vh, bgfield() falls back to
   * els[0] (#system, bone) and the field reads bone anyway. Verified live:
   * field at scrollY 0 = rgb(246,243,236).
   */
  journey: NL_BONE,
  system: NL_BONE,
  anatomy: NL_INK_DEEP,
  compare: NL_PANEL,
  manifesto: NL_INK_BAND,
  spine: NL_INK_BAND,
  portal: NL_BONE,
  process: NL_PANEL,
  /** DELETED. The verticals band is gone from the page: at ~70px tall it could
   *  never hold this colour, because bgfield() seams each band toward the next
   *  over min(300px, height/2) — 35px here — so the field was already most of
   *  the way to bone across the whole band while its type was authored for
   *  navy. Near-white on cream. Kept as a note so nobody "restores" the key. */
  math: NL_BONE,
  watching: NL_INK_BAND,
  receipts: NL_INK_BAND,
  refusal: NL_PANEL,
  assay: NL_PANEL,
  pricing: NL_BONE,
  start: NL_INK_DEEP,
} as const;
