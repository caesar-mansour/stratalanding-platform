"use client";

/**
 * THE ANATOMY — the five-layer X-ray of ONE page. A pinned dark scene, 900vh.
 *
 * This is the PROOF section (id="proof", section_view "proof"). It does not
 * prove with numbers — StrataLanding has no client history to quote — it proves
 * by DISASSEMBLY: the deck pulls one landing page apart into the five layers
 * that actually decide whether it earns, and shows that most of them are
 * invisible. The only layer a visitor ever sees is 04.
 *
 * ── THE ENGINE CONTRACT (anatomy(p) in engine/NLEngine.ts, ~line 951) ────────
 * Every attribute below exists because the engine reads it. Nothing here is
 * decorative naming.
 *
 *   data-anim="anastack"   ONE element. Gets a single transform written every
 *                          frame: rotateX/rotateZ/scale. It must be
 *                          `transform-style: preserve-3d` and sit inside a
 *                          `perspective` ancestor or the whole scene collapses
 *                          flat. The stack NEVER translates — read the engine
 *                          comment: the composition is the scene, what changes
 *                          is which plane is lit.
 *   data-anim="analayer"   FIVE planes, each with `data-i="0..4"` (parseInt'd).
 *                          THE 3D RULE, and the source's engineering log is
 *                          emphatic: planes move ONLY along the stack normal.
 *                          The engine writes translate3d(ox,oy,oz) where ox/oy
 *                          are constant-per-index slot offsets and oz is the
 *                          only term that carries the lift — so all five planes
 *                          stay parallel and can never intersect. `z-index does
 *                          nothing inside preserve-3d`; only z CLEARANCE fixes
 *                          plane intersection, and this composition has it by
 *                          construction rather than by tuning.
 *                          The engine also QUANTISES its filter and box-shadow
 *                          strings (Math.round(x*5)/5, Math.round(x*4)/4) and
 *                          caches them on el.__q / el.__qs. That is a real
 *                          per-frame repaint optimisation — filter and
 *                          box-shadow are the two most expensive properties on
 *                          the page and writing a new string every frame forces
 *                          a repaint of a 760px plane. Do not "smooth" it.
 *   data-anim="chread"     the presented channel's number and name. Engine
 *                          writes it — but read the note below first.
 *   data-anim="anacount"   "01 / 05", walking with the deck.
 *   data-analedger         not a data-anim: layout() queries it directly to
 *                          shrink the ledger on short viewports (a pinned 100vh
 *                          scene cannot stack — there is no room to stack into).
 *
 * ── WHAT THIS FILE USED TO CLAIM, AND WHY IT WAS FALSE ──────────────────────
 * This block documented `chrow`, `chsub` and a `data-chrule` the engine grows
 * from 14px to 46px. None of it was true of the engine we ship.
 *
 *   · The rows emit `analabel`, not `chrow`. layout()'s per-row shrink queries
 *     `[data-anim="chrow"]` and finds nothing — AND FINDS NOTHING IN THE
 *     REFERENCE EITHER, which emits no chrow element. The dead query is
 *     faithful to the specification; widening it would be a divergence bought
 *     for a short-laptop edge case. Left alone deliberately.
 *   · `chread`, `chsub` and `anacount` appear NOWHERE in the reference. They
 *     were carried in from the older v4-engine.source.js — which does write
 *     them — while the port reads v4-working-engine.source.js, which does not.
 *     The comments came with them. So the counter read "01 / 05" at every
 *     scroll position through a 540vh five-beat scene while this header
 *     described an engine that was never generated.
 *   · `chsub` is gone. It printed the gloss of the lit channel, and the lit
 *     channel's gloss is already on screen, already lit, in the ledger to the
 *     left. A readout that names the row you are looking at is the exact
 *     say-it-twice defect this page is being cleaned of.
 *   · `chread` and `anacount` are now written by port-engine.cjs fix 1e, which
 *     reads the channel name off the row and the ceiling off n.analabel.length
 *     — so the engine carries no copy and no count of its own, and neither can
 *     drift from CHANNELS below.
 *
 * CHILD ORDER IS STILL LOAD-BEARING. Each analabel row must be a flat
 * [ number, name, description, rule ] — the engine's job-colour write reads
 * children[2] and fix 1e reads children[0] and children[1]. An earlier version
 * nested the name and job in a column div, which made children[2] undefined:
 * the engine lit the number and silently left every description grey, with no
 * error anywhere. Do not re-nest them.
 *
 * ── THE VISIBILITY CONTRACT ─────────────────────────────────────────────────
 * The v4 source authors every plane at opacity:0 because its runtime always
 * mounts. Ours mounts on tier B only. So everything here is authored VISIBLE
 * and the engine takes it over on its first frame. Nothing in this file may
 * carry inline opacity:0.
 *
 * ── MOBILE ──────────────────────────────────────────────────────────────────
 * nl.css unpins the stage below 1040px / coarse pointer / reduced motion, and
 * the engine never mounts. Five absolutely-positioned planes at inset:0 with no
 * engine would render as one illegible pile, so the DEFAULT (mobile) CSS below
 * unstacks the deck into five ordinary cards in document flow, and the pinned
 * 3D geometry is the OVERRIDE inside a media query that is the exact complement
 * of nl.css's unpin query. Authoring it that way round means the static state
 * is the one that ships when anything goes wrong. The phone therefore reads the
 * scene's actual thesis — one page, five layers — as a stacked list, which is
 * what the choreography says out loud on desktop.
 *
 * ── WHAT WAS CUT FROM THE SOURCE, AND WHY ───────────────────────────────────
 * The v4 anatomy scene is a dentist's page for a fictional client. Removed:
 *   · "Ridgeline Dental — presence page"  -> "Sample build — presence page".
 *     No invented client may head a section whose job is proof.
 *   · $129 / $189 / $89-mo service prices -> service names only. The pricing
 *     ledger owns every number on this site and none of them belong here.
 *   · "$49 holds the chair" deposit badge -> "Book online · 60 seconds".
 *   · 4.9 stars, "382 reviews", "J. Reyes · verified patient", "Dr. Amara Osei,
 *     DDS · 14 yrs · Madison" -> channel 03 is now SCHEMATIC: labelled empty
 *     slots for a review, a face and a credential. This is the more honest
 *     design as well as the safer one — the scene's claim is that the proof
 *     LAYER exists, not that any particular review does.
 *   · "ADA member" / "Delta Dental" badges -> generic "credential" slots. Real
 *     organisations may not be implied as endorsers of a sample.
 *   · "call_click" tracking hotspot -> "form_start". This studio takes no
 *     calls, and its own event schema has no such event.
 *   · "Camera depth 0000 mm" readout -> a static line. The ported engine has no
 *     `flydepth` writer, so an authored readout would be a dead fake instrument.
 *   · data-anim="flynum"/"flyname"/"flyz"/"flydust" -> dropped. All four are
 *     dead keys in the ported engine; the dust motes survive as pure decoration
 *     (fixed translateZ, no data-anim) because they read the deck's depth.
 * The sample business inside the mockup (MERIDIAN SKIN) stays fictional — that
 * is what a demo is — and is labelled SAMPLE inside the rendered layer and in
 * the deck header, so it can never be mistaken for a client.
 */

import { useRef } from "react";
import { handoffs } from "@/lib/brand";
import { Handoff } from "../Handoff";
import { useSectionView } from "@/components/strata/tier";
import { Plate } from "../Plate";
import { Stage } from "../Stage";

const MONO = "var(--font-nl-mono), ui-monospace, monospace";

/* The five channels. Names and glosses are the engine's own NM/SB arrays —
   chread/chsub are authored at index 0 so SSR matches the engine's first frame,
   and the ledger repeats them so the scene still reads with no engine at all. */
/** Two digits, so the ledger's numerals and the counter agree at a glance. */
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

const CHANNELS = [
  {
    n: "01",
    name: "The offer",
    desc: "Everything dims except the thing you actually sell.",
  },
  {
    n: "02",
    name: "Structure",
    desc: "Four decisions. Nothing optional survives.",
  },
  {
    n: "03",
    name: "Proof",
    desc: "Reviews, a face, credentials — earned, not claimed.",
  },
  {
    n: "04",
    name: "Interface",
    /* WAS "The only layer most studios ever ship." — an unsourced claim about
       competitors. This file's own header already carries the true version, and
       it is true by definition rather than by assertion. */
    desc: "The only layer a visitor ever sees.",
  },
  {
    n: "05",
    name: "Tracking",
    desc: "The same page, wired to the revenue.",
  },
] as const;

/* ── the scoped sheet ────────────────────────────────────────────────────────
   Every property that has to change between the stacked phone layout and the
   pinned 3D deck lives HERE and not inline, because an inline style outranks a
   media query and the deck would stay absolutely positioned on a phone.

   The media query is the exact complement of nl.css's unpin query
   (`max-width:1039px, pointer:coarse, prefers-reduced-motion:reduce`), so the
   deck geometry is armed on precisely the same devices the stage is pinned on
   and NLRoot mounts the engine on. */
const CSS = `
[data-nl] .nla-wrap{position:relative;width:100%;height:100%;display:grid;place-items:center;padding:0 var(--nl-gutter)}
[data-nl] .nla-grid{width:100%;max-width:1340px;display:grid;grid-template-columns:minmax(0,1fr);gap:clamp(26px,5vw,44px);align-items:center;padding:clamp(52px,10vw,86px) 0}
[data-nl] .nla-ledger{display:flex;flex-direction:column;gap:13px}
[data-nl] .nla-rows{display:flex;flex-direction:column;border-top:1px solid var(--nl-r16)}
/* FLAT four-child grid — number, name, job, rule — because analabel() indexes
   children directly (firstElementChild and children[2]). The name and job stack
   in column two via grid-row placement rather than a wrapper div, which keeps
   the DOM order the engine needs and the layout the design wants. */
[data-nl] .nla-chrow{display:grid;grid-template-columns:22px minmax(0,1fr);gap:2px 11px;align-items:start;padding:10px 0;border-bottom:1px solid var(--nl-r11)}
[data-nl] .nla-chrow>*:nth-child(1){grid-column:1;grid-row:1/span 3}
[data-nl] .nla-chrow>*:nth-child(2){grid-column:2;grid-row:1}
[data-nl] .nla-chrow>*:nth-child(3){grid-column:2;grid-row:2}
[data-nl] .nla-chrow>*:nth-child(4){grid-column:2;grid-row:3;margin-top:4px}
[data-nl] .nla-chcol{display:flex;flex-direction:column;gap:4px}
[data-nl] .nla-chtop{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
[data-nl] .nla-deck{position:relative;display:flex;flex-direction:column;gap:15px;align-items:center}
[data-nl] .nla-bar{width:100%;max-width:820px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
[data-nl] .nla-persp{width:100%;margin:0 auto;position:relative;perspective:2600px}
[data-nl] .nla-stack{position:relative;width:100%;display:flex;flex-direction:column;gap:14px;transform-style:preserve-3d;will-change:transform}
[data-nl] .nla-layer{position:relative;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;gap:9px;padding:13px;backface-visibility:hidden;will-change:transform,opacity;min-height:198px}
[data-nl] .nla-head{flex:0 0 26px;display:flex;align-items:center;justify-content:space-between;gap:8px}
[data-nl] .nla-mid{flex:1;display:grid;grid-template-columns:minmax(0,1fr);gap:9px;min-height:0}
[data-nl] .nla-main{overflow:hidden;display:flex;flex-direction:column;gap:7px;justify-content:center}
[data-nl] .nla-side{display:none;overflow:hidden;position:relative;border-radius:6px;min-height:64px}
[data-nl] .nla-cards{flex:0 0 62px;display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
[data-nl] .nla-card{border-radius:5px;padding:8px 9px;display:flex;flex-direction:column;gap:4px;justify-content:center;overflow:hidden}
[data-nl] .nla-foot{flex:0 0 24px;display:flex;align-items:center;justify-content:space-between;gap:8px}
[data-nl] .nla-dust{display:none}
/* THE SCRUB READOUT IS DESKTOP-ONLY, and that is subtraction rather than a
   second driver. It names the layer the deck is currently presenting — which is
   information only while there IS a current layer. Below the engine's mount
   gate the deck unstacks into five ordinary cards in document flow and all five
   are on screen at once, so a "01 / 05" there is furniture at best and a lie at
   worst. The query below is the exact complement of nl.css's unpin query. */
[data-nl] .nla-scrub{display:none}
@media (min-width:1040px) and (pointer:fine) and (prefers-reduced-motion:no-preference){
  [data-nl] .nla-scrub{display:inline}
  [data-nl] .nla-grid{grid-template-columns:clamp(210px,18vw,282px) minmax(0,1fr);gap:clamp(20px,3vw,56px);padding:0}
  [data-nl] .nla-persp{max-width:min(760px,52vw)}
  [data-nl] .nla-stack{display:block;aspect-ratio:16 / 10;gap:0}
  [data-nl] .nla-layer{position:absolute;inset:0;min-height:0}
  [data-nl] .nla-mid{grid-template-columns:1.06fr 0.94fr}
  [data-nl] .nla-side{display:block}
  [data-nl] .nla-dust{display:block}
}
`;

/* ── skeleton primitives ─────────────────────────────────────────────────────
   The deeper channels are wireframes, so most of their content is bars. These
   two helpers keep 60-odd inline style objects out of the markup; `ink` flips
   them for channel 04, the one plane rendered on paper. */
function Bar({ w, a = 0.1, h = 6, ink = false }: { w: string | number; a?: number; h?: number; ink?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        height: h,
        width: w,
        borderRadius: 3,
        background: ink ? `rgba(11,27,58,${a})` : `rgba(251,249,244,${a})`,
        flexShrink: 0,
      }}
    />
  );
}

/** A mono label. Always POSITIVE tracking — the h1's negative tracking must
    never reach a 8px uppercase label (nl.css, THE TRACKING LAW). */
function Tag({
  children,
  size = 8,
  color = "var(--nl-faint)",
  ls = "0.14em",
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  ls?: string;
}) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: size,
        letterSpacing: ls,
        textTransform: "uppercase",
        color,
        lineHeight: 1.3,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** A tracking hotspot: ringed dot + event name. Channel 05 only. */
function Hotspot({ label }: { label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        aria-hidden
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          border: "1px solid var(--nl-accent)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--nl-accent)", display: "block" }} />
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 7,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--nl-accent)",
        }}
      >
        {label}
      </span>
    </span>
  );
}

/** A numbered wireframe marker. Channel 02 only. */
function Step({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: 15,
        height: 15,
        borderRadius: "50%",
        border: "1px solid var(--nl-accent)",
        display: "grid",
        placeItems: "center",
        fontFamily: MONO,
        fontSize: 7.5,
        color: "var(--nl-accent)",
        flexShrink: 0,
      }}
    >
      {n}
    </span>
  );
}

/** The shell every plane shares. `data-i` is read by the engine with parseInt. */
function Layer({
  i,
  bg,
  border,
  glow = false,
  children,
}: {
  i: number;
  bg: string;
  border: string;
  glow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-anim="analayer"
      data-i={String(i)}
      className="nla-layer"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        /* The engine overwrites box-shadow on its first frame; this is its own
           rest value, so there is no flash between SSR and frame one — and it
           is what a phone keeps forever. */
        boxShadow: glow
          ? "0 40px 90px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(34,211,238,0.28), inset 0 0 70px rgba(34,211,238,0.07)"
          : "0 40px 90px -40px rgba(0,0,0,0.9), 0 0 0 1px rgba(251,249,244,0.09)",
      }}
    >
      {children}
    </div>
  );
}

/* Channel 04 renders on paper, and nl.css's dark block re-points --nl-body /
   --nl-meta / --nl-faint / --nl-r* to paper alphas for everything inside
   [data-tone="dark"]. Those tokens are therefore INVISIBLE on this one plane,
   so its muted text and its accent are written literally. #0891B2 is the
   light-ground half of the brand accent (the dark-ground half, #22D3EE, fails
   on paper); see the two-value accent note at the top of nl.css. */
const PAPER_INK = "#0b1b3a";
const PAPER_MUTED = "rgba(11,27,58,0.56)";
const PAPER_ACCENT = "#0891b2";

export function Anatomy() {
  const ref = useRef<HTMLDivElement | null>(null);
  useSectionView(ref, "proof");

  return (
    <>
      <Stage name="anatomy" height={540} tone="dark" label="Anatomy" id="proof" bg="#071022">
      <div ref={ref} className="nla-wrap" style={{ background: "var(--nl-ground-ink-deep)" }}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        {/* The blueprint-line plate: construction lines behind a scene about
            construction. Low opacity — five planes with their own shadows are
            already carrying the depth. */}
        <Plate id="anatomy" position="50% 42%" opacity={0.4} />

        {/* data-nrw="skip" tells the engine's narrow-mode collapse to leave this
            grid alone: the media query above owns the breakpoint, and the two
            fighting over gridTemplateColumns is how the source's collapse
            silently stopped matching the CSS. */}
        <div className="nla-grid" data-nrw="skip">
          {/* ── the ledger ─────────────────────────────────────────────────── */}
          <div data-analedger="1" className="nla-ledger">
            <span className="nl-mono" style={{ color: "var(--nl-accent)" }}>
              The anatomy
            </span>

            {/* layout() hides this h2 on short viewports — the deck is the
                point and the rows are the content. */}
            <h2 className="nl-h2 m-0" style={{ fontSize: "clamp(25px,2.8vw,40px)" }}>
              One page.
              <br />
              Five layers.
              <br />
              <span className="nl-serif">Dealt.</span>
            </h2>

            <div className="nla-rows">
              {CHANNELS.map((c, i) => (
                /* CHILD ORDER IS THE CONTRACT: [0] number, [1] column whose
                   [1] is the description layout() hides when the viewport is
                   short. Do not wrap either in anything. */
                /* CHILD ORDER IS THE CONTRACT, and it is FLAT — not nested.
                   analabel() reads:
                     el.dataset.i        the channel index, into the weight array
                     el.firstElementChild the number  -> lerped grey -> accent
                     el.children[2]       the job line -> lerped grey -> paper
                   and writes the row's own opacity (0.32 + 0.68w).
                   An earlier version wrapped the name and job in a column div,
                   which made children[2] undefined — the engine then lit the
                   number and silently left every description grey, with no
                   error anywhere. Do not re-nest these. */
                <div
                  key={c.n}
                  data-anim="analabel"
                  data-i={i}
                  className="nla-chrow"
                  style={{ opacity: 1 }}
                >
                  <span
                    data-tnum
                    className="nl-num"
                    style={{ fontSize: 9.5, letterSpacing: "0.12em", color: "#6b7a92", paddingTop: 2 }}
                  >
                    {c.n}
                  </span>
                  <span
                    style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--nl-paper)" }}
                  >
                    {c.name}
                  </span>
                  <span style={{ fontSize: 11, lineHeight: 1.35, color: "#6b7a92" }}>{c.desc}</span>
                  {/* Grown 14px -> 46px and recoloured by the engine. Authored
                      at the engine's own rest values so frame one is a no-op. */}
                  <span
                    data-chrule
                    aria-hidden
                    style={{ display: "block", height: 1, width: 14, background: "#6b7a92" }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-[2px]">
              <Tag size={8.5} color="var(--nl-faint)">
                Five layers
              </Tag>
              <Tag size={8.5} color="var(--nl-accent)">
                All five, every build
              </Tag>
            </div>
          </div>

          {/* ── the deck ───────────────────────────────────────────────────── */}
          <div className="nla-deck">
            <div className="nla-bar">
              <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
                Sample build — presence page
              </span>
              {/* THE READOUT. Both values are written by the engine's anatomy()
                  scene (port-engine.cjs fix 1e) and both are AUTHORED FROM
                  CHANNELS rather than typed, so the server's first paint and the
                  engine's first frame cannot disagree and a reorder of CHANNELS
                  cannot strand a stale literal here. */}
              <span className="nla-scrub flex items-baseline gap-3">
                <span data-anim="chread" className="nl-mono-sm" style={{ color: "var(--nl-accent)" }}>
                  {CHANNELS[0].n} — {CHANNELS[0].name}
                </span>
                <span
                  data-anim="anacount"
                  data-tnum
                  className="nl-num"
                  style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--nl-meta)" }}
                >
                  {CHANNELS[0].n} / {pad2(CHANNELS.length)}
                </span>
              </span>
            </div>

            {/* perspective lives here, preserve-3d on the stack inside it. Split
                across two elements deliberately: a perspective on the same node
                as the rotation makes the vanishing point move with the tilt. */}
            <div className="nla-persp nl-reg">
              {/* .nl-reg draws the top-left and bottom-right registration marks;
                  an element has one ::before and one ::after, so the other two
                  corners are real spans rather than a second pseudo pair. */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  right: -15,
                  top: -15,
                  width: 16,
                  height: 16,
                  borderTop: "1px solid var(--nl-r24)",
                  borderRight: "1px solid var(--nl-r24)",
                  pointerEvents: "none",
                }}
              />
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: -15,
                  bottom: -15,
                  width: 16,
                  height: 16,
                  borderBottom: "1px solid var(--nl-r24)",
                  borderLeft: "1px solid var(--nl-r24)",
                  pointerEvents: "none",
                }}
              />

              <div data-anim="anastack" className="nla-stack">
                {/* ── 01 · the offer ─────────────────────────────────────────
                    The page ghosted down to the thing being sold. No price:
                    brand.ts owns every number on this site and the pricing
                    ledger is where they are read. */}
                <Layer i={0} bg="#151a2e" border="var(--nl-r14)">
                  <div className="nla-head">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Bar w={18} a={0.16} />
                      <Bar w={62} a={0.12} />
                    </span>
                    <Tag color="rgba(251,249,244,0.16)">nav</Tag>
                  </div>
                  <div className="nla-mid">
                    <div className="nla-main">
                      <Bar w="84%" a={0.1} />
                      <Bar w="66%" a={0.08} />
                      <span style={{ display: "flex", alignItems: "baseline", gap: 7, paddingTop: 4 }}>
                        <span
                          style={{
                            fontSize: 19,
                            fontWeight: 800,
                            letterSpacing: "-0.04em",
                            color: "var(--nl-paper)",
                          }}
                        >
                          Same-week consults
                        </span>
                      </span>
                      <Tag size={7.5} color="var(--nl-faint)">
                        the one thing the page sells
                      </Tag>
                      <Bar w="48%" a={0.07} />
                    </div>
                    <div className="nla-side">
                      <div style={{ position: "absolute", inset: 0, background: "rgba(251,249,244,0.09)" }} />
                      <span
                        style={{
                          position: "absolute",
                          left: 9,
                          bottom: 16,
                          fontSize: 14,
                          fontWeight: 800,
                          letterSpacing: "-0.04em",
                          color: "var(--nl-paper)",
                        }}
                      >
                        Walk-in slots
                      </span>
                      <span style={{ position: "absolute", left: 9, bottom: 4 }}>
                        <Tag size={7.5}>second offer</Tag>
                      </span>
                    </div>
                  </div>
                  <div className="nla-cards">
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r11)" }}>
                      <Bar w="60%" a={0.09} />
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-0.035em", color: "var(--nl-paper)" }}>
                        Membership
                      </span>
                    </div>
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r11)" }}>
                      <Bar w="60%" a={0.09} />
                      <Bar w="40%" a={0.07} />
                    </div>
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r11)" }}>
                      <Bar w="60%" a={0.09} />
                      <Bar w="40%" a={0.07} />
                    </div>
                  </div>
                  <div className="nla-foot" style={{ borderTop: "1px solid var(--nl-r14)" }}>
                    <span
                      style={{
                        background: "var(--nl-accent)",
                        color: "var(--nl-ink-deep)",
                        borderRadius: 2,
                        padding: "3px 7px",
                        fontFamily: MONO,
                        fontSize: 7.5,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      Book online · 60 seconds
                    </span>
                    <Tag color="var(--nl-accent)" ls="0.16em">
                      01 · offer
                    </Tag>
                  </div>
                </Layer>

                {/* ── 02 · structure ─────────────────────────────────────────
                    Straight from the source: dashed wireframe, four numbered
                    decisions. Nothing here was fiction, only the ember hex
                    needed translating to the brand accent. */}
                <Layer i={1} bg="#0d1a2b" border="var(--nl-r14)">
                  <div className="nla-head">
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Step n={1} />
                      <span
                        aria-hidden
                        style={{ height: 8, width: 70, border: "1px dashed var(--nl-r24)", borderRadius: 3, display: "block" }}
                      />
                    </span>
                    <Tag color="rgba(251,249,244,0.16)">one decision per screen</Tag>
                  </div>
                  <div className="nla-mid">
                    <div className="nla-main">
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Step n={2} />
                        <span
                          aria-hidden
                          style={{ height: 16, flex: 1, border: "1px dashed var(--nl-r24)", borderRadius: 3, display: "block" }}
                        />
                      </span>
                      <span
                        aria-hidden
                        style={{ height: 8, width: "74%", border: "1px dashed var(--nl-r16)", borderRadius: 3, display: "block" }}
                      />
                      <span
                        aria-hidden
                        style={{ height: 8, width: "56%", border: "1px dashed var(--nl-r16)", borderRadius: 3, display: "block" }}
                      />
                      <span style={{ display: "flex", alignItems: "center", gap: 7, paddingTop: 3 }}>
                        <Step n={3} />
                        <span
                          aria-hidden
                          style={{ height: 20, width: 78, border: "1px solid var(--nl-accent)", borderRadius: 3, display: "block" }}
                        />
                      </span>
                    </div>
                    <div className="nla-side">
                      <div
                        style={{ position: "absolute", inset: 0, border: "1px dashed var(--nl-r20)", borderRadius: 6 }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%,-50%)",
                        }}
                      >
                        <Tag size={7.5} color="rgba(251,249,244,0.2)" ls="0.16em">
                          proof surface
                        </Tag>
                      </span>
                    </div>
                  </div>
                  <div className="nla-cards">
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r14)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Step n={4} />
                        <span
                          aria-hidden
                          style={{ height: 6, flex: 1, border: "1px dashed var(--nl-r18)", borderRadius: 3, display: "block" }}
                        />
                      </span>
                      <span
                        aria-hidden
                        style={{ height: 6, width: "52%", border: "1px dashed var(--nl-r14)", borderRadius: 3, display: "block" }}
                      />
                    </div>
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r14)" }}>
                      <span
                        aria-hidden
                        style={{ height: 6, width: "72%", border: "1px dashed var(--nl-r14)", borderRadius: 3, display: "block" }}
                      />
                      <span
                        aria-hidden
                        style={{ height: 6, width: "46%", border: "1px dashed var(--nl-r11)", borderRadius: 3, display: "block" }}
                      />
                    </div>
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r14)" }}>
                      <span
                        aria-hidden
                        style={{ height: 6, width: "72%", border: "1px dashed var(--nl-r14)", borderRadius: 3, display: "block" }}
                      />
                      <span
                        aria-hidden
                        style={{ height: 6, width: "46%", border: "1px dashed var(--nl-r11)", borderRadius: 3, display: "block" }}
                      />
                    </div>
                  </div>
                  <div className="nla-foot" style={{ borderTop: "1px solid var(--nl-r14)" }}>
                    <Tag size={7.5} color="rgba(251,249,244,0.2)">
                      4 decisions · nothing optional
                    </Tag>
                    <Tag color="var(--nl-accent)" ls="0.16em">
                      02 · structure
                    </Tag>
                  </div>
                </Layer>

                {/* ── 03 · proof ─────────────────────────────────────────────
                    SCHEMATIC BY DECISION. The source filled this plane with a
                    5-star rating, a review count, a named patient quote, a
                    named dentist with a city and a tenure, and two real trade
                    bodies. All of it fiction, and this is the section whose
                    whole job is proof. The plane now shows the SLOTS — a
                    review, a face, a credential — which is what the scene
                    actually claims: the layer exists and is designed for. */}
                <Layer i={2} bg="#101f28" border="var(--nl-r14)">
                  <div className="nla-head">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Bar w={18} a={0.12} />
                      <Bar w={62} a={0.1} />
                    </span>
                    <Tag color="rgba(251,249,244,0.2)">rating slot</Tag>
                  </div>
                  <div className="nla-mid">
                    <div className="nla-main">
                      <Bar w="80%" a={0.08} />
                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          borderLeft: "2px solid var(--nl-accent)",
                          padding: "5px 0 5px 8px",
                        }}
                      >
                        <Bar w="94%" a={0.14} />
                        <Bar w="72%" a={0.12} />
                      </span>
                      <Tag size={7.5} color="var(--nl-faint)">
                        review · slot
                      </Tag>
                    </div>
                    <div className="nla-side">
                      <div style={{ position: "absolute", inset: 0, background: "rgba(251,249,244,0.09)" }} />
                      <span
                        style={{ position: "absolute", left: 8, bottom: 8, display: "flex", alignItems: "center", gap: 7 }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "rgba(251,249,244,0.16)",
                            display: "block",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <Bar w={56} a={0.16} />
                          <Tag size={7} color="var(--nl-faint)" ls="0.12em">
                            face · slot
                          </Tag>
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="nla-cards">
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r20)" }}>
                      <Tag size={7} color="var(--nl-meta)" ls="0.12em">
                        credential
                      </Tag>
                      <Bar w="50%" a={0.07} />
                    </div>
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r20)" }}>
                      <Tag size={7} color="var(--nl-meta)" ls="0.12em">
                        credential
                      </Tag>
                      <Bar w="50%" a={0.07} />
                    </div>
                    <div className="nla-card" style={{ border: "1px solid var(--nl-r11)" }}>
                      <Bar w="60%" a={0.08} />
                      <Bar w="40%" a={0.06} />
                    </div>
                  </div>
                  <div className="nla-foot" style={{ borderTop: "1px solid var(--nl-r14)" }}>
                    <Tag size={7.5} color="var(--nl-faint)">
                      earned, not claimed
                    </Tag>
                    <Tag color="var(--nl-accent)" ls="0.16em">
                      03 · proof
                    </Tag>
                  </div>
                </Layer>

                {/* ── 04 · interface ─────────────────────────────────────────
                    THE ONLY FULLY-RENDERED PLANE. The whole scene turns on
                    this: what a visitor calls "the website" is one of five
                    layers. Sample business, labelled SAMPLE, no client implied,
                    no rating, no price. */}
                <Layer i={3} bg="var(--nl-paper)" border="rgba(11,27,58,0.16)">
                  <div className="nla-head">
                    <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 17,
                          height: 17,
                          borderRadius: 4,
                          background: PAPER_ACCENT,
                          display: "grid",
                          placeItems: "center",
                          color: "#fff",
                          fontSize: 8.5,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        M
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "-0.025em", color: PAPER_INK }}>
                        MERIDIAN
                        <span style={{ color: PAPER_ACCENT }}> SKIN</span>
                      </span>
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 6.5,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: PAPER_MUTED,
                          border: "1px solid rgba(11,27,58,0.18)",
                          borderRadius: 2,
                          padding: "2px 4px",
                          flexShrink: 0,
                        }}
                      >
                        Sample
                      </span>
                    </span>
                    <span
                      style={{
                        background: PAPER_ACCENT,
                        color: "#fff",
                        padding: "5px 10px",
                        borderRadius: 3,
                        fontWeight: 600,
                        fontSize: 9,
                        boxShadow: "0 6px 14px -6px rgba(8,145,178,0.8)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Book online
                    </span>
                  </div>
                  <div className="nla-mid">
                    <div className="nla-main">
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 7,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: PAPER_ACCENT,
                        }}
                      >
                        Sample clinic
                      </span>
                      <span
                        className="nl-serif"
                        style={{ fontSize: 24, lineHeight: 0.98, letterSpacing: "-0.022em", color: PAPER_INK }}
                      >
                        Skin that looks rested, not done.
                      </span>
                      <span style={{ fontSize: 9.5, lineHeight: 1.5, color: PAPER_MUTED }}>
                        Same-week consults. Every step explained before it starts.
                      </span>
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 7.5,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: PAPER_MUTED,
                          paddingTop: 2,
                        }}
                      >
                        By appointment · booked online
                      </span>
                    </div>
                    <div className="nla-side">
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "radial-gradient(130% 100% at 72% 12%, #eef5f7 0%, #cfe1e8 52%, #a7c4d1 100%)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: "54%",
                          background: "linear-gradient(180deg,#b5cbd4 0%,#9db6c0 100%)",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          left: 8,
                          bottom: 8,
                          background: "#fff",
                          borderRadius: 4,
                          padding: "5px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 8px 18px -9px rgba(11,27,58,0.5)",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "linear-gradient(150deg,#0891b2,#0b3e57)",
                            display: "block",
                            flexShrink: 0,
                          }}
                        />
                        {/* A placeholder, not an invented practitioner. */}
                        <span style={{ fontSize: 8.5, fontWeight: 600, color: PAPER_INK, whiteSpace: "nowrap" }}>
                          Your clinician here
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="nla-cards">
                    {["Consultation", "Treatment plan", "Aftercare"].map((s, k) => (
                      <div key={s} className="nla-card" style={{ border: "1px solid rgba(11,27,58,0.12)" }}>
                        <span
                          style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.14em", color: PAPER_ACCENT }}
                        >
                          0{k + 1}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: PAPER_INK }}>{s}</span>
                        <Bar w="46%" a={0.14} ink />
                      </div>
                    ))}
                  </div>
                  <div className="nla-foot" style={{ borderTop: "1px solid rgba(11,27,58,0.16)" }}>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 7.5,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: PAPER_MUTED,
                      }}
                    >
                      The part you can see
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 8,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: PAPER_ACCENT,
                      }}
                    >
                      04 · interface
                    </span>
                  </div>
                </Layer>

                {/* ── 05 · tracking ──────────────────────────────────────────
                    The same page again, dark, with hotspots on EXACTLY the
                    elements channel 04 rendered — the CTA, the offer column,
                    the panel, the three service cards. Event names are the real
                    StrataMetrics schema from brand.ts (cta_click, form_start,
                    form_submit, thank_you_view, begin_checkout), not invented
                    ones, and the source's "call_click" is gone: no calls. */}
                <Layer i={4} bg="var(--nl-ink-deep)" border="rgba(34,211,238,0.42)" glow>
                  <div className="nla-head">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Bar w={18} a={0.12} />
                      <Bar w={62} a={0.1} />
                    </span>
                    <Hotspot label="cta_click" />
                  </div>
                  <div className="nla-mid">
                    <div className="nla-main">
                      <Bar w="80%" a={0.08} />
                      <Bar w="58%" a={0.07} />
                      <span style={{ paddingTop: 3 }}>
                        <Hotspot label="form_start" />
                      </span>
                      <span
                        style={{
                          display: "grid",
                          gridTemplateColumns: "44px 1fr auto",
                          gap: 7,
                          fontFamily: MONO,
                          fontSize: 8,
                          color: "var(--nl-meta)",
                          paddingTop: 4,
                          borderTop: "1px solid var(--nl-r11)",
                        }}
                      >
                        <span data-tnum>09:41:58</span>
                        <span style={{ color: "var(--nl-paper)" }}>form_submit</span>
                        <span>sample</span>
                      </span>
                      <span
                        style={{
                          display: "grid",
                          gridTemplateColumns: "44px 1fr auto",
                          gap: 7,
                          fontFamily: MONO,
                          fontSize: 8,
                          color: "var(--nl-green)",
                        }}
                      >
                        <span data-tnum>09:42:16</span>
                        <span>thank_you_view</span>
                        <span>attributed</span>
                      </span>
                    </div>
                    <div className="nla-side">
                      <div style={{ position: "absolute", inset: 0, background: "rgba(251,249,244,0.09)" }} />
                      <span style={{ position: "absolute", left: 8, bottom: 8 }}>
                        <Hotspot label="scroll_50" />
                      </span>
                    </div>
                  </div>
                  <div className="nla-cards">
                    {["cta_click", "form_start", "begin_checkout"].map((e) => (
                      <div key={e} className="nla-card" style={{ border: "1px solid rgba(34,211,238,0.28)" }}>
                        <Bar w="54%" a={0.08} />
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 8.5,
                            color: "var(--nl-accent)",
                            letterSpacing: "0.02em",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {e}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="nla-foot" style={{ borderTop: "1px solid rgba(34,211,238,0.42)" }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: MONO,
                        fontSize: 7.5,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--nl-green)",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--nl-green)", display: "block" }}
                      />
                      Attributed · sample session
                    </span>
                    <Tag color="var(--nl-accent)" ls="0.16em">
                      05 · tracking
                    </Tag>
                  </div>
                </Layer>

                {/* Depth dust. No data-anim — the ported engine has no writer for
                    these, so they are pure decoration parked at fixed depths
                    inside the preserve-3d space. They read the deck's z extent,
                    which is otherwise invisible once the planes are parallel.
                    Hidden below the stage breakpoint with the rest of the 3D. */}
                {[
                  { z: -260, l: "14%", t: "22%", a: 0.5 },
                  { z: -780, l: "83%", t: "68%", a: 0.45 },
                  { z: -1300, l: "38%", t: "86%", a: 0.4 },
                  { z: -1820, l: "69%", t: "15%", a: 0.45 },
                ].map((d) => (
                  <div
                    key={d.z}
                    aria-hidden
                    className="nla-dust"
                    style={{
                      position: "absolute",
                      left: d.l,
                      top: d.t,
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: `rgba(34,211,238,${d.a})`,
                      boxShadow: "0 0 8px 2px rgba(34,211,238,0.3)",
                      transform: `translateZ(${d.z}px)`,
                    }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      </Stage>

      {/* THE EXIT FROM THE PROOF SECTION. This carries id="proof" and reports
          `section_view: proof`, and it had no way out — five and a half
          viewports of the studio disassembling its own product, ending on the
          last of five layers. Belief peaks there; the offer belongs there.

          It sits OUTSIDE the Stage on purpose. A Stage is pinned — its children
          live inside a single held viewport with no spare room at any width the
          deck fits in, and an action the reader can only reach at one exact
          scrub position is an action nobody takes. Same reasoning as the
          journey's goal strip. The band keeps the stage's own ground so the
          handoff reads as the closing line of the scene rather than the opening
          of whatever follows. */}
      <div style={{ background: "var(--nl-ground-ink-deep)", paddingBottom: 8 }}>
        <Handoff line={handoffs.proof.line} location={handoffs.proof.location} tone="dark" />
      </div>
    </>
  );
}
