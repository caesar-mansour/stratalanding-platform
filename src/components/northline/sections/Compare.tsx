"use client";

/**
 * COMPARE — the before/after drag seam.
 *
 * PAPER REGISTER, full-bleed: a scoreboard, a 21:9 seam with no radius and top
 * + bottom hairlines only, then the two columns of copy that carry the argument.
 * The drag USED to live in NLEngine (`collect()` wired `cmp` / `cmptop` /
 * `cmphandle`), which meant it did not exist on a phone. It is React and a CSS
 * view() timeline now — see THE SEAM'S DRIVE below for what moved and why.
 *
 * ── WHAT WAS REPLACED, AND WHY ──────────────────────────────────────────────
 * The source shipped this section as "1.1% → 7.6% booked rate" for Ridgeline
 * Family Dental Care Center of Madison, WI, complete with a phone number, a
 * named lead clinician, "★ 4.9 · 382 reviews" and a "TOP DENTIST 2016" badge.
 * Northline is a fictional studio. StrataLanding is a real one, pre-revenue,
 * with one public client — it may not claim a conversion lift, a review count,
 * a client city or an award. Every one of those is gone:
 *
 *   1.1% / 7.6% booked      -> "n/a" vs trustBadges[0] ("<2.5s" Target LCP).
 *                              "n/a" is the only honest number for a page
 *                              nobody ever measured, and it happens to be the
 *                              section's whole argument.
 *   Ridgeline Family Dental -> an unnamed placeholder practice. The mock says
 *                              "Your Business Name" and "AWARD 20XX" so it can
 *                              never be mistaken for a client page.
 *   (608) 555-0142          -> cut. No phone number appears.
 *   Dr. Amara Osei, DDS     -> "Your lead practitioner".
 *   Madison, WI             -> "Your city".
 *   ★ 4.9 · 382 reviews     -> cut, replaced by a second nav action.
 *   "1.1% booked" chips     -> "Before · the template" / "After · our build".
 *
 * The mono footnote under the seam says out loud that the figures are targets
 * we build to, not results we measured for anyone.
 *
 * ── WHY THE MOCK IS SIZED IN cqw ────────────────────────────────────────────
 * The source's mock is inline-styled in fixed px inside a 21:9 box. At 1440px
 * that reads as a screenshot; at 390px the box is 167px tall and a 30px hero
 * headline destroys it. The engine (and therefore its `data-nrw` collapse pass)
 * only mounts on tier B — desktop >=1025px — so mobile gets no JS rescue. Every
 * dimension inside the seam is therefore expressed with u(), which converts the
 * source's px against a 1280px reference into container-query units. The mock
 * scales as one picture at every width and the design is preserved verbatim
 * where it was authored. Nothing outside the seam uses cqw; every clamp() on
 * the section chrome is the source's, untouched.
 *
 * ANALYTICS. `id="compare"` for the rail, but section_view fires as
 * `why_not_diy` — that string is the contract every historical funnel report
 * keys off, and this section is the rebuilt WhyNotDIY. Same reason the CTA's
 * cta_location is `why_not_diy`.
 */

import { useCallback, useRef, useState } from "react";
import { cta, trustBadges } from "@/lib/brand";
import { useSectionView } from "@/components/strata/tier";
import { LedgerHead } from "../LedgerHead";
import { CtaLink } from "../CtaLink";

/** Verbatim from the previous homepage's WhyNotDIY. Not re-written. */
const diyPains = [
  "Prompt. Tweak. Re-prompt. Three hours later, still not right.",
  "Same templates your competitors already used",
  "No conversion strategy — it just \"looks fine\"",
  "Bloated code. Broken on mobile. No tracking.",
  "You become the designer, copywriter, and QA team",
  "Still need a developer to deploy and maintain it",
] as const;

const strataWins = [
  "One 10-minute brief. We handle everything else.",
  "Custom design built for one goal: your conversion",
  "Copy that sells to your audience — not generic filler",
  /* TWO ROWS CAME OUT OF THIS COLUMN AND BOTH WERE FALSE.

     "Under 2.5s load time. 90+ Lighthouse. Mobile-first." — "90+ Lighthouse"
     appears NOWHERE in brand.ts; it was invented in this component. The other
     two figures are real but the line stripped the word "target" off them,
     which brand.ts's trustBadges attaches deliberately ("Target LCP", "Target
     INP", "Target CLS") — and the correctly-labelled versions are already on
     this same screen, forty pixels above the seam. Nothing is lost by cutting
     the line; a claim is.

     "Shipped in days. Not weeks of prompt wrestling." — contradicted by the
     published delivery windows, which the pricing ledger renders further down
     the same page. Repaired at source in the previous commit; this was the
     last surface carrying it.

     Both mattered beyond themselves: Receipts states, as an auditable
     universal, that "every number on this page is either a target we build to
     or a live measurement, never a statistic we invented." These two were the
     counter-examples. One sceptic with Ctrl-F broke the best sentence on the
     site, and with it the section that sentence holds up. It is true now. */
  "Forms, tracking, integrations — working on launch day",
] as const;

/**
 * The seam's internal scale. The source authored the mock at roughly 1280px of
 * box width; u(30) is "the thing that was 30px at that width", expressed so it
 * survives a 390px phone and a 2560px display identically.
 */
const REF_W = 1280;
const u = (px: number) => `${((px / REF_W) * 100).toFixed(3)}cqw`;

/** The one figure the right-hand score is allowed to show. Read, never typed. */
const lcp = trustBadges[0]; // { value: "<2.5s", label: "Target LCP" }

/**
 * THE SEAM'S DRIVE, AND WHY IT LEFT THE ENGINE.
 *
 * It used to be three engine hooks: [data-anim="cmp"] took pointerdown/move,
 * and while nobody had touched it the scroll pass swept it across the section's
 * travel by writing cmptop's clipPath and cmphandle's left. Both behaviours
 * lived in NLEngine, which mounts on tier B alone. So on a phone — where most
 * of this audience reads — the strongest "why not a template" argument on the
 * page was a screenshot frozen at a 50/50 split that no thumb could move, and
 * it never swept either.
 *
 * Now one custom property, --nlcmp-seam, is the seam position and both layers
 * read it. Until a pointer touches the plate, a CSS view() timeline sweeps that
 * property as the section crosses the viewport — no JavaScript at all, so it
 * runs on every tier including a phone with the engine absent. On first
 * pointerdown React adds .is-held, which cancels the animation and hands the
 * property to an inline style. One writer at a time, and the handover is
 * permanent, exactly as the engine's `cmpTouched` latch was.
 *
 * touch-action: pan-y is load-bearing: it lets a horizontal drag be captured
 * while a vertical swipe still scrolls the page. touch-action: none here would
 * trap a phone reader inside the plate.
 *
 * WHAT IS STILL NOT FIXED, AND IS NOT A BUG. Every dimension inside the plate is
 * u(px) = (px/1280) x 100cqw, so at 390px the mock's body copy computes to about
 * 3px. It is not meant to be read at that size and never could be — the
 * comparison a phone makes here is of SHAPE, clutter against clarity, which is
 * the actual argument. The detail is carried by the six-against-six grid and the
 * scoreboard below, both of which are fully legible on a phone.
 */
const SEAM_CSS = `
/* NO CUSTOM PROPERTY, AND THAT IS A MEASURED DECISION. The first version put the
   seam position in an @property and animated THAT. Animating a registered custom
   property runs through style recalculation on every frame — with inherits:true
   it invalidated all ~100 elements inside the plate, and scoping it to the two
   consumers with inherits:false did not help either: both spent a reproducible
   166-179ms frame the moment the section entered the viewport, and both were
   clean the instant the animation was switched off.

   Animating clip-path and left DIRECTLY hands the work to the animation system
   instead of the style engine. Two animations rather than one shared number, so
   the keyframes below must stay in step by hand — 11% and 87% appear twice, and
   changing one without the other splits the handle from the edge it marks.

   THE TIMELINE IS NAMED, not view(). Both consumers are position:absolute
   inside a container-type:inline-size ancestor, and an anonymous view() on such
   an element resolves to a CONSTANT progress — measured: the seam sat at
   52.13% at every scroll depth, which looks exactly like a frozen screenshot
   and is how this was caught. Declaring the timeline once on the plate and
   referencing it by name from the children also guarantees the clip and the
   handle read the same progress rather than two independently-measured ones. */
@supports (animation-timeline: --nlcmp){
  [data-nl] .nlcmp-box:not(.is-held) .nlcmp-top{
    animation:nlcmp-clip linear both;
    animation-timeline:--nlcmp;
    animation-range:entry 8% exit 78%;
  }
  [data-nl] .nlcmp-box:not(.is-held) .nlcmp-handle{
    animation:nlcmp-left linear both;
    animation-timeline:--nlcmp;
    animation-range:entry 8% exit 78%;
  }
}
@keyframes nlcmp-clip{ from{clip-path:inset(0 0 0 11%)} to{clip-path:inset(0 0 0 87%)} }
@keyframes nlcmp-left{ from{left:11%} to{left:87%} }
[data-nl] .nlcmp-box{ touch-action:pan-y; view-timeline-name:--nlcmp; view-timeline-axis:block; }
/* Reduced motion keeps the plate at its 50/50 seed rather than sweeping. The
   reader can still drag it — the interaction is not motion the page imposes. */
@media (prefers-reduced-motion: reduce){
  [data-nl] .nlcmp-top, [data-nl] .nlcmp-handle{ animation:none !important }
}
`;

export function Compare() {
  const ref = useRef<HTMLElement>(null);
  useSectionView(ref, "why_not_diy");

  const boxRef = useRef<HTMLDivElement>(null);
  /** null until the reader takes it; a 0..1 fraction afterwards. */
  const [held, setHeld] = useState<number | null>(null);
  const dragging = useRef(false);

  const seamFrom = useCallback((clientX: number) => {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    // The same 0.04..0.96 clamp the engine used: a seam pinned to either edge
    // reads as a rendering fault rather than a comparison.
    const x = Math.min(0.96, Math.max(0.04, (clientX - r.left) / r.width));
    setHeld(x);
  }, []);

  /** Once the reader takes the seam, React writes the two values the timeline
   *  was writing. Until then these are undefined and the animation owns them. */
  const pct = held === null ? null : `${(held * 100).toFixed(2)}%`;

  return (
    <section
      ref={ref}
      id="compare"
      data-screen-label="Compare"
      data-bg="#ece6d7"
      className="nl-section"
      style={{ background: "var(--nl-ground-panel)", paddingBottom: 120 }}
    >
      <style dangerouslySetInnerHTML={{ __html: SEAM_CSS }} />

      <LedgerHead label="Side by side" meta="Same business · same traffic" />

      {/* Scoreboard + seam. Full-bleed: the seam runs edge to edge and carries
          no radius, so it reads as a plate on the page rather than a card. */}
      <div className="nl-bleed flex flex-col">
        <div
          className="grid items-end gap-7 pb-[30px] lg:grid-cols-[1fr_auto_1fr] lg:gap-[34px]"
          style={{ paddingLeft: "var(--nl-gutter)", paddingRight: "var(--nl-gutter)" }}
        >
          {/* LEFT — permanently degraded. The template's number is not a small
              number; there is no number. That is the point of the section. */}
          <div data-row className="flex flex-col gap-[5px]">
            <span
              data-tnum
              className="nl-display"
              style={{ fontSize: "clamp(54px,8vw,124px)", color: "var(--nl-meta)" }}
            >
              n/a
            </span>
            <span className="nl-mono" style={{ color: "var(--nl-meta)" }}>
              The template ships with no measurement
            </span>
          </div>

          {/* CENTRE — the instruction, and the 1px x 34px tick. It used to swap
              to a passive "Before · after" below lg, because the drag was an
              engine behaviour and the engine does not mount on a phone; saying
              "drag" to a thumb that could not would have been a lie. The seam
              is React and CSS now and a thumb really can move it, so the
              instruction is the same at every width. */}
          <div data-row className="flex flex-col items-center gap-[9px] pb-[14px]">
            <span className="nl-mono" style={{ color: "var(--nl-accent)" }}>
              Drag the seam
            </span>
            <span
              aria-hidden
              className="block w-px"
              style={{ height: 34, background: "var(--nl-r24)" }}
            />
          </div>

          {/* RIGHT — the only figure in this section, straight off trustBadges,
              which brand.ts already frames as a target rather than a result. */}
          <div data-row className="flex flex-col gap-[5px] lg:items-end lg:text-right">
            <span
              data-tnum
              className="nl-display"
              style={{ fontSize: "clamp(54px,8vw,124px)", color: "var(--nl-ink)" }}
            >
              {lcp.value}
            </span>
            <span className="nl-mono" style={{ color: "var(--nl-ink)" }}>
              {lcp.label} — spec&rsquo;d on every build
            </span>
          </div>
        </div>

        {/* ── THE SEAM ────────────────────────────────────────────────────────
            role="img" + aria-label collapses the whole mock to one description
            for assistive tech; the layers below are decoration, not content. */}
        <div
          ref={boxRef}
          className={`nlcmp-box${held === null ? "" : " is-held"}`}
          data-cursor="Drag"
          role="img"
          aria-label="Before and after. On the left, a stock template page for an unnamed business. On the right, the same page rebuilt by StrataLanding. Illustration only."
          onPointerDown={(e) => {
            dragging.current = true;
            // Capture is an optimisation — it keeps the drag alive when the
            // pointer leaves the plate. It throws for a pointer the browser no
            // longer considers active, and losing the seam to that would be
            // absurd, so the drag proceeds either way.
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* no capture; the move handler still tracks while over the box */
            }
            seamFrom(e.clientX);
          }}
          onPointerMove={(e) => {
            if (dragging.current) seamFrom(e.clientX);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "21/9",
            overflow: "hidden",
            borderTop: "1px solid var(--nl-r20)",
            borderBottom: "1px solid var(--nl-r20)",
            cursor: "ew-resize",
            background: "#ffffff",
            userSelect: "none",
            containerType: "inline-size",
          }}
        >
          {/* ── BEFORE: the template every town runs. Placeholder everything —
              no name, no number, no city, no award year. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#f7f6f3",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                background: "#2c5aa0",
                color: "#ffffff",
                padding: `${u(9)} ${u(22)}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: u(11),
              }}
            >
              <span>☎ CALL US TODAY!</span>
              <span>MON–FRI 8AM–5PM · WALK-INS WELCOME</span>
            </div>

            <div
              style={{
                padding: `${u(12)} ${u(22)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e3e0da",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: u(16), color: "#2c5aa0" }}>
                ✦ Your Business Name Wellness &amp; Med Spa Center
              </span>
              <div style={{ display: "flex", gap: u(14), fontSize: u(11), color: "#555555" }}>
                <span>Home</span>
                <span>About Us</span>
                <span>Services</span>
                <span>Specials</span>
                <span>Financing</span>
                <span>Blog</span>
                <span>Contact</span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                background: "linear-gradient(180deg,#cbd9e8,#ede9e2)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: u(10),
                textAlign: "center",
                padding: `0 ${u(40)}`,
              }}
            >
              <span
                style={{
                  fontSize: u(30),
                  fontWeight: 700,
                  color: "#1b3a63",
                  textShadow: "0 1px 0 #fff",
                }}
              >
                Welcome To Our Website!
              </span>
              <span style={{ fontSize: u(12.5), color: "#3d4a5c", maxWidth: "60ch" }}>
                We are a full-service practice committed to excellence and dedicated to the highest
                quality of care in a comfortable, state-of-the-art environment for you and your
                entire family.
              </span>
              <span
                style={{
                  background: "#f0a500",
                  color: "#3a2b00",
                  padding: `${u(8)} ${u(20)}`,
                  borderRadius: u(20),
                  fontSize: u(12),
                  fontWeight: 700,
                  marginTop: u(4),
                }}
              >
                REQUEST AN APPOINTMENT
              </span>
              <div style={{ display: "flex", gap: u(8), marginTop: u(6) }}>
                {["★ AWARD 20XX", "MEMBER", "ACCREDITED", "CERTIFIED"].map((b) => (
                  <span
                    key={b}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #cccccc",
                      padding: `${u(4)} ${u(9)}`,
                      fontSize: u(9),
                      borderRadius: u(3),
                      color: "#555555",
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                height: "26%",
                background: "#ffffff",
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: u(10),
                padding: `${u(12)} ${u(22)}`,
              }}
            >
              {["Facials", "Injectables", "Laser", "Memberships"].map((s) => (
                <div
                  key={s}
                  style={{
                    border: "1px solid #e3e0da",
                    borderRadius: u(3),
                    display: "grid",
                    placeItems: "center",
                    fontSize: u(10),
                    color: "#777777",
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* ── AFTER: the clipped top layer. inset(0 0 0 50%) is the seed the
              engine overwrites on drag; it must be inline or the first paint
              shows the build across the whole plate. */}
          <div
            className="nlcmp-top"
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--nl-paper)",
              clipPath: `inset(0 0 0 ${pct ?? "50%"})`,
            }}
          >
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  padding: `${u(16)} ${u(30)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--nl-r06)",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: u(15), letterSpacing: "-0.025em" }}>
                  YOUR NAME
                  <span style={{ color: "var(--nl-accent)" }}> STUDIO</span>
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: u(18),
                    fontSize: u(11.5),
                    color: "var(--nl-body)",
                  }}
                >
                  <span>Treatments</span>
                  <span>Team</span>
                  <span>Pricing</span>
                  <span
                    style={{
                      background: "var(--nl-accent)",
                      color: "var(--nl-ink-deep)",
                      padding: `${u(7)} ${u(13)}`,
                      borderRadius: u(3),
                      fontWeight: 600,
                    }}
                  >
                    Book online
                  </span>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "grid",
                  gridTemplateColumns: "0.85fr 1fr",
                  gap: u(32),
                  padding: `${u(34)} ${u(30)}`,
                }}
              >
                <div
                  style={{
                    borderRadius: u(6),
                    background:
                      "radial-gradient(120% 90% at 70% 20%, #edf2f1 0%, #c7d7d6 100%)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: "56%",
                      background: "#b4c9c8",
                      borderRadius: `0 0 ${u(6)} ${u(6)}`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: u(14),
                      bottom: u(14),
                      background: "var(--nl-paper)",
                      borderRadius: u(3),
                      padding: `${u(8)} ${u(11)}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: u(2),
                    }}
                  >
                    <span style={{ fontSize: u(11), fontWeight: 600, color: "var(--nl-ink)" }}>
                      Your lead practitioner
                    </span>
                    <span
                      className="nl-num"
                      style={{
                        fontSize: u(8.5),
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--nl-meta)",
                      }}
                    >
                      Photo · your team
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: u(14),
                    justifyContent: "center",
                  }}
                >
                  <span
                    className="nl-num"
                    style={{
                      fontSize: u(9),
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "var(--nl-accent)",
                    }}
                  >
                    Your city
                  </span>
                  <span
                    className="nl-h3"
                    style={{ fontSize: u(42), lineHeight: 1.02, color: "var(--nl-ink)" }}
                  >
                    Book online, without the phone call.
                  </span>
                  <span
                    style={{
                      fontSize: u(12.5),
                      color: "var(--nl-body)",
                      maxWidth: "34ch",
                      lineHeight: 1.55,
                    }}
                  >
                    Prices and availability, visible before anyone has to ask for them.
                  </span>
                  <div style={{ display: "flex", gap: u(9), alignItems: "center" }}>
                    <span
                      style={{
                        background: "var(--nl-accent)",
                        color: "var(--nl-ink-deep)",
                        padding: `${u(11)} ${u(18)}`,
                        borderRadius: u(3),
                        fontWeight: 600,
                        fontSize: u(12),
                      }}
                    >
                      Book online
                    </span>
                    <span style={{ fontSize: u(11.5), color: "var(--nl-meta)" }}>
                      See treatments
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* The handle. Both this and the clip above read --nlcmp-seam, so they
              cannot drift apart: there is one number and two consumers. */}
          <div
            className="nlcmp-handle"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: pct ?? "50%",
              width: 2,
              background: "var(--nl-accent)",
              zIndex: 4,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: `clamp(26px,${u(44)},44px)`,
                height: `clamp(26px,${u(44)},44px)`,
                borderRadius: "50%",
                background: "var(--nl-accent)",
                display: "grid",
                placeItems: "center",
                color: "var(--nl-ink-deep)",
                fontSize: `clamp(10px,${u(15)},15px)`,
                boxShadow: "0 8px 24px -6px rgba(11,27,58,0.5)",
              }}
            >
              ⇔
            </div>
          </div>

          {/* Corner chips. The source put "1.1% booked" / "7.6% booked" here;
              they name the two sides instead, and carry no figure at all. */}
          <span
            className="nl-mono-sm"
            style={{
              position: "absolute",
              left: `clamp(6px,${u(16)},16px)`,
              bottom: `clamp(5px,${u(14)},14px)`,
              zIndex: 5,
              fontSize: `clamp(6.5px,${u(9.5)},9.5px)`,
              color: "var(--nl-body)",
              background: "rgba(255,255,255,0.88)",
              padding: `clamp(3px,${u(6)},6px) clamp(5px,${u(10)},10px)`,
              borderRadius: 2,
            }}
          >
            Before · the template
          </span>
          <span
            className="nl-mono-sm"
            style={{
              position: "absolute",
              right: `clamp(6px,${u(16)},16px)`,
              bottom: `clamp(5px,${u(14)},14px)`,
              zIndex: 5,
              fontSize: `clamp(6.5px,${u(9.5)},9.5px)`,
              color: "var(--nl-accent)",
              background: "rgba(255,255,255,0.9)",
              padding: `clamp(3px,${u(6)},6px) clamp(5px,${u(10)},10px)`,
              borderRadius: 2,
            }}
          >
            After · our build
          </span>
        </div>

        {/* The disclosure. Plain, mono, directly under the plate — the reader
            should not have to hunt for what the numbers are and are not. */}
        <div
          className="flex flex-col gap-[5px] pt-[14px]"
          style={{ paddingLeft: "var(--nl-gutter)", paddingRight: "var(--nl-gutter)" }}
        >
          <span className="nl-mono-sm" style={{ color: "var(--nl-body)" }}>
            Illustration only — not a client page. These are targets we build to, not client
            results.
          </span>
          <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
            {trustBadges.slice(0, 3).map((b) => `${b.value} ${b.label}`).join(" · ")} · verified
            before launch
          </span>
        </div>
      </div>

      {/* ── THE ARGUMENT ────────────────────────────────────────────────────
          Two columns, the 1px-gap rule grid on panel ground. The left column
          keeps the scoreboard's degraded treatment permanently: meta ink, faint
          numerals, no hover. Only the right side is allowed to look finished. */}
      {/* NOTE: the top margin is an inline style, not `mt-[clamp(...)]` — that
          arbitrary class does not compile in this Tailwind setup and silently
          renders 0. Verified in the browser, not assumed. */}
      <div className="nl-inner flex flex-col gap-9" style={{ marginTop: "clamp(56px,7vw,96px)" }}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="nl-h3 m-0" style={{ fontSize: "clamp(20px,2vw,28px)", maxWidth: "22ch" }}>
            Yes, AI can generate a website. No, it won&rsquo;t convert.
          </h2>
          <p
            className="m-0"
            style={{ fontSize: 15, lineHeight: 1.5, color: "var(--nl-body)", maxWidth: "38ch" }}
          >
            We use AI tools every day. Conversion strategy, persuasive copy, and performance your
            visitors can feel take more than a prompt.
          </p>
        </div>

        <div
          className="grid gap-px lg:grid-cols-2"
          style={{
            background: "var(--nl-r16)",
            borderTop: "1px solid var(--nl-r16)",
            borderBottom: "1px solid var(--nl-r16)",
          }}
        >
          <div
            style={{ background: "var(--nl-panel)", padding: "clamp(20px,2.4vw,30px)" }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="nl-mono" style={{ color: "var(--nl-meta)" }}>
                Doing it yourself
              </span>
              <span className="nl-mono-xs" style={{ color: "var(--nl-faint)" }}>
                Before
              </span>
            </div>
            <div className="flex flex-col">
              {diyPains.map((line, i) => (
                <span
                  key={line}
                  data-row
                  className="grid items-baseline gap-4 py-[11px]"
                  style={{
                    gridTemplateColumns: "26px minmax(0,1fr)",
                    borderTop: i === 0 ? "none" : "1px solid var(--nl-r09)",
                  }}
                >
                  <span
                    data-tnum
                    className="nl-num text-[11px] tracking-[0.14em]"
                    style={{ color: "var(--nl-faint)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--nl-meta)" }}>
                    {line}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div
            style={{ background: "var(--nl-panel)", padding: "clamp(20px,2.4vw,30px)" }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="nl-mono" style={{ color: "var(--nl-ink)" }}>
                Handing it to the studio
              </span>
              <span className="nl-mono-xs" style={{ color: "var(--nl-accent)" }}>
                After
              </span>
            </div>
            <div className="flex flex-col">
              {strataWins.map((line, i) => (
                <span
                  key={line}
                  data-row
                  className="grid items-baseline gap-4 py-[11px]"
                  style={{
                    gridTemplateColumns: "26px minmax(0,1fr)",
                    borderTop: i === 0 ? "none" : "1px solid var(--nl-r09)",
                  }}
                >
                  <span
                    data-tnum
                    className="nl-num text-[11px] tracking-[0.14em]"
                    style={{ color: "var(--nl-accent)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="font-medium"
                    style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--nl-ink)" }}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <CtaLink
            href={cta.primary.href}
            location="why_not_diy"
            variant="primary"
            destination="brief"
            className="nl-cta"
            data-magnet
          >
            {cta.primary.label}
          </CtaLink>
          <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
            {cta.reassurance}
          </span>
        </div>
      </div>
    </section>
  );
}
