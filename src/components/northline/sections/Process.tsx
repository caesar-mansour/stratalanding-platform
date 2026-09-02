"use client";

/**
 * THE PROCESS TRACK — the horizontal-scroll pinned stage. HOW IT WORKS.
 *
 * Vertical scroll drives a horizontal deck: six step cards ride past a fixed
 * frame while a 2px rail fills underneath and a counter climbs. It is the one
 * scene on the page whose motion is literally its meaning — "there is a path,
 * it has a start and an end, and you can see where you are on it".
 *
 * ─── THE ENGINE CONTRACT (process(p), ~line 1035 of engine/NLEngine.ts) ──────
 * Three keys, and one runtime-injected element. Read in that order:
 *
 *   data-anim="track"      THE FLEX ROW. The engine writes
 *                          transform: translateX(-total * t) where
 *                          total = track.scrollWidth - innerWidth and
 *                          t = seg(p, 0.06, 0.94) — so the deck holds still for
 *                          the first 6% and last 6% of the scene and only then
 *                          travels. Because `total` is read off scrollWidth, the
 *                          card widths below are load-bearing: they decide how
 *                          far the deck moves, not a constant in the engine.
 *
 *   data-anim="trackbar"   THE RAIL. style.width = t*100 + '%'. Width, not
 *                          transform — so its parent must be the full-width
 *                          measure the fill is a percentage OF.
 *
 *   data-anim="daycount"   THE COUNTER. textContent only, zero-padded to two
 *                          digits. See THE COUNTER below — the ceiling is read
 *                          off data-steps, which is why that attribute exists.
 *
 *   [data-trackspacer]     INJECTED. process() looks for this inside the track
 *                          and, not finding one, appendChild()s its own. That
 *                          would be React's DOM being mutated behind its back,
 *                          so the element is authored here instead and the
 *                          engine just adopts it. Its job: the engine sets its
 *                          flex-basis to max(34, ceil(vw*0.55 - overflow)) so
 *                          the LAST card can still reach the middle of the frame
 *                          instead of stopping flush against the right edge.
 *                          It must be the final child of the track.
 *
 * ─── THE COUNTER, AND THE 19-DAY PROMISE THAT ISN'T OURS ────────────────────
 * The source ran this counter `1 + 18 * t`, labelled it "Day", and headlined the
 * section "Nineteen days. Four moves." Northline is fiction; its nineteen-day
 * build is fiction. StrataLanding publishes delivery windows PER TIER in
 * brand.ts (7-10 / 10-14 / 14-21 business days), so no single day count is true
 * for every project and shipping one would be a promise we cannot keep.
 *
 * The counter now counts the process STEPS, and its ceiling is read off
 * data-steps below rather than hardcoded — the same shape as the calcpay
 * data-build fix, and for the same reason: the engine must hold no claim of its
 * own, so this readout cannot drift from brand.ts by editing engine code. The
 * change lives in scripts/northline/port-engine.cjs (section 1d), not in the
 * generated NLEngine.ts, so a regeneration can never restore the fiction.
 *
 * ─── WHAT ELSE CAME OUT OF THE SOURCE ───────────────────────────────────────
 * Every instrument in the source's four cards was invented evidence about a
 * client that does not exist, so all four were rebuilt from scratch:
 *   · "Findings, last audit" — three flagged rows including "382 reviews, none
 *     on the site". An audit of a client we never had. -> card 01 shows sample
 *     starting LAYOUTS instead: wireframes, no findings, no client.
 *   · A proposal card printing $9,600. Prices live in brand.ts and the pricing
 *     ledger owns them; law 4 says none at all in this stage. -> card 04 shows
 *     the proposal's SHAPE (scope lines, fixed-price row) with the figure as a
 *     rule, not a number.
 *   · "Wired on day 16" -> Dentrix / Google Ads / Stripe all "Synced". Named
 *     integrations we have never shipped, on a day count we don't promise.
 *     -> card 06 lists what actually happens at launch.
 *   · "Booked chairs / week — 74, ▲ 106%" over a rising sparkline. A fabricated
 *     result for a fabricated client. -> cut entirely; the launch card carries a
 *     handover checklist, which is a fact about the contract, not a claim about
 *     an outcome.
 *   · The fifth panel: "One project at a time — we take two builds a month.
 *     That's the whole business model." Invented capacity AND invented scarcity.
 *     -> replaced with the one true closing claim this section can make: the
 *     whole path is async and the balance is only due after you approve.
 * Card 03's chat bubbles are the only content kept as a mockup: they are marked
 * "sample exchange" and the topic they show ("what sets you apart") is question
 * 02 of the ten in src/lib/onboarding-ai.ts, so the frame around them is real.
 *
 * ─── VISIBILITY / MOBILE ────────────────────────────────────────────────────
 * Nothing here is authored at opacity:0. The engine mounts on tier B only, so
 * an invisible-by-default layer would be permanently invisible on every phone.
 * Below 1040px / coarse pointer / reduced motion, nl.css unpins the stage AND
 * the block at the bottom of CSS flips the deck from a row to a COLUMN — the
 * same six cards, stacked, full width, natural height. The scrub-only chrome
 * (the counter and the rail) is display:none there and a static mono line takes
 * the counter's place, because a progress readout for a scroll that isn't
 * happening is furniture, not information.
 */

import { useRef } from "react";
import { handoffs, process as STEPS } from "@/lib/brand";
import { Handoff } from "../Handoff";
import { useSectionView } from "@/components/strata/tier";
import { Stage } from "../Stage";

/**
 * What each step LEAVES BEHIND. brand.ts describes what happens in a step, not
 * what the client is holding afterwards, and the card's footer rule wants the
 * second thing. Keyed by step number so a reorder in brand.ts can't silently
 * mis-pair them. Every line is checkable against the real flow: the brief and
 * the interview are stored, the proposal is fixed-scope, the balance follows
 * approval, and handover is "code, design and assets" after final payment.
 */
const DELIVERABLE: Record<number, string> = {
  1: "Deliverable — a starting layout, chosen not guessed",
  2: "Deliverable — your brief, in writing",
  3: "Deliverable — your answers, on the record",
  4: "Deliverable — fixed scope, timeline and price",
  5: "Deliverable — wireframe, then copy, then the build",
  6: "Deliverable — live on your domain, everything in your name",
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

const CSS = `
/* MOBILE FIRST, DELIBERATELY. The base rules below are the stacked section a
   phone sees; the horizontal deck is added only inside the media query, whose
   three conditions are exactly NLRoot's mount gate (>=1040px, fine pointer,
   motion allowed). Authoring the row first and undoing it for phones is how the
   earlier attempts shipped a 3,400px-wide flex row to a 390px screen. */
[data-nl] .nlpr-root{position:relative;width:100%}
[data-nl] .nlpr-wrap{display:flex;flex-direction:column;gap:30px;padding:clamp(56px,9vh,96px) 0}
[data-nl] .nlpr-head{
  max-width:var(--nl-max);margin:0 auto;width:100%;padding:0 var(--nl-gutter);
  display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;
}
[data-nl] .nlpr-h2{margin:0;font-size:clamp(30px,3.6vw,52px);line-height:1}
[data-nl] .nlpr-scrub{display:none}
[data-nl] .nlpr-static{display:block}
[data-nl] .nlpr-count{font-size:clamp(38px,4.4vw,56px);font-weight:700;letter-spacing:-0.03em;line-height:1}

[data-nl] .nlpr-viewport{position:relative}
[data-nl] .nlpr-track{
  display:flex;flex-direction:column;gap:20px;
  max-width:var(--nl-max);margin:0 auto;padding:0 var(--nl-gutter);
}
[data-nl] .nlpr-card{
  background:var(--nl-bone);border:1px solid var(--nl-r16);border-radius:6px;
  padding:clamp(18px,2.4vh,32px) 28px;
  display:flex;flex-direction:column;gap:clamp(8px,1.2vh,14px);overflow:hidden;
}
[data-nl] .nlpr-card-dark{background:var(--nl-ink-deep);border-color:transparent}
[data-nl] .nlpr-eyebrow{display:flex;align-items:center;gap:10px}
/* The accent as a RULE, never as 11px type: #0891B2 on bone is ~3.4:1, which
   nl.css rules out for text below 16px. The source could tint its eyebrow
   because ember passes on both grounds; ours can't, so the step number is ink
   and the accent survives as the tick beside it. */
[data-nl] .nlpr-tick{display:block;width:16px;height:1px;background:var(--nl-accent)}
[data-nl] .nlpr-num{
  font-family:var(--font-nl-mono),ui-monospace,monospace;font-size:11px;
  letter-spacing:.16em;font-weight:500;color:inherit;
}
[data-nl] .nlpr-time{
  margin-left:auto;font-family:var(--font-nl-mono),ui-monospace,monospace;
  font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--nl-meta);
}
[data-nl] .nlpr-title{margin:0;font-size:26px}
[data-nl] .nlpr-copy{margin:0;font-size:15px;line-height:1.55;color:var(--nl-body)}
/* margin-top:auto pins the instrument to the bottom of a FIXED-height card; on
   a phone the card is auto-height and it is simply inert. min-height:0 is what
   lets overflow:hidden actually clip a flex child at small viewport heights. */
[data-nl] .nlpr-inst{margin-top:auto;display:flex;flex-direction:column;padding-top:4px;flex:0 1 auto;min-height:0;overflow:hidden}
[data-nl] .nlpr-instlabel{
  font-family:var(--font-nl-mono),ui-monospace,monospace;font-size:9.5px;
  letter-spacing:.16em;text-transform:uppercase;color:var(--nl-meta);padding-bottom:8px;
}
[data-nl] .nlpr-deliv{
  font-size:12.5px;line-height:1.4;color:var(--nl-meta);
  padding-top:12px;border-top:1px solid var(--nl-r11);flex:0 0 auto;
}
[data-nl] .nlpr-bar{display:block;border-radius:3px;background:var(--nl-r14)}
[data-nl] .nlpr-mini{
  background:var(--nl-paper);border:1px solid var(--nl-r11);border-radius:4px;
  padding:9px;display:flex;flex-direction:column;gap:5px;flex:1 1 0;min-width:0;
}
[data-nl] .nlpr-mini-on{border-color:var(--nl-accent)}
[data-nl] .nlpr-row{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:clamp(4px,1vh,9px) 0;border-bottom:1px solid var(--nl-r09);
}
[data-nl] .nlpr-rowlabel{font-size:13px;color:inherit;min-width:0}
[data-nl] .nlpr-close{display:flex;flex-direction:column;justify-content:center;gap:16px}
[data-nl] .nlpr-closecopy{margin:0;font-size:19px;line-height:1.4;max-width:30ch;color:inherit}
[data-nl] .nlpr-rail{display:none}
[data-nl] .nlpr-spacer{display:none}

@media (min-width:1040px) and (pointer:fine) and (prefers-reduced-motion: no-preference){
  /* ABSOLUTE, NOT "h-full w-full". Stage's sticky child is
     "display:grid; place-items:center" (nl.css, not mine to change), so its
     (Quotes, not backticks: this comment lives inside a JS template literal
     and a stray backtick terminates it, which is a parse error 60 lines away.)
     single implicit column sizes to MAX-CONTENT — and this scene's max-content
     is the ~3,500px deck. In flow, width:100% therefore resolved against 3,506
     and the centred header drifted a thousand pixels right of the frame while
     overflow:hidden quietly hid the evidence. Taking the root out of flow makes
     the sticky box (100% x 100vh) the containing block, so the header, the rail
     and the deck's window all measure against the VIEWPORT, which is what every
     "max-width:1240px; margin:0 auto" here assumes. */
  [data-nl] .nlpr-root{position:absolute;inset:0;height:auto;width:auto}
  [data-nl] .nlpr-wrap{height:100%;justify-content:center;gap:38px;padding:0}
  [data-nl] .nlpr-scrub{display:flex;align-items:baseline;gap:12px}
  [data-nl] .nlpr-static{display:none}
  /* The frame the deck rides behind. flex:0 0 auto so the track's height never
     gets stretched by the column, which would break the card clamp. */
  [data-nl] .nlpr-viewport{overflow:hidden;flex:0 0 auto}
  [data-nl] .nlpr-track{flex-direction:row;max-width:none;margin:0;will-change:transform}
  /* THESE TWO CLAMPS ARE THE SCENE'S TRAVEL DISTANCE. process() derives its
     translate from track.scrollWidth, so widening a card lengthens the ride. */
  [data-nl] .nlpr-card{flex:0 0 clamp(360px,30vw,620px);height:clamp(360px,58vh,430px)}
  [data-nl] .nlpr-close{flex:0 0 clamp(320px,24vw,520px);height:clamp(360px,58vh,430px);padding-right:var(--nl-gutter)}
  [data-nl] .nlpr-rail{display:block;max-width:var(--nl-max);margin:0 auto;width:100%;padding:0 var(--nl-gutter)}
  [data-nl] .nlpr-railtrack{position:relative;height:2px;background:var(--nl-r14)}
  [data-nl] .nlpr-spacer{display:block}
}
`;

/* ── the instruments ───────────────────────────────────────────────────────
   One per card, all wireframe. Nothing below reports a result, a client or a
   number we have not published; where a mock shows content it says so. */

/** 01 — three sample page layouts, one picked. */
function InstLayouts() {
  return (
    <>
      <span className="nlpr-instlabel">Sample layouts</span>
      <div className="flex gap-2">
        {[true, false, false].map((on, i) => (
          <div key={i} className={`nlpr-mini ${on ? "nlpr-mini-on" : ""}`}>
            <span className="nlpr-bar" style={{ height: 4, width: "70%" }} />
            <span className="nlpr-bar" style={{ height: 4, width: "88%" }} />
            <span
              className="mt-auto block rounded-[2px]"
              style={{
                height: 12,
                width: on ? "62%" : "44%",
                background: on ? "var(--nl-accent)" : "var(--nl-r14)",
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

/** 02 — the brief, as a form skeleton. Labels, not answers. */
function InstBrief() {
  return (
    <>
      <span className="nlpr-instlabel">What the brief asks</span>
      {[
        ["Goal", "78%"],
        ["Offer", "92%"],
        ["Audience", "64%"],
        ["Deadline", "40%"],
      ].map(([label, w]) => (
        <div key={label} className="nlpr-row">
          <span className="nlpr-rowlabel">{label}</span>
          <span className="nlpr-bar" style={{ height: 5, width: w, flex: "0 0 auto" }} />
        </div>
      ))}
    </>
  );
}

/** 03 — one exchange from the ten-question interview. Marked as a sample. */
function InstInterview() {
  return (
    <>
      <span className="nlpr-instlabel">Sample exchange · 2 of 10</span>
      <div className="flex flex-col gap-[7px]">
        <span
          className="rounded-[4px] px-[10px] py-[7px]"
          style={{ background: "var(--nl-accent-soft)", fontSize: 12.5, lineHeight: 1.4 }}
        >
          What is the one thing you do better than anyone else in your market?
        </span>
        <span
          className="self-end rounded-[4px] px-[10px] py-[7px]"
          style={{
            background: "var(--nl-paper)",
            border: "1px solid var(--nl-r11)",
            fontSize: 12.5,
            lineHeight: 1.4,
            color: "var(--nl-body)",
          }}
        >
          Same-week turnaround. Nobody near us matches it.
        </span>
      </div>
    </>
  );
}

/**
 * 04 — the proposal's shape. THE FIGURE IS A RULE, NOT A NUMBER: law 4 keeps
 * every price in brand.ts and out of this stage entirely, and the pricing ledger
 * is the only place on the page that prints one.
 */
function InstProposal() {
  return (
    <>
      <span className="nlpr-instlabel">What the proposal fixes</span>
      <div className="flex flex-col gap-[7px]">
        {["Scope, line by line", "Delivery window", "Revision rounds"].map((t) => (
          <div key={t} className="flex items-center gap-[10px]">
            <span className="block h-[5px] w-[5px] rounded-full" style={{ background: "var(--nl-accent)" }} />
            <span style={{ fontSize: 12.5, color: "var(--nl-body)" }}>{t}</span>
          </div>
        ))}
        <div
          className="mt-[6px] flex items-center justify-between gap-3 pt-[9px]"
          style={{ borderTop: "1px solid var(--nl-r11)" }}
        >
          <span className="nlpr-num">Fixed price</span>
          <span className="nlpr-bar" style={{ height: 9, width: 74, flex: "0 0 auto" }} />
        </div>
      </div>
    </>
  );
}

/** 05 — a round of notes, in writing. Clearly labelled sample copy. */
function InstReview() {
  return (
    <>
      <span className="nlpr-instlabel">Sample notes, round 01</span>
      {["Lead with the guarantee, not the logo", "Shorter headline on mobile"].map((t, i) => (
        <div key={t} className="nlpr-row">
          <span className="nlpr-rowlabel">{t}</span>
          <span
            className="nlpr-num"
            style={{ color: "var(--nl-meta)", flex: "0 0 auto" }}
          >
            {pad2(i + 1)}
          </span>
        </div>
      ))}
    </>
  );
}

/** 06 — what actually happens at launch. Contract facts, not outcomes. */
function InstLaunch() {
  return (
    <>
      <span className="nlpr-instlabel">At launch</span>
      {["Live on your domain", "Tracking spine running", "Everything in your name"].map((t) => (
        <div key={t} className="nlpr-row">
          <span className="nlpr-rowlabel" style={{ color: "var(--nl-body)" }}>
            {t}
          </span>
          <span
            aria-hidden
            className="block h-[5px] w-[5px] rounded-full"
            style={{ background: "var(--nl-green)", flex: "0 0 auto" }}
          />
        </div>
      ))}
    </>
  );
}

const INSTRUMENT: Record<number, () => React.ReactElement> = {
  1: InstLayouts,
  2: InstBrief,
  3: InstInterview,
  4: InstProposal,
  5: InstReview,
  6: InstLaunch,
};

export function Process() {
  const ref = useRef<HTMLDivElement | null>(null);
  // THE ANALYTICS CONTRACT. Historical funnel reports key off this exact
  // string; "how-it-works" (the DOM id) and "how_it_works" (the event) are
  // deliberately spelled differently and neither may be tidied to match.
  useSectionView(ref, "how_it_works");

  return (
    <>
      <Stage name="process" height={360} label="Process" id="how-it-works" bg="#ece6d7">
      <div ref={ref} className="nlpr-root" style={{ background: "var(--nl-ground-panel)" }}>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />

        <div className="nlpr-wrap">
          <div className="nlpr-head">
            <h2 className="nl-h2 nlpr-h2">
              Six steps.
              <br />
              Zero meetings.
            </h2>

            {/* The engine readout. Desktop only — see .nlpr-scrub. */}
            <div className="nlpr-scrub">
              <span className="nl-mono" style={{ color: "var(--nl-meta)" }}>
                Step
              </span>
              {/* data-steps is the counter's ceiling. The engine reads it and
                  runs 01 -> that value across the deck; brand.ts owns the
                  number, this file only forwards it. */}
              <span
                data-anim="daycount"
                data-steps={STEPS.length}
                data-tnum
                className="nl-num nlpr-count"
              >
                01
              </span>
              <span className="nl-mono" style={{ color: "var(--nl-meta)" }}>
                / {pad2(STEPS.length)}
              </span>
            </div>

            {/* Its stacked-section counterpart: the same fact, no scrubbing. */}
            <span className="nl-mono nlpr-static" style={{ color: "var(--nl-meta)" }}>
              {pad2(STEPS.length)} steps · all of it in writing
            </span>
          </div>

          <div className="nlpr-viewport">
            <div data-anim="track" className="nlpr-track">
              {STEPS.map((s) => {
                const Inst = INSTRUMENT[s.step];
                const dark = s.step === STEPS.length;
                return (
                  <article
                    key={s.step}
                    className={`nlpr-card ${dark ? "nlpr-card-dark" : ""}`}
                    // The last card inverts, so it must re-point the whole token
                    // ladder — accent, body, meta and every hairline. Painting it
                    // navy without this leaves navy-on-navy meta text.
                    {...(dark ? { "data-tone": "dark" as const } : {})}
                  >
                    <div className="nlpr-eyebrow">
                      <span className="nlpr-num">{pad2(s.step)}</span>
                      <span className="nlpr-tick" aria-hidden />
                      <span className="nlpr-time">{s.timeline}</span>
                    </div>
                    <h3 className="nl-h3 nlpr-title">{s.title}</h3>
                    <p className="nlpr-copy">{s.description}</p>
                    <div className="nlpr-inst">{Inst ? <Inst /> : null}</div>
                    <span className="nlpr-deliv">{DELIVERABLE[s.step]}</span>
                  </article>
                );
              })}

              {/* The closing panel. Replaces the source's "two builds a month"
                  capacity claim; this is the one thing the section can say about
                  itself that is verifiable in brand.ts and in the payment flow. */}
              <aside className="nlpr-close">
                <span className="nl-mono" style={{ color: "var(--nl-meta)" }}>
                  Start to finish
                </span>
                <p className="nlpr-closecopy">
                  {/* TWO REPEATS OUT, ONE MISSING ANSWER IN. This closing panel
                      said "nothing here needs a meeting" — which the h2 above
                      it says at 52px — and restated the payment terms, which
                      the pricing ledger states beside the actual numbers.

                      What it says instead is the answer to the objection this
                      page never handled anywhere a human could read it: "am I
                      technical enough?" The answer was written, and it lived
                      only inside a FAQ that renders as JSON-LD. This section
                      already owns the per-step time costs, so it is where the
                      answer belongs. */}
                  Every step above happens in writing, on your schedule. All we need to start is
                  your logo, your colours and about ten minutes.
                </p>
              </aside>

              {/* THE SPACER. Authored so process() adopts it instead of
                  appendChild-ing its own node into React's tree. The engine
                  overwrites this flex value every frame; 0 is only the SSR
                  state. Must stay last. */}
              <div
                data-trackspacer="1"
                aria-hidden
                className="nlpr-spacer"
                style={{ flex: "0 0 0px", height: 1 }}
              />
            </div>
          </div>

          {/* THE RAIL. The fill is a percentage of its parent's width, so the
              parent is the bare 2px measure and the page gutter is paid one
              level up — otherwise a 100% fill would run past the rule by exactly
              the gutter. */}
          <div className="nlpr-rail">
            <div className="nlpr-railtrack">
              <div
                data-anim="trackbar"
                className="absolute bottom-0 left-0 top-0"
                style={{ width: "0%", background: "var(--nl-accent)" }}
              />
            </div>
          </div>
        </div>
      </div>
      </Stage>

      {/* THE EXIT FROM "HOW IT WORKS". This is the section a ready buyer scrolls
          to in order to find out how to start, and it explained six steps
          without offering step one. Outside the Stage for the same reason as
          the anatomy deck: a pinned scene has no room for an action, and the
          rail underneath already reads 06 / 06 by the time the reader gets
          here. */}
      <div style={{ background: "var(--nl-ground-panel)", paddingBottom: 8 }}>
        <Handoff line={handoffs.process.line} location={handoffs.process.location} />
      </div>
    </>
  );
}
