# THE OBSERVATORY — motion grammar

Physics: **everything moves like mass in orbit — huge, slow, inevitable.** Nothing
bounces. Nothing wiggles. Two authored easings, total (Doctrine Law 3):

- `--os-ease-capture` `cubic-bezier(0.16, 0, 0.08, 1)` — ENTER. Orbital capture: fast
  approach, long inevitable settle. Used for reveals, focus, hover-in.
- `--os-ease-slingshot` `cubic-bezier(0.62, 0, 0.22, 1)` — EXIT. Gravitational release:
  builds, then lets go. Used for dismissals, hover-out, wipes.

Durations: `--os-dur-fast` 180ms (microstates) · `--os-dur-move` 420ms (reveals) ·
`--os-dur-drift` 1200ms (large masses). Scroll-driven moves use `scrub: true` — Lenis
is the smoothing; never a scrub number (the Cleave idiom, unchanged).

## The named moves (a motion not on this list is a defect)
1. **THE RESOLVE** — blur(14px)+scale(1.06) → sharp. The signature. Hero aperture
   content, images entering. Scroll-scrubbed on the hero; capture-eased elsewhere.
2. **ORBIT** — slow parallax drift of field furniture (stars, marginalia) at ≤0.06
   scroll ratio. Constant, imperceptible, alive.
3. **EMISSION** — a line draws in from 0 width/height with its glow arriving 80ms
   late. Spectral strips, rules, meridians. (DrawSVG for true paths.)
4. **FOCUS-PULL** — scroll-scrubbed depth handoff between bands: outgoing band blurs
   2px + dims 12% as the next enters sharp. Replaces the DIVE's submersion.
5. **TRACKING** — horizontal pan on rails (telescope tracking a target): used for the
   demo shelf / archive rows. Velocity-clamped, no free momentum.
6. **POINT** — 2.4s glow pulse on point sources. LIVE-ONLY law: only elements that are
   genuinely live (observed vitals, live rail) may pulse. One per viewport.

## Budgets (unchanged law)
Tier-gated (`useStrataTier`), idle-mounted, visibility-paused. Observed LCP ≤600ms /
CLS ≤0.01 / no long task >200ms in soak. Reduced-motion renders the finished poster —
every band must pass the STILL test with all six moves deleted.
