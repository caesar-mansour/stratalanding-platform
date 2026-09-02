# THE OBSERVATORY — SYSTEM.md (the constitution)

Tournament winner, picked by Caesar 2026-07-23 (bracket + walls:
`brain/strata-cut/tournament/`, `brain/strata-cut/wall/`). This file is the single
source of truth for the StrataLanding design system. Every band imports from here.
A hex, shadow, duration, or easing that exists only in a component is a **defect**
(Doctrine, Law 4). Authority order everywhere: **Conversion > Law > Craft.**

## The world in one sentence
A landing page is a smear of light until it passes through an eight-element optic —
StrataLanding is the observatory that resolves noise into signal.

## Vocabulary map (every UI concept has an observatory name)
| Site concept | Observatory name | Grammar |
|---|---|---|
| Page background | THE FIELD (night sky) | `--os-sky`, graticule, sparse stars (3 sizes only) |
| The 8 layers | THE EIGHT SPECTRAL BANDS | emission-line strip, labeled 01–08 |
| Section divider | THE MERIDIAN | `.os-meridian` emission seam |
| Hero artifact | THE APERTURE / THE RESOLVE | circle optic; blur outside, sharp inside |
| Pricing | THE CATALOG — THREE FIXED MAGNITUDES | brightness = capability; "Nothing variable." |
| Speed instrument | THE PHOTOMETER | "Light measured — never predicted." |
| Proof | THE OBSERVING LOG | dated entries, real readings only |
| Brief / documents | THE OBSERVING LOG (paper) | `--os-paper` world, ink type |
| Live elements | POINT SOURCES | glow = meaning: live, selected, recommended — only |
| Footer | THE DEEP FIELD | `--os-deepfield` |

## Laws (testable; violations fail the Kill Panel)
1. **Emission is light, not paint.** Cyan appears as lines, strokes, text, and glow.
   NEVER a solid cyan fill. No cyan rectangles, buttons included — the primary CTA is
   emission-BORDERED with inner glow. This single rule makes crops ours.
2. **Point sources only.** No directional daylight on dark surfaces. Every glow means
   something (live / selected / recommended). Decorative glow is a defect.
3. **Shape law.** Rectangles and perfect circles only. Radius tokens are 0 and full.
   No rounded cards — this is a chart, not an app.
4. **One bright object per field of view.** Each viewport has exactly one dominant
   luminous mass (aperture, brightest star, price). Squint test enforces this.
5. **Chart furniture is load-bearing.** Graticule + coordinate marginalia (RA/DEC,
   survey dates — real dates only) frame every band. Remove them and the band is naked.
6. **Type:** Instrument Serif carries the brand alone (display + chapter, one weight +
   italic; italics are emission-colored and rationed — one per viewport). Newsreader =
   body. Space Mono = all chart furniture. Switzer = forms/UI only. Scale jumps ≥2.2×.
7. **Motion is orbital** (see `motion/motion.md`): two easings total — `--os-ease-capture`
   (enter) and `--os-ease-slingshot` (exit). Moves must be named ones. Reduced motion =
   finished poster (Law 8 of the Doctrine).
8. **Paper is for the log.** /brief and document surfaces run the `--os-paper` world with
   ink type; the CTA pair inverts automatically under `.os-log`.
9. **Honesty carried over intact:** FICTIONAL SHOWCASE labels, computed counts, no
   invented numbers — "every number was measured, never invented" is now literally the
   brand voice.
10. **Contracts untouched:** section_view IDs, anchors, /brief?plan= slugs, /demos?goal=
    values, ONE CTA label pair from brand.cta, prices only in the catalog from brand.ts.

## Primitives (import from `src/design-system`)
- `BandShell` — band wrapper: field ground + graticule + kicker row (mono eyebrow left,
  mute label right, hairline) + optional coordinate marginalia.
- `Rule` — single hairline or double-rule furniture.
- `Marginalia` — vertical RA/DEC edge labels.
- `Plate` — instrument panel (`.os-plate`).
- `Readout` — the big-number instrument (value + unit + label + note), the 292MS pattern.
- `CtaSet` — the ONE pair: primary `os-btn-em` + secondary `os-btn-hair`; six microstates
  live in tokens.css. Labels come from brand.cta — never hand-written.
- `Seam` — THE MERIDIAN divider.
- `Aperture` — the circle optic: crosshair + masked content, blur/smear outside optional.

## Engineering rails (retained, re-skinned)
LoadTheater curtain → THE DOME (opens like a dome slit, sky colors). Bore/porthole →
THE APERTURE (same CSS-sticky runway mechanics). SplashCursor water sim → retired from
the homepage in this world; replaced by the (cheaper) star parallax + resolve moves.
Tier gates, gsapKit, observe-vitals/soak/contract-audit pipelines: unchanged law.

## Fonts
Instrument Serif (400 + italic) and Space Mono (400/700) — OFL, subset to woff2 in
`src/fonts/` via the same pipeline as Zodiak, `display: optional` forever. Newsreader
and Switzer subsets already exist. Zodiak and Fragment Mono retire with the DIVE bands
(delete after N3 sweep completes).
