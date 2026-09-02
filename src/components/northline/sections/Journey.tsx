"use client";

/**
 * THE OPENING FILM — `#what-we-build`, the page's biggest scene.
 *
 * 760vh of authored timeline (the engine rewrites the height from scrollPace in
 * collect(), so 760 is what the markup declares and ~456vh is what you scroll).
 * Four acts, one continuous browser frame: Presence -> Lead -> Purchase ->
 * Portal, which is exactly StrataLanding's three pages plus the client portal.
 *
 * ═══ THE ENGINE CONTRACT (journey(p, covers), NLEngine.ts ~line 838) ════════
 * Every key below is read from `this.n[key]`, filled by collect() from
 * [data-anim="key"]. `this.n[key]` is ALWAYS an array; where the engine indexes
 * children or reads a data-attribute, that shape is load-bearing.
 *
 *   jstick      the scene ground. Engine lerps its background bone -> navy over
 *               the flip (p .575-.635) and back at the dock (p .775-.83).
 *   grid        blueprint layer. opacity 1-tone*0.55, translateY(-p*90).
 *   ghostwrap   the ghost-word well. The engine never reads it; it exists so the
 *               four words share one centred stacking context. Kept because the
 *               port is mechanical.
 *   ghost       four huge act names. band() windows via data-in/data-out.
 *   stageWrap   THE ONE BROWSER FRAME. applyFrame() writes it every frame:
 *               `(this.n.stageWrap && this.n.stageWrap[0]) || [data-oneframe]`.
 *               position:fixed 1060x662 at margin:-331px 0 0 -530px from 50%/50%
 *               — those five numbers ARE the registration; fit() scales against
 *               1060/662 and the dock target divides by 1060.
 *   content     the frame's page area. Two jobs: the flip crossfades its
 *               background white -> navy mid-turn, and the scale-through
 *               measures s1cta AGAINST it (`cr.width / 1060` is the projection
 *               the button rect was measured in). Must span the frame's full
 *               width or the clip-path inset is skewed.
 *   url         chrome-bar URL. The ENGINE owns this string, not the markup.
 *   s1 / s1scroll / s1cta   the presence page, its scrolling body, its CTA.
 *   s2 + s2bar/s2opt/s2day/s2time/s2submit/s2a/s2b/s2c/sum1-3/type1-2/holdclock
 *               the lead page and its three steps.
 *   flip        the 3D turntable. rotateY 0 -> -180deg over p .575-.645.
 *   s3 + s3pay/s3paid/type3-5   the purchase page, on the BACK face.
 *   portalLayer/dockhint/count/jbar/ev/s4chat   the portal the frame docks into.
 *   cap / ann / anntext   captions and callouts, band() windows.
 *   scrollcue   a bar the engine slides translateX(sin(t)*60+62) — needs a track
 *               at least 192px wide or it walks out of its own box.
 *
 * ═══ THE THREE TRANSITIONS THAT MUST NOT BREAK ══════════════════════════════
 * 1. SCALE-THROUGH (p .335-.405, eq easing). Act 2 grows out of the EXACT
 *    measured rect of act 1's CTA: the engine caches
 *    `s1cta.getBoundingClientRect()` relative to `content` and writes a clip-path
 *    inset on s2 from it. So s1cta must be a real laid-out box inside content,
 *    and content must be content's full width. Nothing else about those two
 *    elements may move.
 * 2. 3D PAGE FLIP (p .575-.645). `flip` carries transform-style:preserve-3d,
 *    s2 is the front face and s3 the back (rotateY(180deg) + backface-visibility
 *    hidden). The engine writes flip's transform and both faces' visibility.
 * 3. DOCK (p .795-.875). The frame shrinks into the portal's "live pages" cell.
 *    The maths is verified and MUST be reproduced by this markup:
 *      portal 1180x700 · sidebar 190 · main padding 28 · header row 40 · gap 16
 *      · cell 459 wide / 287 tall
 *    which puts the cell's centre at (447.5, 227.5) in a 1180x700 box whose
 *    centre is (590, 350) — i.e. the engine's dX = -142.5*pscale*dockT and
 *    dY = -122.5*pscale*dockT. Change any one of those six numbers and the
 *    frame lands somewhere the cell is not.
 *
 * ═══ WHAT THIS BUILD DOES NOT EMIT, AND WHY ════════════════════════════════
 *   hero      Hero.tsx already carries data-anim="hero" (it is a document
 *             section here, not a layer inside the stage). The engine reads
 *             n.hero[0], so a second one would be inert and confusing.
 *   s5        the audit form is Start.tsx's, and this port's engine never calls
 *             framePage('audit') because nothing renders [data-startbay].
 *
 * AND ONE THING THAT HAD TO BE FIXED ELSEWHERE FIRST. `railitem` is the film's
 * four-entry act rail (data-a/data-b windows). NLRoot.tsx was using that same
 * key for the page-wide ELEVEN-entry right rail, which shell() drives from
 * `[data-rail]` — a hook nothing emitted. The moment this stage existed,
 * journey() wrote all eleven of NLRoot's entries every frame with NaN windows:
 * opacity pinned at 0.3 and each label span turned into a 22px grey bar down
 * the right edge. NLRoot now carries `data-rail`/`data-railline`, which both
 * removes the collision and lights a rail that had never worked.
 *
 * ═══ HONESTY — the heaviest load on the page ════════════════════════════════
 * The source renders a complete fictional dental practice with invented revenue.
 * Northline is a fictional studio; StrataLanding is real, new, and has two public
 * clients. A demo may show a sample business — that is what a demo IS — but it
 * must be unmissably labelled and the studio may claim nothing.
 *
 * REMOVED, and what replaced it:
 *   "Ridgeline Dental", "Dr. Amara Osei, DDS", "Madison, WI", "418 State St",
 *   "(608) 555-0142", "6 min from the Capitol"
 *     -> a labelled sample studio ("Meridian Skin"), a role instead of a person,
 *        no address, no phone number, a placeholder map.
 *   "★★★★★ 4.9 · 382 Google reviews", "In network with Delta Dental",
 *   "6 insurers", "$129 cleanings", "from $89/mo", "14 years in Madison"
 *     -> non-numeric trust: posted prices, evening hours, one-tap reschedule.
 *   "Deposits cut no-shows by 71%", "-71% no-shows", "+38% completion",
 *   "0.9s to first paint"
 *     -> the three scene callouts now state DESIGN PRINCIPLES, not results.
 *        The studio has measured none of those numbers.
 *   "Visitors 4,182 / Leads 317 / Booked value $118,400 ▲214%",
 *   "Cost per booked chair $41 ▼63%"
 *     -> the portal is OUR product, so no money and no lift claim lives in it.
 *        Two structural counts (pages live, events tracked), one sample-labelled
 *        completions chart, and an attribution cell that states how the tracking
 *        works rather than what it produced.
 *   "stripe · ch_3Qr…", "Dentrix · appt #48120", "Confirmation NL-48120"
 *     -> generic event names off the same schema Spine.tsx publishes, a calendar
 *        sync instead of a named practice-management system, sample confirmation.
 *   "Northline · 2m ago" portal chat about a filled Friday
 *     -> an async message about a draft in Files. There are no calls here.
 * The chrome-bar URL is written by the ENGINE, so the fabricated domains
 * (ridgelinedental.com, portal.northline.studio) were fixed in
 * scripts/northline/port-engine.cjs and point at the RFC 2606 reserved
 * `sample-client.example` and at stratalanding.com/portal.
 *
 * ═══ MOBILE ════════════════════════════════════════════════════════════════
 * nl.css unpins the stage below 1040px / coarse pointer / reduced motion, and
 * NLRoot never mounts the engine there. A fixed 1060px browser frame and five
 * absolutely-positioned cinema layers would be a disaster in that state, so —
 * exactly as Spine.tsx and Portal.tsx do — the cinema is hidden at the SAME
 * breakpoint and replaced by .nl-journey-fallback: the four acts as a ruled
 * list, with the same headline and the same caption. Same content, no
 * choreography, no empty box, no horizontal overflow.
 *
 * ═══ ANALYTICS ═════════════════════════════════════════════════════════════
 * section_view "what_we_build". The strip under the film is the one real
 * control in the scene. THE PICKER MOVED OUT — it was the same four-cell
 * radiogroup the assay renders, off the same `goalRouter`, through the same
 * handler, into the same sessionStorage key, sixty-three viewports apart. The
 * assay keeps it: that copy ANSWERS the question with a named tier and carries
 * two CTAs, and it sits immediately before the ledger. This one asked and
 * navigated nowhere. What remains here is the film's exit, which
 * visitor is never asked the same question twice. Labels come from brand.ts
 * `goalRouter`, so the four values stay exactly calls|emails|sales|quotes.
 */

import { useRef } from "react";
import { handoffs, pricing } from "@/lib/brand";
import { Handoff } from "../Handoff";

/** The top tier, by VALUE — the sample build in the film is a full funnel, and
 *  its event count must be the one that tier actually ships. */
const TOP_TIER = pricing.reduce((a, b) =>
  Number(b.price.replace(/[^0-9.]/g, "")) > Number(a.price.replace(/[^0-9.]/g, "")) ? b : a
);
import { useSectionView } from "@/components/strata/tier";
import { Stage } from "../Stage";

/* The mock's client brand. The port script deliberately does NOT remap teal:
   it is the sample client's colour and must stay foreign to our chrome, or the
   mockups stop reading as somebody else's website. */
const TEAL = "#0E6B7A";
const TEAL_DEEP = "#0B3E47";
/* The ported greys — the same values the engine writes, so markup and engine
   never disagree mid-frame. */
const GREY = "#6b7a92";
const GREY_D = "#5a6a85";
const INK = "#071022";
const PAPER = "#fbf9f4";
const GREEN = "#1f7a4d";
const HAIR = (a: number) => `rgba(11,27,58,${a})`;

const mono = (size: number, track = 0.16) => ({
  fontFamily: "var(--font-nl-mono), ui-monospace, monospace",
  fontSize: size,
  letterSpacing: `${track}em`,
  textTransform: "uppercase" as const,
});

/** The four acts, in one place: ghost word, caption window, fallback copy. */
const ACTS = [
  {
    n: "01",
    word: "PRESENCE",
    ghostIn: "0.15",
    ghostOut: "0.345",
    capIn: "0.16",
    capOut: "0.335",
    head: "Be worth trusting in eight seconds.",
    cap: "Eight seconds of patience. The presence page spends them well.",
  },
  {
    n: "02",
    word: "LEAD",
    ghostIn: "0.375",
    ghostOut: "0.575",
    capIn: "0.40",
    capOut: "0.565",
    head: "Turn attention into a name and a number.",
    cap: "One question at a time. Three taps, no form that feels like a form.",
  },
  {
    n: "03",
    word: "PURCHASE",
    ghostIn: "0.62",
    ghostOut: "0.775",
    capIn: "0.63",
    capOut: "0.775",
    head: "Ask for money while they still mean it.",
    cap: "Money asked at the peak of intent — before the tab closes.",
  },
  {
    n: "04",
    word: "PORTAL",
    ghostIn: "0.86",
    ghostOut: "1.02",
    capIn: "0.87",
    capOut: "1.02",
    head: "The whole session docks into your portal.",
    cap: "And the whole session docks into your portal — attributed, timestamped, yours.",
  },
] as const;

/* The three scene callouts. The source shipped three invented statistics here
   (0.9s to first paint, +38% completion, -71% no-shows) IN THE STUDIO'S OWN
   VOICE. These state the design decision instead — no measurement, nothing to
   disprove, and the argument is stronger for being a principle. */
const CALLOUTS = [
  {
    in: "0.20",
    out: "0.325",
    top: "24%",
    key: "Built by hand",
    text: "No page builder underneath. Nothing to slow it down later.",
  },
  {
    /* THE ONE THAT MOVES. The camera pushes the frame to camX +110 across
       exactly this window, while callouts are pinned right:38 — so at 1440x900
       about 110px of this one's 205px width sat behind the opaque frame for its
       whole life. Measured: box x1207 w205 against a frame right edge of
       1315-1323. Callouts 1 and 3 clear the frame because the camera is not
       pushed during their windows.
       It is faithful to the source's geometry and it is still wrong to ship
       half a sentence, so this one — and only this one — reads down the LEFT
       gutter, into the space the camera push opens up. */
    in: "0.44",
    out: "0.555",
    top: "28%",
    side: "left" as const,
    key: "One question at a time",
    text: "Every field you remove is a visitor who finishes.",
  },
  {
    in: "0.66",
    out: "0.765",
    top: "26%",
    key: "Paid at peak intent",
    text: "A deposit is the cheapest filter there is.",
  },
] as const;

/** The 9-bar chart. `data-h` is the height the engine animates to, in percent. */
const BARS = [16, 22, 19, 34, 30, 48, 61, 78, 100];

export function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  useSectionView(ref, "what_we_build");

  return (
    <div ref={ref}>
      <Stage name="journey" height={760} id="what-we-build" label="What we build">
        {/* THE SCENE GROUND. The engine lerps this background bone -> navy across
            the flip and back for the dock, which is what makes four acts read as
            one continuous film rather than four sections. */}
        <div
          data-anim="jstick"
          data-cursor="Watch"
          className="relative h-full w-full overflow-hidden"
          style={{ background: "#f6f3ec" }}
        >
          {/* Blueprint. inset:-10% so the engine's translateY(-p*90) never
              exposes an edge. */}
          <div
            data-anim="grid"
            aria-hidden
            className="nl-journey-cinema nl-blueprint absolute"
            style={{ inset: "-10%" }}
          />

          {/* GHOST WORDS. One centred well, four absolutely-stacked words; the
              engine cross-fades them on band() windows and slides the whole set
              with the scroll. */}
          <div
            aria-hidden
            className="nl-journey-cinema pointer-events-none absolute inset-0 grid place-items-center overflow-hidden"
          >
            <div data-anim="ghostwrap" className="relative grid w-full place-items-center">
              {ACTS.map((a) => (
                <span
                  key={a.word}
                  data-anim="ghost"
                  data-in={a.ghostIn}
                  data-out={a.ghostOut}
                  className="absolute whitespace-nowrap"
                  style={{
                    fontFamily: "var(--font-heading), system-ui, sans-serif",
                    fontSize: "clamp(90px,15vw,240px)",
                    fontWeight: 800,
                    letterSpacing: "-0.06em",
                    color:
                      a.word === "PURCHASE" ? "rgba(251,249,244,0.07)" : "rgba(11,27,58,0.055)",
                  }}
                >
                  {a.word}
                </span>
              ))}
            </div>
          </div>

          {/* THE OPENING BEAT — and the one place this port had to add markup
              the source does not have.

              In the source the hero lives INSIDE this stage, so p 0 → 0.145 is
              spent reading the headline while the frame rises behind it. Here
              Hero.tsx is a document section above the stage, so those first
              14% — 1.7 viewports at the shipped pace — were a blank white
              browser window climbing an empty screen. s1 does not switch on
              until p 0.14 and that timing is the engine's, not mine.

              It rides `cap`, which is already a writer on this element type, so
              no new engine hook and no second writer: band() reads data-in="0"
              as "on from the first frame" and fades it out over 0.125 → 0.16,
              which is exactly when the presence page paints in. aria-hidden
              because the fallback below carries this claim as the real heading;
              two identical h2s would be a duplicate, not a description. */}
          <div
            data-anim="cap"
            data-in="0"
            data-out="0.16"
            aria-hidden
            className="nl-journey-cinema absolute z-[11]"
            style={{
              left: "var(--nl-gutter)",
              right: "var(--nl-gutter)",
              top: "clamp(96px,13vh,150px)",
            }}
          >
            <div className="nl-inner">
              <span className="nl-mono block" style={{ color: "var(--nl-accent)" }}>
                What we build
              </span>
              <span
                className="nl-h2 mt-4 block"
                style={{ fontSize: "clamp(30px,3.6vw,54px)", maxWidth: "18ch" }}
              >
                Three pages, one portal, one continuous path.
              </span>
              <span
                className="mt-4 block text-[16px] leading-[1.5]"
                style={{ color: "var(--nl-body)", maxWidth: "44ch" }}
              >
                Keep scrolling — the page gets built in front of you.
              </span>
            </div>
          </div>

          {/* ═══ THE PORTAL THE FRAME DOCKS INTO ═══════════════════════════════
              1180x700 · sidebar 190 · padding 28 · header 40 · gap 16 · cell
              459x287. Every one of those numbers is load-bearing: they are what
              put the "live pages" cell centre at (-142.5, -122.5) from the
              portal centre, which is exactly the offset the dock animates to.
              Positioned with explicit 50%/-half-size margins rather than relying
              on the grid's static position, so it registers against the same
              viewport centre the fixed frame uses. */}
          <div
            data-anim="portalLayer"
            /* A drawing of a dashboard. Everything it says is placeholder data
               for a sample project, so it is decoration to a screen reader —
               the fallback list above carries this act's actual argument. */
            aria-hidden
            className="nl-journey-cinema"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 1180,
              height: 700,
              margin: "-350px 0 0 -590px",
              borderRadius: 10,
              background: "var(--nl-paper-2)",
              border: `1px solid ${HAIR(0.12)}`,
              boxShadow: "0 70px 130px -50px rgba(11,27,58,0.45)",
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "190px 1fr",
            }}
          >
            {/* sidebar */}
            <div
              style={{
                background: INK,
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              <span
                style={{
                  color: PAPER,
                  fontFamily: "var(--font-heading), system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: "-0.03em",
                }}
              >
                STRATALANDING
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {["Overview", "Milestones", "Messages", "Files", "Billing", "Settings"].map(
                  (r, i) => (
                    <span
                      key={r}
                      style={{
                        color: i === 0 ? PAPER : GREY,
                        background: i === 0 ? "rgba(251,249,244,0.1)" : "transparent",
                        borderRadius: 3,
                        padding: "9px 11px",
                        fontSize: 12.5,
                        fontWeight: i === 0 ? 600 : 400,
                      }}
                    >
                      {r}
                    </span>
                  )
                )}
              </div>
              <div
                style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 9 }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: TEAL,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  MS
                </span>
                <span style={{ color: GREY, fontSize: 11 }}>Sample project</span>
              </div>
            </div>

            {/* main */}
            <div
              style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  height: 40,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ ...mono(9.5, 0.18), color: GREY }}>
                    Sample data · illustrative only
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-heading), system-ui, sans-serif",
                      fontSize: 23,
                      letterSpacing: "-0.035em",
                      fontWeight: 700,
                    }}
                  >
                    Meridian Skin — sample project
                  </span>
                </div>
                <span
                  style={{
                    ...mono(9.5, 0.14),
                    color: GREEN,
                    border: "1px solid rgba(31,122,77,0.3)",
                    borderRadius: 2,
                    padding: "5px 9px",
                  }}
                >
                  Sample account
                </span>
              </div>

              {/* THE DOCK ROW. 459px cell, 287px tall. Do not touch. */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "459px 1fr",
                  gap: 16,
                  height: 287,
                }}
              >
                <div
                  style={{
                    border: `1px dashed ${HAIR(0.2)}`,
                    borderRadius: 6,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <span data-anim="dockhint" style={{ ...mono(10), color: GREY }}>
                    Live pages
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      flex: "0 0 84px",
                    }}
                  >
                    {/* Structural facts about the sample build, not results.
                        The event count used to be a literal 7, which matches no
                        tier — brand.ts sells 1 / 4 / 6. It reads the top tier's
                        own figure now, the same source Spine.tsx reads, so the
                        two cannot disagree and neither can drift from what is
                        actually sold. */}
                    {[
                      { label: "Pages live", to: "3" },
                      { label: "Funnel events", to: String(TOP_TIER.deliverables.trackedEvents) },
                    ].map((c) => (
                      <div
                        key={c.label}
                        style={{
                          background: "#fff",
                          border: `1px solid ${HAIR(0.09)}`,
                          borderRadius: 5,
                          padding: "12px 15px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          gap: 3,
                        }}
                      >
                        <span style={{ ...mono(9), color: GREY }}>{c.label}</span>
                        <span
                          data-anim="count"
                          data-to={c.to}
                          data-tnum
                          className="nl-num"
                          style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.035em" }}
                        >
                          {c.to}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: INK,
                      borderRadius: 5,
                      padding: "13px 16px 11px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 7,
                      minHeight: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ ...mono(9), color: GREY }}>
                        Form completions · sample data
                      </span>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span
                          data-anim="count"
                          data-to="128"
                          data-tnum
                          className="nl-num"
                          style={{
                            fontSize: 21,
                            fontWeight: 700,
                            letterSpacing: "-0.035em",
                            color: PAPER,
                          }}
                        >
                          128
                        </span>
                        <span style={{ fontSize: 10, color: GREEN }}>▲ after launch</span>
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: "grid",
                        gridTemplateColumns: "repeat(9,1fr)",
                        gap: 5,
                        alignItems: "end",
                        minHeight: 0,
                      }}
                    >
                      {BARS.map((h, i) => (
                        <div
                          key={i}
                          style={{ height: "100%", display: "flex", alignItems: "flex-end" }}
                        >
                          <div
                            data-anim="jbar"
                            data-h={String(h)}
                            style={{
                              width: "100%",
                              height: `${h}%`,
                              background: "var(--nl-accent)",
                              opacity: i < 5 ? 0.34 : 1,
                              borderRadius: "2px 2px 0 0",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ ...mono(8, 0.12), color: GREY }}>Week 1 — before</span>
                      <span style={{ ...mono(8, 0.12), color: GREY }}>Week 9</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* the bottom row: event stream + two small cells */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 300px",
                  gap: 16,
                  flex: 1,
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    border: `1px solid ${HAIR(0.09)}`,
                    borderRadius: 5,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ ...mono(9), color: GREY }}>Event stream</span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 10,
                        color: GREEN,
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: GREEN,
                          display: "block",
                        }}
                      />
                      live
                    </span>
                  </div>
                  {[
                    { t: "09:41:02", ev: "page_view", meta: " · google/cpc · /sample-landing", r: "—" },
                    { t: "09:41:24", ev: "cta_click", meta: " · hero · “Book a visit”", r: "—" },
                    { t: "09:41:58", ev: "lead_submitted", meta: " · booking form · step 3", r: "—" },
                    { t: "09:42:16", ev: "deposit_paid", meta: " · card · sample", r: "+$49", win: true },
                    { t: "09:42:17", ev: "calendar_sync", meta: " · appointment held", r: "✓" },
                  ].map((e, i, arr) => (
                    <div
                      key={e.t}
                      data-anim="ev"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "58px 1fr auto",
                        gap: 10,
                        alignItems: "center",
                        padding: "7px 0",
                        borderBottom:
                          i === arr.length - 1 ? "none" : `1px solid ${HAIR(0.06)}`,
                      }}
                    >
                      <span
                        data-tnum
                        className="nl-num"
                        style={{ fontSize: 9.5, color: GREY }}
                      >
                        {e.t}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: e.win ? 600 : 400,
                          color: e.win ? GREEN : "inherit",
                        }}
                      >
                        {e.ev}
                        <span style={{ color: GREY, fontWeight: 400 }}>{e.meta}</span>
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: e.win ? 600 : 400,
                          color: e.win ? GREEN : GREY,
                        }}
                      >
                        {e.r}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* The source put an invented "cost per booked chair, ▼63%"
                      here. This states how the tracking works instead — which is
                      true, checkable, and the actual differentiator. */}
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${HAIR(0.09)}`,
                      borderRadius: 5,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <span style={{ ...mono(9), color: GREY }}>Attribution</span>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 9 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-heading), system-ui, sans-serif",
                          fontSize: 24,
                          fontWeight: 700,
                          letterSpacing: "-0.035em",
                        }}
                      >
                        First-party
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: GREY }}>
                      Your domain. No third-party pixels.
                    </span>
                  </div>
                  <div
                    data-anim="s4chat"
                    style={{
                      background: "#fff",
                      border: `1px solid ${HAIR(0.09)}`,
                      borderRadius: 5,
                      padding: 14,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "var(--nl-accent)",
                        display: "grid",
                        placeItems: "center",
                        color: INK,
                        fontSize: 10,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      S
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 12, lineHeight: 1.45 }}>
                        Draft of the purchase page is in Files — leave a comment on anything.
                      </span>
                      <span style={{ ...mono(9, 0.12), color: GREY }}>
                        StrataLanding · 2m ago
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* THE ACT RAIL. Four entries, `data-a`/`data-b` windows. Child ORDER
              is load-bearing: the engine takes firstElementChild as the line it
              grows 22px -> 40px, so the rule comes before the label. It fades in
              over p .08-.17 and the engine hides it below 1180px. */}
          <div
            aria-hidden
            className="nl-journey-cinema absolute z-[12] flex flex-col gap-[19px]"
            style={{ left: "var(--nl-gutter)", top: "50%", transform: "translateY(-50%)" }}
          >
            {ACTS.map((a, i) => (
              <div
                key={a.word}
                data-anim="railitem"
                data-a={[0.14, 0.345, 0.575, 0.79][i]}
                data-b={[0.345, 0.575, 0.79, 1.02][i]}
                className="flex items-center gap-[11px]"
              >
                <span className="block h-px w-[22px]" style={{ background: INK }} />
                <span style={{ ...mono(10, 0.16) }}>
                  {a.n} {a.word}
                </span>
              </div>
            ))}
          </div>

          {/* CAPTIONS. band() windows via data-in/data-out. They carry the
              ground they sit on so the pre-engine frame shows one caption, not
              four — the windows are disjoint, so nothing ever overlaps once the
              engine is running. Act 03 plays over the navy ground. */}
          <div
            className="nl-journey-cinema pointer-events-none absolute inset-x-0 z-[12] grid place-items-center"
            style={{ bottom: 30 }}
          >
            <div
              className="relative grid place-items-center"
              style={{ height: 26, width: "min(880px,84vw)" }}
            >
              {ACTS.map((a, i) => (
                <span
                  key={a.word}
                  data-anim="cap"
                  data-in={a.capIn}
                  data-out={a.capOut}
                  className="absolute text-center"
                  style={{
                    fontSize: 15,
                    color: i === 2 ? "#9aa7bd" : GREY_D,
                    background: i === 2 ? "var(--nl-ink-band)" : "#f6f3ec",
                    padding: "0 10px",
                  }}
                >
                  {a.cap}
                </span>
              ))}
            </div>
          </div>

          {/* SCENE CALLOUTS. Hidden by the engine below 1180px. */}
          {CALLOUTS.map((c) => (
            <div
              key={c.key}
              data-anim="ann"
              data-in={c.in}
              data-out={c.out}
              className={`nl-journey-cinema absolute z-[12] flex flex-col gap-[5px] ${
                "side" in c && c.side === "left" ? "items-start" : "items-end"
              }`}
              style={
                "side" in c && c.side === "left"
                  ? { left: 38, top: c.top }
                  : { right: 38, top: c.top }
              }
            >
              <span style={{ ...mono(10, 0.14), color: "var(--nl-accent)" }}>{c.key}</span>
              <span
                data-anim="anntext"
                className="text-right"
                style={{ fontSize: 12.5, color: GREY, maxWidth: "26ch" }}
              >
                {c.text}
              </span>
            </div>
          ))}

          {/* SCROLL CUE. The engine slides this translateX(sin(t)*60 + 62), so
              the travel is 2px -> 122px and the track has to be wider than
              192px or the bar walks straight out of its own box. */}
          <div
            aria-hidden
            className="nl-journey-cinema absolute z-[12] flex flex-col gap-2"
            style={{ left: "var(--nl-gutter)", bottom: 24 }}
          >
            <span className="nl-mono-xs" style={{ color: "var(--nl-faint)" }}>
              Scroll — one visitor, click to client
            </span>
            <span
              className="relative block h-px overflow-hidden"
              style={{ width: 200, background: "var(--nl-r16)" }}
            >
              <span
                data-anim="scrollcue"
                className="absolute inset-y-0 left-0 block"
                style={{ width: 70, background: "var(--nl-accent)" }}
              />
            </span>
          </div>

          {/* ═══ MOBILE / REDUCED-MOTION PARITY ═══════════════════════════════
              The engine never mounts below 1040px and nl.css has already
              unpinned the stage, so everything above is hidden at that same
              breakpoint and this stands in for it: same four acts, same
              headlines, same captions, as an ordinary ruled list. */}
          <div className="nl-journey-fallback" style={{ padding: "72px var(--nl-gutter) 84px" }}>
            <div className="nl-inner">
              <span className="nl-mono" style={{ color: "var(--nl-accent)" }}>
                What we build
              </span>
              <h2
                className="nl-h2 mt-5 mb-0"
                style={{ fontSize: "clamp(30px,7vw,52px)", maxWidth: "16ch" }}
              >
                Three pages, one portal, one continuous path.
              </h2>
              <p
                className="mt-5 mb-0 max-w-[46ch] text-[16px] leading-[1.55]"
                style={{ color: "var(--nl-body)" }}
              >
                On a wide screen this section plays as a film: the page gets built in front of
                you, act by act. Here is the same argument, written down.
              </p>
              <ol
                className="mt-9 list-none p-0"
                style={{ borderTop: `1px solid ${HAIR(0.24)}` }}
              >
                {ACTS.map((a) => (
                  <li
                    key={a.word}
                    className="grid grid-cols-[38px_minmax(0,1fr)] gap-x-4 py-6"
                    style={{ borderBottom: `1px solid ${HAIR(0.14)}` }}
                  >
                    <span
                      data-tnum
                      className="nl-num text-[11px] tracking-[0.14em]"
                      style={{ color: "var(--nl-accent)", paddingTop: 6 }}
                    >
                      {a.n}
                    </span>
                    <span>
                      <span className="nl-mono-sm block" style={{ color: "var(--nl-meta)" }}>
                        {a.word}
                      </span>
                      <span
                        className="nl-h3 mt-2 block"
                        style={{ fontSize: "clamp(21px,5vw,28px)" }}
                      >
                        {a.head}
                      </span>
                      <span
                        className="mt-2 block text-[15px] leading-[1.5]"
                        style={{ color: "var(--nl-body)" }}
                      >
                        {a.cap}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Stage>

      {/* ═══ THE ONE BROWSER FRAME ═════════════════════════════════════════════
          position:fixed, 1060x662, margin:-331px 0 0 -530px from 50%/50%.
          applyFrame() is the SINGLE writer of its transform/opacity/z-index —
          nothing here may set those, and nothing else on the page may claim
          [data-oneframe]. It lives outside the stage because it is fixed: the
          stage's sticky child carries overflow:hidden and would clip it.
          Hidden entirely below the stage breakpoint — a 1060px-wide fixed
          overlay on a phone is not a degraded scene, it is a broken page. */}
      {/* ⚠️ NO aria-hidden ON THE FRAME ITSELF, and that is a fix rather than an
          omission. This element carried `aria-hidden`, which was right while it
          held only decorative page mocks — and stopped being right the moment
          Start.tsx began portalling the REAL teardown form into
          [data-anim="content"] inside it. aria-hidden is inherited by the
          accessibility tree and cannot be undone by a descendant, so on desktop
          the page's second intake was unreachable to a screen reader while
          still being keyboard-focusable: the specific combination WCAG calls
          out, and one a browser will happily tab into.

          The decoration is marked instead — the browser chrome below and the
          three act mocks (s1/s2/s3), each of which IS purely decorative. The
          portalled intake is the only thing in here that is not, and it is now
          the only thing announced. */}
      <div
        data-anim="stageWrap"
        data-oneframe="1"
        className="nl-oneframe"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          width: 1060,
          height: 662,
          margin: "-331px 0 0 -530px",
          zIndex: 6,
          pointerEvents: "none",
          willChange: "transform",
          transformOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 10,
            background: "#FFFFFF",
            boxShadow: "0 60px 120px -40px rgba(11,27,58,0.42)",
            overflow: "hidden",
            border: `1px solid ${HAIR(0.1)}`,
          }}
        >
          {/* CHROME BAR — 40px. `content` starts at exactly 40px below it, and
              the scale-through's inset maths assumes that offset.
              aria-hidden: a drawn browser chrome with a fake URL is decoration.
              It used to inherit that from the frame; the frame no longer carries
              it, because the frame now also hosts a real form. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 40,
              background: "var(--nl-paper-2)",
              borderBottom: `1px solid ${HAIR(0.09)}`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 14px",
              zIndex: 6,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "#dfe3ea",
                    display: "block",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                flex: 1,
                height: 22,
                borderRadius: 11,
                background: "#FFFFFF",
                border: `1px solid ${HAIR(0.08)}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 10px",
                maxWidth: 420,
                margin: "0 auto",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: GREEN,
                  display: "block",
                }}
              />
              {/* The engine owns this string across the four acts. */}
              <span
                data-anim="url"
                className="nl-num"
                style={{ fontSize: 10.5, color: GREY }}
              >
                sample-client.example
              </span>
            </div>
            {/* THE LABEL. Visible in every act, in the one piece of chrome that
                never leaves the screen. The mock below it is a demonstration,
                not a client. */}
            <span
              style={{ ...mono(8.5, 0.13), color: GREY, textAlign: "right", width: 236 }}
            >
              Sample design — placeholder brand &amp; content
            </span>
          </div>

          {/* THE PAGE AREA. The scale-through measures s1cta against this box
              and divides by cr.width / 1060, so it must stay the frame's full
              width. perspective:1900px is what gives the flip its depth. */}
          <div
            data-anim="content"
            style={{
              position: "absolute",
              top: 40,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "hidden",
              perspective: "1900px",
              background: "#FFFFFF",
            }}
          >
            {/* ── ACT 01 · PRESENCE ─────────────────────────────────────────── */}
            <div
              data-anim="s1"
              aria-hidden
              style={{ position: "absolute", inset: 0, background: "#FFFFFF" }}
            >
              <div
                data-anim="s1scroll"
                style={{ position: "absolute", top: 0, left: 0, width: "100%" }}
              >
                <div
                  style={{
                    background: TEAL_DEEP,
                    color: "#DCE8E8",
                    padding: "7px 40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    ...mono(9),
                  }}
                >
                  <span>Now booking · Evening appointments</span>
                  <span style={{ color: "#7FB3B8" }}>Sample studio · not a real business</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 40px",
                    borderBottom: `1px solid ${HAIR(0.08)}`,
                    background: "rgba(255,255,255,0.9)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 5,
                        background: TEAL,
                        display: "grid",
                        placeItems: "center",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      M
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-heading), system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: 14.5,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      MERIDIAN<span style={{ color: TEAL }}> SKIN</span>
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 26,
                      fontSize: 12.5,
                      color: GREY_D,
                    }}
                  >
                    <span>Treatments</span>
                    <span>Team</span>
                    <span>Pricing</span>
                    <span>Contact</span>
                    <span
                      style={{
                        width: 1,
                        height: 14,
                        background: HAIR(0.12),
                        display: "block",
                      }}
                    />
                    <span
                      style={{
                        background: TEAL,
                        color: "#fff",
                        padding: "9px 16px",
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 12,
                        display: "inline-block",
                        boxShadow: "0 6px 16px -6px rgba(14,107,122,0.7)",
                      }}
                    >
                      Book a visit
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.02fr 0.98fr",
                    gap: 40,
                    padding: "44px 40px 34px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 17 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 9,
                        ...mono(9, 0.2),
                        color: TEAL,
                      }}
                    >
                      <span
                        style={{ width: 16, height: 1, background: TEAL, display: "block" }}
                      />
                      Skin health &amp; aesthetics
                    </span>
                    <span
                      className="nl-serif"
                      style={{ fontSize: 56, lineHeight: 0.98, letterSpacing: "-0.025em" }}
                    >
                      A studio you
                      <br />
                      actually <span style={{ color: TEAL }}>look forward to</span>.
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: GREY_D,
                        maxWidth: "40ch",
                      }}
                    >
                      Same-week appointments, prices posted before you book, and a plan explained
                      before anything happens.
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        paddingTop: 2,
                      }}
                    >
                      {/* THE SCALE-THROUGH ORIGIN. The engine caches this box's
                          rect at p≈0.30 and act 02 grows out of it. Its position
                          in the layout is the transition. */}
                      <span
                        data-anim="s1cta"
                        style={{
                          background: TEAL,
                          color: "#fff",
                          padding: "13px 22px",
                          borderRadius: 4,
                          fontWeight: 600,
                          fontSize: 12.5,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 9,
                          boxShadow: "0 10px 24px -10px rgba(14,107,122,0.8)",
                        }}
                      >
                        Book a visit<span style={{ opacity: 0.7 }}>→</span>
                      </span>
                      <span
                        style={{
                          border: `1px solid ${HAIR(0.18)}`,
                          padding: "13px 20px",
                          borderRadius: 4,
                          fontWeight: 500,
                          fontSize: 12.5,
                          background: "#fff",
                        }}
                      >
                        Message the studio
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        paddingTop: 8,
                        marginTop: "auto",
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: GREY }}>
                        Prices posted · No consult fee · Reschedule in one tap
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      position: "relative",
                      borderRadius: 8,
                      minHeight: 286,
                      overflow: "hidden",
                      boxShadow:
                        "0 20px 44px -22px rgba(11,27,58,0.42), inset 0 0 0 1px rgba(11,27,58,0.06)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "radial-gradient(130% 100% at 72% 12%, #F2F6F5 0%, #CFDEDD 52%, #A9C2C1 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: "54%",
                        background: "linear-gradient(180deg,#B4C9C8 0%,#9DB6B5 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: "54%",
                        background:
                          "linear-gradient(180deg,rgba(11,27,58,0) 0%,rgba(11,27,58,0.18) 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: 16,
                        top: 16,
                        background: "rgba(255,255,255,0.94)",
                        borderRadius: 5,
                        padding: "9px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        boxShadow: "0 10px 26px -12px rgba(11,27,58,0.45)",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: GREEN,
                          display: "block",
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>
                        Next available — Friday 9:30 am
                      </span>
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        left: 16,
                        bottom: 16,
                        background: "#FFFFFF",
                        borderRadius: 5,
                        padding: "11px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        boxShadow: "0 12px 30px -12px rgba(11,27,58,0.5)",
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: `linear-gradient(150deg,${TEAL},${TEAL_DEEP})`,
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        MS
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Sample practitioner</span>
                        <span style={{ ...mono(8.5, 0.14), color: GREY }}>Lead clinician</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    borderTop: `1px solid ${HAIR(0.09)}`,
                    borderBottom: `1px solid ${HAIR(0.09)}`,
                    margin: "0 40px",
                  }}
                >
                  {[
                    ["Same week", "Typical wait"],
                    ["Posted", "Prices before you book"],
                    ["Evenings", "Open late Thursday"],
                    ["One tap", "Reschedule or cancel"],
                  ].map(([big, small], i) => (
                    <div
                      key={big}
                      style={{
                        padding: i === 0 ? "15px 0" : "15px 0 15px 22px",
                        borderLeft: i === 0 ? "none" : `1px solid ${HAIR(0.09)}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-heading), system-ui, sans-serif",
                          fontSize: 19,
                          fontWeight: 700,
                          letterSpacing: "-0.035em",
                        }}
                      >
                        {big}
                      </span>
                      <span style={{ ...mono(8.5, 0.14), color: GREY }}>{small}</span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "26px 40px 12px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-heading), system-ui, sans-serif",
                      fontSize: 19,
                      fontWeight: 700,
                      letterSpacing: "-0.035em",
                    }}
                  >
                    What we&rsquo;re best at
                  </span>
                  <span style={{ ...mono(9), color: GREY }}>Prices posted · no surprises</span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 12,
                    padding: "0 40px 40px",
                  }}
                >
                  {[
                    ["01", "Facials & peels", "45 minutes", "Book same week"],
                    ["02", "Skin health plan", "Full consult", "Evening slots"],
                    ["03", "Laser & resurfacing", "Patch test first", "Plan before you pay"],
                  ].map(([n, title, sub, foot]) => (
                    <div
                      key={n}
                      style={{
                        border: `1px solid ${HAIR(0.11)}`,
                        borderRadius: 6,
                        padding: "16px 18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                        background: "#fff",
                        boxShadow: "0 4px 14px -10px rgba(11,27,58,0.4)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ ...mono(9), color: TEAL }}>{n}</span>
                        <span style={{ color: TEAL, fontSize: 13 }}>→</span>
                      </div>
                      <span
                        style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: "-0.015em" }}
                      >
                        {title}
                      </span>
                      <span style={{ fontSize: 11.5, color: GREY }}>{sub}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: TEAL,
                          paddingTop: 5,
                          marginTop: "auto",
                          borderTop: `1px solid ${HAIR(0.08)}`,
                        }}
                      >
                        {foot}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── THE TURNTABLE ─────────────────────────────────────────────── */}
            <div
              data-anim="flip"
              style={{
                position: "absolute",
                inset: 0,
                transformStyle: "preserve-3d",
                transform: "rotateY(0deg)",
              }}
            >
              {/* ── ACT 02 · LEAD (front face) ──────────────────────────────── */}
              <div
                data-anim="s2"
              aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#FBFAF8",
                  backfaceVisibility: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: "16px 40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${HAIR(0.07)}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-heading), system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: "-0.025em",
                    }}
                  >
                    MERIDIAN<span style={{ color: TEAL }}> SKIN</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 11.5, color: GREY }}>
                      Takes about 40 seconds · No account needed
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        border: `1px solid ${HAIR(0.14)}`,
                        borderRadius: 3,
                        padding: "5px 9px",
                        background: "#fff",
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "var(--nl-accent)",
                          display: "block",
                        }}
                      />
                      <span style={{ ...mono(9.5, 0.13), color: GREY_D }}>Slot held</span>
                      {/* The engine counts this down from 09:58 across p .37-.58 */}
                      <span
                        data-anim="holdclock"
                        data-tnum
                        className="nl-num"
                        style={{ fontSize: 11, fontWeight: 500, color: INK }}
                      >
                        09:58
                      </span>
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: 53,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: HAIR(0.07),
                  }}
                >
                  <div
                    data-anim="s2bar"
                    style={{ height: "100%", width: "33%", background: TEAL }}
                  />
                </div>

                <div
                  style={{
                    position: "absolute",
                    top: 55,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "grid",
                    gridTemplateColumns: "1.35fr 0.65fr",
                  }}
                >
                  <div style={{ position: "relative", padding: 44 }}>
                    {/* the trust strip is pinned to the bottom of the pane — the
                        source left dead space there */}
                    <div
                      style={{
                        position: "absolute",
                        left: 44,
                        right: 26,
                        bottom: 24,
                        display: "flex",
                        alignItems: "center",
                        gap: 18,
                        flexWrap: "wrap",
                        paddingTop: 13,
                        borderTop: `1px solid ${HAIR(0.09)}`,
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: GREY }}>No account, no password</span>
                      <span
                        style={{ width: 1, height: 11, background: HAIR(0.16), display: "block" }}
                      />
                      <span style={{ fontSize: 11.5, color: GREY }}>
                        Cancel or move it in one tap
                      </span>
                      <span
                        style={{ ...mono(9, 0.15), color: GREY, marginLeft: "auto" }}
                      >
                        Sample design — placeholder content
                      </span>
                    </div>

                    {/* STEP 1 */}
                    <div
                      data-anim="s2a"
                      style={{
                        position: "absolute",
                        inset: 44,
                        display: "flex",
                        flexDirection: "column",
                        gap: 22,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ ...mono(9.5, 0.2), color: GREY }}>Step 1 of 3</span>
                        <span
                          style={{
                            fontFamily: "var(--font-heading), system-ui, sans-serif",
                            fontSize: 30,
                            letterSpacing: "-0.035em",
                            fontWeight: 700,
                          }}
                        >
                          What brings you in?
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          maxWidth: 440,
                        }}
                      >
                        <div
                          data-anim="s2opt"
                          style={{
                            border: `1px solid ${HAIR(0.14)}`,
                            borderRadius: 5,
                            padding: "14px 18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#fff",
                          }}
                        >
                          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 15, fontWeight: 600 }}>Facial &amp; peel</span>
                            <span style={{ fontSize: 11, color: GREY }}>
                              Includes a skin read and an aftercare plan
                            </span>
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                ...mono(8.5, 0.13),
                                color: TEAL,
                                border: "1px solid rgba(14,107,122,0.32)",
                                borderRadius: 2,
                                padding: "4px 7px",
                              }}
                            >
                              Most booked
                            </span>
                            <span style={{ fontSize: 11.5, color: GREY }}>45 min</span>
                          </span>
                        </div>
                        {[
                          ["Skin health plan", "Full consult"],
                          ["Laser & resurfacing", "Patch test first"],
                        ].map(([t, s]) => (
                          <div
                            key={t}
                            style={{
                              border: `1px solid ${HAIR(0.14)}`,
                              borderRadius: 5,
                              padding: "16px 18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              background: "#fff",
                            }}
                          >
                            <span style={{ fontSize: 15, fontWeight: 600 }}>{t}</span>
                            <span style={{ fontSize: 11.5, color: GREY }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* STEP 2 */}
                    <div
                      data-anim="s2b"
                      style={{
                        position: "absolute",
                        inset: 44,
                        display: "flex",
                        flexDirection: "column",
                        gap: 22,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ ...mono(9.5, 0.2), color: GREY }}>Step 2 of 3</span>
                        <span
                          style={{
                            fontFamily: "var(--font-heading), system-ui, sans-serif",
                            fontSize: 30,
                            letterSpacing: "-0.035em",
                            fontWeight: 700,
                          }}
                        >
                          When works for you?
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          maxWidth: 470,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8 }}>
                          {["Thu 12", "Fri 13", "Mon 16", "Tue 17"].map((d) => (
                            <span
                              key={d}
                              {...(d === "Fri 13" ? { "data-anim": "s2day" } : {})}
                              style={{
                                border: `1px solid ${HAIR(0.14)}`,
                                borderRadius: 4,
                                padding: "11px 14px",
                                fontSize: 12.5,
                                background: "#fff",
                              }}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {["8:00 am", "9:30 am", "1:15 pm", "4:00 pm"].map((t) => (
                            <span
                              key={t}
                              {...(t === "9:30 am" ? { "data-anim": "s2time" } : {})}
                              style={{
                                border: `1px solid ${HAIR(0.14)}`,
                                borderRadius: 4,
                                padding: "11px 14px",
                                fontSize: 12.5,
                                background: "#fff",
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            paddingTop: 2,
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: `linear-gradient(150deg,${TEAL},${TEAL_DEEP})`,
                              display: "grid",
                              placeItems: "center",
                              color: "#fff",
                              fontSize: 8.5,
                              fontWeight: 700,
                            }}
                          >
                            MS
                          </span>
                          <span style={{ fontSize: 12, color: GREY_D }}>
                            Friday still has{" "}
                            <span style={{ fontWeight: 600, color: INK }}>evening room</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* STEP 3 */}
                    <div
                      data-anim="s2c"
                      style={{
                        position: "absolute",
                        inset: 44,
                        display: "flex",
                        flexDirection: "column",
                        gap: 22,
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ ...mono(9.5, 0.2), color: GREY }}>Step 3 of 3</span>
                        <span
                          style={{
                            fontFamily: "var(--font-heading), system-ui, sans-serif",
                            fontSize: 30,
                            letterSpacing: "-0.035em",
                            fontWeight: 700,
                          }}
                        >
                          Where do we confirm?
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          maxWidth: 440,
                        }}
                      >
                        <div
                          style={{
                            border: `1px solid ${HAIR(0.14)}`,
                            borderRadius: 5,
                            padding: "14px 16px",
                            background: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <span style={{ ...mono(9), color: GREY }}>Full name</span>
                          <span style={{ fontSize: 15, fontWeight: 500 }}>
                            {/* typeInto() rebuilds this from data-text; the text is
                                rendered so the pre-engine frame is not blank */}
                            <span data-anim="type1" data-text="Jordan Reyes">
                              Jordan Reyes
                            </span>
                            <span
                              aria-hidden
                              style={{
                                display: "inline-block",
                                width: 1.5,
                                height: 15,
                                background: TEAL,
                                verticalAlign: -2,
                                animation: "nlBlink 1s steps(1) infinite",
                              }}
                            />
                          </span>
                        </div>
                        <div
                          style={{
                            border: `1px solid ${HAIR(0.14)}`,
                            borderRadius: 5,
                            padding: "14px 16px",
                            background: "#fff",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          <span style={{ ...mono(9), color: GREY }}>Mobile</span>
                          <span style={{ fontSize: 15, fontWeight: 500 }}>
                            {/* 555-01xx is the reserved fictional block */}
                            <span data-anim="type2" data-text="(555) 555-0142">
                              (555) 555-0142
                            </span>
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            border: `1px solid ${HAIR(0.14)}`,
                            borderRadius: 5,
                            padding: "13px 16px",
                            background: "#fff",
                          }}
                        >
                          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ ...mono(9), color: GREY }}>Reminders</span>
                            <span style={{ fontSize: 14, fontWeight: 500 }}>Text only</span>
                          </span>
                          <span style={{ ...mono(9.5, 0.13), color: GREEN }}>Opted in</span>
                        </div>
                        <span style={{ fontSize: 11, color: GREY, lineHeight: 1.5 }}>
                          One confirmation and one reminder. Nothing else, ever.
                        </span>
                        <div
                          data-anim="s2submit"
                          style={{
                            background: TEAL,
                            color: "#fff",
                            borderRadius: 4,
                            padding: "14px 18px",
                            fontSize: 14,
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          Confirm Friday, 9:30 am
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* the summary rail */}
                  <div
                    style={{
                      borderLeft: `1px solid ${HAIR(0.08)}`,
                      background: "var(--nl-paper-2)",
                      padding: "44px 26px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    <span style={{ ...mono(9.5, 0.18), color: GREY }}>Your visit</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                      {[
                        ["Reason", "Facial & peel", "sum1"],
                        ["Date", "Fri 13, 9:30 am", "sum2"],
                        ["With", "Lead clinician", "sum3"],
                      ].map(([k, v, key]) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12.5,
                          }}
                        >
                          <span style={{ color: GREY }}>{k}</span>
                          <span data-anim={key} style={{ fontWeight: 600 }}>
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        borderTop: `1px solid ${HAIR(0.1)}`,
                        paddingTop: 15,
                        display: "flex",
                        flexDirection: "column",
                        gap: 9,
                      }}
                    >
                      <span style={{ ...mono(9), color: GREY }}>The studio</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Meridian Skin</span>
                        <span style={{ fontSize: 11.5, color: GREY, lineHeight: 1.45 }}>
                          Your street address
                          <br />
                          Your city
                        </span>
                      </div>
                      {/* a drawn placeholder map — no real location is implied */}
                      <div
                        aria-hidden
                        style={{
                          height: 52,
                          borderRadius: 4,
                          background: "linear-gradient(150deg,#E8E4DA 0%,#D6DEDC 100%)",
                          position: "relative",
                          overflow: "hidden",
                          border: `1px solid ${HAIR(0.09)}`,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "34%",
                            height: 1,
                            background: HAIR(0.1),
                            display: "block",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "68%",
                            height: 1,
                            background: HAIR(0.1),
                            display: "block",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: "41%",
                            width: 1,
                            background: HAIR(0.1),
                            display: "block",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            left: "39%",
                            top: "28%",
                            width: 9,
                            height: 9,
                            borderRadius: "50% 50% 50% 0",
                            transform: "rotate(-45deg)",
                            background: TEAL,
                            display: "block",
                          }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: 7,
                            bottom: 6,
                            ...mono(8, 0.12),
                            color: GREY_D,
                          }}
                        >
                          Map placeholder
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        marginTop: "auto",
                        borderTop: `1px solid ${HAIR(0.1)}`,
                        paddingTop: 14,
                        fontSize: 11.5,
                        color: GREY,
                        lineHeight: 1.5,
                      }}
                    >
                      Held for 10 minutes. A $49 deposit locks the slot — credited to your visit.
                    </span>
                  </div>
                </div>
              </div>

              {/* ── ACT 03 · PURCHASE (back face) ───────────────────────────── */}
              <div
                data-anim="s3"
              aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "var(--nl-ink)",
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  <div
                    style={{
                      padding: "58px 46px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 24,
                      color: PAPER,
                    }}
                  >
                    <span style={{ ...mono(9.5, 0.2), color: GREY }}>Reserve your slot</span>
                    <span
                      style={{
                        fontFamily: "var(--font-heading), system-ui, sans-serif",
                        fontSize: 38,
                        lineHeight: 1.05,
                        letterSpacing: "-0.04em",
                        fontWeight: 700,
                      }}
                    >
                      $49 today.
                      <br />
                      Credited to Friday.
                    </span>
                    <span
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.6,
                        color: "#9aa7bd",
                        maxWidth: "36ch",
                      }}
                    >
                      Refundable up to 24 hours before — in one tap, with no phone call and no
                      email chain.
                    </span>
                    <div
                      style={{
                        border: "1px solid rgba(251,249,244,0.16)",
                        borderRadius: 6,
                        padding: "16px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        background: "rgba(251,249,244,0.04)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                          paddingRight: 16,
                          borderRight: "1px solid rgba(251,249,244,0.16)",
                        }}
                      >
                        <span style={{ ...mono(9), color: GREY }}>Fri</span>
                        <span
                          data-tnum
                          className="nl-num"
                          style={{
                            fontSize: 26,
                            fontWeight: 700,
                            letterSpacing: "-0.04em",
                            lineHeight: 1,
                          }}
                        >
                          13
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          9:30 am · Facial &amp; peel
                        </span>
                        <span style={{ fontSize: 12, color: "#9aa7bd" }}>
                          Lead clinician · Meridian Skin (sample)
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: 11,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12.5,
                          color: "#9aa7bd",
                        }}
                      >
                        <span>Deposit today</span>
                        <span>$49</span>
                      </div>
                      <div style={{ height: 1, background: "rgba(251,249,244,0.14)" }} />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        <span>Balance at visit</span>
                        <span>Quoted in your plan</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: PAPER,
                      padding: "58px 46px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 15,
                      position: "relative",
                      color: INK,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ ...mono(9.5, 0.18), color: GREY }}>Payment</span>
                      <span style={{ ...mono(9, 0.14), color: GREEN }}>Secured by Stripe</span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 6,
                      }}
                    >
                      {["Card", "Apple Pay", "Link"].map((t, i) => (
                        <span
                          key={t}
                          style={{
                            border: i === 0 ? `1.5px solid ${INK}` : `1px solid ${HAIR(0.14)}`,
                            borderRadius: 4,
                            padding: "9px 0",
                            textAlign: "center",
                            fontSize: 11.5,
                            fontWeight: i === 0 ? 600 : 400,
                            color: i === 0 ? INK : GREY_D,
                            background: "#fff",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        border: `1px solid ${HAIR(0.14)}`,
                        borderRadius: 5,
                        padding: "14px 16px",
                        background: "#fff",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <span style={{ ...mono(9), color: GREY }}>Card number</span>
                      <span className="nl-num" style={{ fontSize: 15 }}>
                        {/* Stripe's public test card — unmistakably not real */}
                        <span data-anim="type3" data-text="4242 4242 4242 4242">
                          4242 4242 4242 4242
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          border: `1px solid ${HAIR(0.14)}`,
                          borderRadius: 5,
                          padding: "14px 16px",
                          background: "#fff",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span style={{ ...mono(9), color: GREY }}>Expiry</span>
                        <span className="nl-num" style={{ fontSize: 15 }}>
                          <span data-anim="type4" data-text="09 / 29">
                            09 / 29
                          </span>
                        </span>
                      </div>
                      <div
                        style={{
                          border: `1px solid ${HAIR(0.14)}`,
                          borderRadius: 5,
                          padding: "14px 16px",
                          background: "#fff",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <span style={{ ...mono(9), color: GREY }}>CVC</span>
                        <span className="nl-num" style={{ fontSize: 15 }}>
                          <span data-anim="type5" data-text="318">
                            318
                          </span>
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        paddingTop: 2,
                      }}
                    >
                      <span
                        style={{
                          width: 15,
                          height: 15,
                          borderRadius: 3,
                          background: INK,
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontSize: 9,
                        }}
                      >
                        ✓
                      </span>
                      <span style={{ fontSize: 11.5, color: GREY_D }}>
                        Save this card for the balance at the visit
                      </span>
                    </div>
                    <div
                      data-anim="s3pay"
                      style={{
                        background: "var(--nl-ink)",
                        color: PAPER,
                        borderRadius: 4,
                        padding: 15,
                        textAlign: "center",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Pay $49 deposit
                    </div>
                    <span style={{ fontSize: 11, color: GREY, textAlign: "center" }}>
                      Card details never touch the studio&rsquo;s servers
                    </span>

                    {/* the paid state — a real receipt, not a toast */}
                    <div
                      data-anim="s3paid"
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: PAPER,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 15,
                        padding: "52px 46px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: GREEN,
                            display: "grid",
                            placeItems: "center",
                            color: "#fff",
                            fontSize: 18,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-heading), system-ui, sans-serif",
                              fontSize: 20,
                              fontWeight: 700,
                              letterSpacing: "-0.03em",
                            }}
                          >
                            Slot reserved
                          </span>
                          <span
                            data-tnum
                            style={{ ...mono(9.5, 0.14), color: GREEN }}
                          >
                            Sample confirmation
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          border: `1px solid ${HAIR(0.13)}`,
                          borderRadius: 5,
                          background: "#fff",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {[
                          ["Friday 13 · 9:30 am", "Lead clinician"],
                          ["Paid today · Visa 4242", "$49.00"],
                          ["Balance at visit", "Quoted in your plan"],
                        ].map(([l, r], i, arr) => (
                          <div
                            key={l}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "11px 14px",
                              borderBottom:
                                i === arr.length - 1 ? "none" : `1px solid ${HAIR(0.08)}`,
                            }}
                          >
                            <span style={{ fontSize: 12.5, color: GREY }}>{l}</span>
                            <span
                              style={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: i === 1 ? GREEN : INK,
                              }}
                            >
                              {r}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 7 }}>
                        {["Add to calendar", "Text me directions"].map((b) => (
                          <span
                            key={b}
                            style={{
                              border: `1px solid ${HAIR(0.18)}`,
                              borderRadius: 3,
                              padding: "9px 13px",
                              fontSize: 11.5,
                              fontWeight: 500,
                              background: "#fff",
                            }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                      <span
                        data-tnum
                        style={{ fontSize: 11, color: GREY, lineHeight: 1.5 }}
                      >
                        Receipt emailed · written to the studio calendar at 09:42:17 · revenue
                        attributed to google/cpc
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* THE DEMO CURSOR. Sits in the frame's own coordinate space (the
              engine writes left/top in the frame's 1060x662 box), so it must be
              a sibling of `content`, not a child. */}
          <div
            data-anim="cursor"
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 22,
              height: 22,
              opacity: 0,
              zIndex: 9,
              pointerEvents: "none",
            }}
          >
            <div
              data-anim="cring"
              style={{
                position: "absolute",
                left: -13,
                top: -13,
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "1.5px solid var(--nl-accent)",
                opacity: 0,
              }}
            />
            <svg
              viewBox="0 0 24 24"
              style={{
                width: 22,
                height: 22,
                display: "block",
                filter: "drop-shadow(0 3px 6px rgba(11,27,58,0.45))",
              }}
            >
              <path
                d="M5 3l14 8.5-6.2 1.1L10 19.5z"
                fill={INK}
                stroke={PAPER}
                strokeWidth={1.3}
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
      {/* ═══ THE FILM'S EXIT ════════════════════════════════════════════════
          THE GOAL PICKER USED TO BE HERE, AND IT WAS THE SAME CONTROL TWICE.
          This section rendered a four-cell radiogroup off `goalRouter`, fired
          trackGoalSelect, and wrote sessionStorage["strata_goal"] — and then
          the assay section, sixty-three viewports later, rendered the same
          array through the same handler into the same key, with the same
          2-up→4-up grid at the same breakpoint. Its whole reason for reading
          that key back was so nobody would be asked twice; the honest fix is
          to ask once.

          The assay keeps it, because that is where the question pays: it sits
          immediately before the ledger, it ANSWERS the question with a named
          tier and a delivery window, and it carries two CTAs. This copy asked
          and then navigated nowhere. Verified before deleting: with nothing
          seeding the key, Assay falls back to goalRouterDefault and labels its
          answer "Most common — …", which is the state a first-time reader
          already got.

          Nothing animated was removed. Neither surface had a scroll hook; the
          film's own choreography is untouched and this band is what it always
          was — the exit from twelve viewports. */}
      <section data-screen-label="After the film">
        <div className="nl-inner">

          <Handoff line={handoffs.journey.line} location={handoffs.journey.location} />
        </div>
      </section>

      {/* ═══ NO JAVASCRIPT ═════════════════════════════════════════════════════
          The three media queries below unpin this scene for a phone, for a
          coarse pointer and for reduced motion. None of them fires for a
          1440px desktop with scripting off — and that is the one case where
          the cinema is at its worst, because every layer here renders VISIBLE
          in server HTML on purpose (NLRoot's note: the engine sequences them
          from a painted first frame, so the hero -> journey boundary is a move
          and not an appearance). With no engine that first frame is also the
          last. Measured at 1440x900, javaScriptEnabled:false:

            s1, s2, s3 and content   opacity 1, all four on the SAME
                                     1058x620 rect — three page mocks printed
                                     on top of each other, headlines overlapping
            cap x5, ann x3           opacity 1 simultaneously
            .nl-oneframe             position:fixed, z-index 6, transform:none
                                     — 1060x662 pinned over all 41,000px of the
                                     document, every section below included
            .nl-journey-fallback     clip:rect(0,0,0,0) — the written version of
                                     the argument hidden for a film that cannot
                                     play

          So: no engine, no cinema. The same two selectors the mobile block
          uses, plus the reverse of the sr-only clip, plus the stage's own
          height — `height:760vh` is an INLINE style on the section (Stage.tsx),
          which is why it takes !important — so the section is as tall as its
          prose instead of 6,840px of empty pinned space.

          noscript takes dangerouslySetInnerHTML rather than a child <style>:
          with scripting ENABLED the browser parses a noscript's contents as
          plain text, and React hydration of real children inside one is the
          documented footgun. This is the pattern Next.js itself ships. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<style>
[data-nl] .nl-journey-cinema{display:none !important}
[data-nl] .nl-oneframe{display:none !important}
[data-nl] .nl-journey-fallback{position:static !important;width:auto !important;height:auto !important;margin:0 !important;overflow:visible !important;clip:auto !important;clip-path:none !important;white-space:normal !important;border:0 !important}
[data-nl] #what-we-build{height:auto !important}
[data-nl] #what-we-build .nl-stage-sticky{position:static !important;height:auto !important;min-height:0 !important;overflow:visible !important}
</style>`,
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
/* THE STAGE BREAKPOINT, matched to nl.css exactly. Above it the scene is
   cinema; at or below it nl.css has already unpinned the stage and NLRoot has
   not mounted the engine, so every absolutely-positioned layer and the fixed
   1060px frame are hidden and .nl-journey-fallback stands in. Hiding by
   media query rather than by an inline opacity:0 is the whole point — an
   inline 0 would be permanent wherever the engine never runs. */
/* The fallback is NOT display:none on desktop — it is visually hidden. Twelve
   viewports of this section's argument live in a mock nobody can read aloud, so
   removing the written version from the accessibility tree (and from a crawler)
   to show the film would trade the whole section's meaning for its choreography.
   Clipped, not hidden: same content, no pixels. */
[data-nl] .nl-journey-fallback{display:block}
@media (min-width:1040px) and (pointer:fine) and (prefers-reduced-motion:no-preference){
  [data-nl] .nl-journey-fallback{
    position:absolute;width:1px;height:1px;padding:0;margin:-1px;
    overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
  }
}
/* !important is load-bearing here and not laziness: the portal shell declares
   display:grid INLINE (its 190px/1fr split is engine-registered geometry, and
   an inline style outranks any stylesheet rule without it). Without the flag the
   1180x700 portal stayed laid out on a 390px phone. */
@media (max-width:1039px),(pointer:coarse),(prefers-reduced-motion:reduce){
  [data-nl] .nl-journey-cinema{display:none !important}
  [data-nl] .nl-oneframe{display:none !important}
}
`,
        }}
      />
    </div>
  );
}
