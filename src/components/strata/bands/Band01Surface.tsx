/**
 * SP1 — THE PRESS BED (hero). THE PRESSRUN · Act I opens.
 *
 * Contract frame: brain/strata-cut/tournament/../pressbook/sp1-pressbed.png
 * (2560×1300). Full-bleed paper bed: margin furniture (density bar, press-
 * cycle rail, crop/reg marks), the claim at hot-metal scale with the
 * misregistered C-plate italic + OUT OF REGISTER stamp, THE RACK of eight
 * ink plates with the cyan-linework page and THE LOUPE (the live reel —
 * Porthole geometry, BorePortal drills through it unchanged), and the
 * steel bed rail carrying the big ticks + the living-press job slot.
 * RSC — the h1 is the LCP; no priority images, ever.
 */

import { CtaRow } from "../CtaRow";
import { Porthole } from "../Bore/Porthole";
import { BorePortal } from "../Bore/BorePortal";
import { PressJobSlot } from "../press/PressJobSlot";

// Proof number = build date (SSG: computed once at build, never typed).
const PROOF_NO = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

const PLATES = [
  { no: "PLATE 02 — DESIGN", ink: "K · 92%" },
  { no: "PLATE 03 — MOTION", ink: "K · 88%" },
  { no: "PLATE 04 — SPEED", ink: "K · 95%" },
  { no: "PLATE 05 — PROOF", ink: "K · 90%" },
  { no: "PLATE 06 — MECHANICS", ink: "K · 85%" },
  { no: "PLATE 07 — MEASUREMENT", ink: "K · 87%" },
  { no: "PLATE 08 — FOUNDATION", ink: "K · 100%" },
] as const;

const DENSITY = [
  "#0B1B3A", "#22304f", "#3a4a6b", "#0891B2",
  "#39a8c4", "#7cc5d8", "#b7dde8", "#e3f2f6",
] as const;

const CYCLE = ["PLATE", "INK", "REGISTER", "PULL", "DRY", "STAMP", "DELIVER"] as const;

/* the cyan-linework page etched into the top plate (pure CSS, no bake) */
function PlateLinework() {
  const line = "1.5px solid rgba(34,211,238,0.55)";
  return (
    <div
      aria-hidden
      className="absolute inset-x-5 bottom-4 top-14"
      style={{ border: "1.5px solid rgba(34,211,238,0.8)" }}
    >
      <i className="absolute" style={{ left: 16, top: 14, width: "46%", height: 30, background: "rgba(34,211,238,0.16)" }} />
      <i className="absolute" style={{ left: 16, top: 56, width: "30%", height: 10, background: "rgba(34,211,238,0.3)" }} />
      <i className="absolute" style={{ left: 16, top: 80, width: 96, height: 24, background: "rgba(34,211,238,0.85)" }} />
      <i className="absolute" style={{ right: 16, top: 14, width: "32%", height: 92, border: line }} />
      <i className="absolute" style={{ left: 16, bottom: 44, width: "28%", height: 40, border: line }} />
      <i className="absolute" style={{ left: "36%", bottom: 44, width: "28%", height: 40, border: line }} />
      <i className="absolute" style={{ right: 16, bottom: 44, width: "28%", height: 40, border: line }} />
      <i className="absolute" style={{ left: 16, right: 16, bottom: 12, height: 14, background: "rgba(34,211,238,0.12)" }} />
    </div>
  );
}

export function Band01Surface({ demoCount }: { demoCount: number }) {
  return (
    <section
      data-strata-band="surface"
      className="st-grain st-rays st-column-shallow st-bore-runway relative z-[15] text-strata-ink"
    >
      {/* the sticky stage — mobile: normal flow; desktop: 100svh pinned by CSS */}
      <div className="st-bore-stage relative flex min-h-svh flex-col overflow-hidden lg:sticky lg:top-0 lg:min-h-0 lg:h-[100svh]">

        {/* ── z0: margin furniture (wide desktops carry the shop's edges) ── */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden min-[1700px]:block">
          <div className="pr-cropmark absolute left-6 top-6" />
          <div className="pr-cropmark absolute right-6 top-6 -scale-x-100" />
          <div className="pr-cropmark absolute bottom-6 left-6 -scale-y-100" />
          <div className="pr-regmark absolute left-1/2 top-8 -translate-x-1/2" />
          <div className="pr-regmark absolute bottom-8 left-1/2 -translate-x-1/2" data-c />
          {/* density bar — left margin */}
          <div className="pr-density absolute left-7 top-1/2 -translate-y-1/2">
            {DENSITY.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
            <p className="st-mono-sm mt-3 text-strata-ink-mute" style={{ writingMode: "vertical-rl" }}>
              INK DENSITY — C / K
            </p>
          </div>
          {/* press-cycle rail — right margin */}
          <div className="pr-cycle absolute bottom-28 right-7 top-28">
            {CYCLE.map((s, i) => (
              <span key={s} className="contents">
                <span className="st" data-on={i === 0 || undefined}>{s}</span>
                {i < CYCLE.length - 1 && <span className="ln" />}
              </span>
            ))}
          </div>
        </div>

        <div
          data-hero-copy
          className="st-bed relative flex w-full flex-1 flex-col pt-24 lg:pt-20"
        >
          {/* ── z1: the shop lines ── */}
          <div className="flex items-baseline justify-between border-b-2 border-strata-ink pb-3">
            <p className="st-mono text-strata-ink-mute">
              STRATALANDING — LANDING PAGE STUDIO
            </p>
            <p className="st-mono hidden text-strata-ink-mute sm:block">
              PROOF NO. {PROOF_NO} · SHEET 1 OF 1
            </p>
          </div>
          <div className="flex items-baseline justify-between border-b border-strata-hairline py-2">
            <p className="st-mono-sm text-strata-ink-mute">
              THE PLATE ROOM · 8 PLATES LOADED · PRESS READY
            </p>
            <p className="st-mono-sm hidden items-center gap-2 text-strata-ink-mute sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-strata-live st-glow-soft" />
              TOLERANCE ON PRICE: ±0
            </p>
          </div>

          <div className="grid flex-1 gap-10 lg:grid-cols-[minmax(0,60%)_1fr] lg:gap-14">
            {/* ── z2: the claim ── */}
            <div className="flex flex-col pt-6 lg:pt-8">
              <h1 data-hero-h1 className="st-display !text-[clamp(2.8rem,5.3vw,8.75rem)]">
                Every landing page looks{" "}
                <span className="pr-misreg italic text-strata-ink">
                  fine
                  <span className="pr-misreg-c" aria-hidden>
                    fine
                  </span>
                </span>{" "}
                from the surface.
              </h1>
              <div className="-mt-1 hidden items-center gap-3 lg:flex">
                <span aria-hidden className="h-px w-10 bg-strata-seam" />
                <span className="pr-stamp">PLATE C — OUT OF REGISTER</span>
              </div>

              <p data-hero-sub className="st-body mt-7 text-strata-ink-body">
                What&rsquo;s underneath decides whether it sells. We build all
                eight layers. Fixed price, from&nbsp;$2,400. No calls&nbsp;—
                ever.
              </p>

              <div className="mt-8">
                <CtaRow location="hero" />
              </div>
            </div>

            {/* ── z3: THE RACK — eight ink plates, the loupe on the top one ── */}
            <div className="relative hidden lg:block" data-specimen-slot>
              <div className="pr-plate relative mt-2 h-[300px] min-[1700px]:h-[340px]"
                   style={{ background: "linear-gradient(178deg,#12234a,#0B1B3A 60%,#081428)" }}>
                <div className="flex items-start justify-between px-5 pt-4">
                  <span className="st-mono-sm" style={{ color: "#22D3EE" }}>
                    PLATE 01 — THE CLAIM
                  </span>
                  <span className="st-mono-sm text-strata-bone-mute">C · 100%</span>
                </div>
                <PlateLinework />
                {/* THE LOUPE — the live reel, docked on the plate's corner.
                    BorePortal drills through this exact geometry. */}
                <div className="pointer-events-auto absolute -bottom-12 right-8 z-10 scale-[0.5] origin-bottom-right">
                  <Porthole />
                </div>
              </div>
              <div className="mt-4 space-y-0">
                {PLATES.map((p) => (
                  <div
                    key={p.no}
                    className="pr-plate -mt-px flex h-11 items-center justify-between px-5"
                  >
                    <span className="st-mono-sm text-strata-bone">{p.no}</span>
                    <span className="st-mono-sm text-strata-bone-mute">{p.ink}</span>
                  </div>
                ))}
              </div>
              <p className="st-mono-sm mt-4 text-right text-strata-ink-mute">
                FIG. 01 — THE PRESS BED. EIGHT PLATES, ONE PAGE THAT SELLS.{" "}
                {demoCount} ON FILE.
              </p>
            </div>
          </div>

          {/* mobile: the single plate + loupe, designed-alive */}
          <div className="lg:hidden">
            <Porthole compact />
          </div>

          {/* ── z4: the bed rail — ticks + the living-press job slot ── */}
          <div className="pr-rail mt-6 flex flex-col gap-6 px-6 py-5 lg:mt-auto lg:mb-9 lg:flex-row lg:items-center lg:gap-14 lg:px-10">
            {[
              ["8", "PLATES, EVERY BUILD"],
              ["24H", "FIXED PROPOSAL"],
              ["0", "CALLS, EVER"],
            ].map(([n, l]) => (
              <div key={l}>
                <p
                  className="text-[clamp(1.8rem,2vw,2.75rem)] leading-none text-strata-bone"
                  style={{ fontFamily: "var(--font-strata-display)", fontWeight: 700 }}
                >
                  {n}
                </p>
                <p className="st-mono-sm mt-2" style={{ color: "rgba(246,243,236,.55)" }}>
                  {l}
                </p>
              </div>
            ))}
            <PressJobSlot />
          </div>
        </div>

        {/* THE PROOF PULL layer — Tier-B swallow (paints nothing until geometry set) */}
        <BorePortal />

        {/* HANDOFF panel — pre-painted with the next band's exact surface */}
        <div
          data-bore-blend
          aria-hidden
          className="st-column-shallow absolute inset-0 z-30 hidden lg:block"
          style={{ transform: "translateY(101%)" }}
        />

        {/* THE REGISTRATION LINE — Act I's edge */}
        <div className="st-meridian mt-auto" />
      </div>
    </section>
  );
}
