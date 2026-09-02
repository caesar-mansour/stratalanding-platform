"use client";

/**
 * THE MATH — a worksheet the reader fills in, not a claim we make.
 *
 * PAPER REGISTER: ledger head, ruled full-bleed rows, native range inputs
 * (nl.css already styles them, accent-color and all). Four sliders, one
 * bottom line.
 *
 * ─── WHY THIS IS A CLIENT COMPONENT NOW ────────────────────────────────────
 * It used to be a server component whose eight read-outs were written by
 * NLEngine.paintCalc()/tickCalc() through [data-anim] hooks. That engine mounts
 * on tier B ONLY — desktop, fine pointer, motion allowed. Which meant that on
 * every phone, and on every desktop with prefers-reduced-motion set, the four
 * sliders dragged, the thumbs moved, and NOT ONE NUMBER CHANGED. The read-outs
 * sat frozen at their SSR defaults under a heading that says "Set four numbers ·
 * read the bottom line". The single highest-intent section on the page was
 * inert for most of the traffic it was written for.
 *
 * So React owns the arithmetic now, on every tier, and the [data-anim] output
 * hooks are gone — deliberately, and recorded in nl-gate's divergence map. Two
 * writers on one node is the exact bug the one-writer law exists to prevent, so
 * the engine may not keep a claim on these spans.
 *
 * WHAT THE ENGINE STILL OWNS: nothing here. [data-anim="calcin"] stays on the
 * inputs, but only because Watching's session recorder matches that selector to
 * notice a drag. paintCalc() finds no output nodes and is a no-op.
 *
 * THE LERP IS REPRODUCED, NOT DROPPED. tickCalc eased the three derived figures
 * toward their target at 0.14 per frame with a 0.4 snap threshold; useLerpTrio
 * below is the same two constants, so the count-up reads identically to the
 * approved design — and it snaps instantly under prefers-reduced-motion, which
 * the engine version could not do because it never ran there at all.
 *
 * r and a are stored as TENTHS of a percent (12 -> 1.2%) because a range input
 * cannot step by 0.1 reliably across browsers.
 *
 * ─── THE BENCHMARK THAT IS NOT HERE ────────────────────────────────────────
 * The approved source hardcoded the after-rate at 6.4% and captioned it "the
 * median across the last eleven builds". StrataLanding has never measured
 * eleven builds; that number was a fiction inherited from a fictional studio,
 * and shipping it would have put a fabricated benchmark on the one section
 * whose entire pitch is "your numbers, not ours".
 *
 * So the after-rate became row 04: the reader sets the rate they are AIMING
 * for, it is labelled as their assumption, and the bottom line says in mono
 * that it is a model of their four inputs and nothing else. There is no median,
 * no client average, and no implied promise anywhere in this section.
 *
 * The payback cell reads the build cost from the highest tier in brand.ts — so
 * it cannot drift from published pricing.
 */

import { useEffect, useRef, useState } from "react";
import { useSectionView } from "@/components/strata/tier";
import { handoffs, pricing } from "@/lib/brand";
import { Handoff } from "../Handoff";
import { LedgerHead } from "../LedgerHead";

/** Slider defaults. `r` and `a` are tenths of a percent. */
const D = { v: 3000, r: 12, c: 780, a: 30 } as const;

/* The component below is called Math, which shadows the global for this whole
   module (function declarations hoist to module scope). M is the real one. */
const M = globalThis.Math;

const priceNum = (p: string) => Number(p.replace(/[^0-9.]/g, ""));
const us = (n: number) => M.round(n).toLocaleString("en-US");

const CSS = `
[data-nl] .nlm-row{transition:padding .5s var(--nl-ease),background-color .4s ease}
[data-nl] .nlm-row:hover{padding-left:48px;background-color:var(--nl-r06)}
/* Three cells, so the 1px-gap grid may only ever be 1 or 3 columns wide —
   a 2-column pass would strand the third and expose the hairline ground. */
[data-nl] .nlm-out{grid-template-columns:minmax(0,1fr)}
@media (min-width:900px){[data-nl] .nlm-out{grid-template-columns:repeat(3,minmax(0,1fr))}}
@supports (animation-timeline: view()){
  [data-nl] [data-reveal].nlm-lag{animation-range:entry 14% cover 30%}
}
@media (prefers-reduced-motion: reduce){[data-nl] .nlm-row{transition:none}}
`;

/** The four rows, in the order the reader meets them. `fmt` renders the value
 *  the reader sees; it runs on the server for the default and on every input
 *  after that, so SSR and the first client paint cannot disagree. */
const ROWS = [
  {
    k: "v" as const,
    label: "Monthly visitors",
    sub: "What you already pay to reach",
    min: 300,
    max: 20000,
    step: 100,
    fmt: (n: number) => us(n),
  },
  {
    k: "r" as const,
    label: "Your conversion rate today",
    sub: "Visitors who turn into an enquiry or a sale",
    min: 2,
    max: 60,
    step: 1,
    fmt: (n: number) => (n / 10).toFixed(1) + "%",
  },
  {
    k: "c" as const,
    label: "Value of one new customer",
    sub: "First-year revenue, not a single transaction",
    min: 100,
    max: 8000,
    step: 20,
    fmt: (n: number) => "$" + us(n),
  },
  {
    k: "a" as const,
    label: "The rate you're aiming for",
    sub: "Your assumption — we are not promising this number",
    min: 10,
    max: 200,
    step: 1,
    fmt: (n: number) => (n / 10).toFixed(1) + "%",
  },
];

/** The three derived figures, eased toward their target exactly as the engine's
 *  tickCalc did — 0.14 of the remaining distance per frame, snapping inside
 *  0.4 — so the count-up is the approved one. Under prefers-reduced-motion it
 *  jumps straight to the target, which the engine could never do here because
 *  it does not mount when that preference is set. */
interface Trio {
  now: number;
  aft: number;
  gap: number;
}
const KEYS = ["now", "aft", "gap"] as const;

function useLerpTrio(target: Trio): Trio {
  const [shown, setShown] = useState<Trio>(target);
  const targetRef = useRef(target);
  const shownRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  targetRef.current = target;

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      shownRef.current = targetRef.current;
      setShown(targetRef.current);
      return;
    }

    const step = () => {
      const t = targetRef.current;
      const cur = shownRef.current;
      const next: Trio = { ...cur };
      let moved = false;
      for (const k of KEYS) {
        const d = t[k] - cur[k];
        if (M.abs(d) > 0.4) {
          next[k] = cur[k] + d * 0.14;
          moved = true;
        } else if (cur[k] !== t[k]) {
          next[k] = t[k];
          moved = true;
        }
      }
      if (!moved) {
        rafRef.current = null;
        return;
      }
      shownRef.current = next;
      setShown(next);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [target.now, target.aft, target.gap]);

  return shown;
}

/** Read once at module scope: the build the payback cell is measured against.
 *  By VALUE from brand.ts, so adding or reordering a tier cannot strand a stale
 *  price here — the same rule the hero's "from" price obeys. */
const TOP = pricing.reduce((a, b) => (priceNum(b.price) > priceNum(a.price) ? b : a));
const BUILD = priceNum(TOP.price);

export function Math() {
  /* The worksheet is the highest-intent surface on the page and it reported no
     reach at all — so its handoff's cta_click had no denominator. */
  const ref = useRef<HTMLElement>(null);
  useSectionView(ref, "the_math");

  const [v, setV] = useState<number>(D.v);
  const [r, setR] = useState<number>(D.r);
  const [c, setC] = useState<number>(D.c);
  const [a, setA] = useState<number>(D.a);
  const set = { v: setV, r: setR, c: setC, a: setA };
  const val = { v, r, c, a };

  // The arithmetic, unchanged from what the engine ran — just in one place now.
  const now = (v * (r / 10)) / 100;
  const aim = (v * (a / 10)) / 100;
  const gap = M.max(0, (aim - now) * c);

  const eased = useLerpTrio({ now, aft: aim, gap });
  const days = eased.gap > 0 ? M.max(1, M.round(BUILD / (eased.gap / 30))) : 0;

  return (
    <section
      ref={ref}
      id="math"
      data-screen-label="The math"
      data-bg="#f6f3ec"
      className="nl-section"
      style={{ background: "var(--nl-ground-bone)", paddingBottom: 120 }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <LedgerHead label="The math" meta="Your numbers · not ours" />

      {/* Full-bleed to the viewport, not to the 1240 column — a worksheet is a
          sheet of paper, and the rules have to reach both edges of it. */}
      <div className="nl-bleed flex flex-col">
        <div
          className="flex flex-wrap items-end justify-between gap-[34px]"
          style={{ padding: "0 var(--nl-gutter) 26px" }}
        >
          <h2 className="nl-h2 m-0" style={{ fontSize: "clamp(30px,3.6vw,50px)", maxWidth: "16ch" }}>
            <span className="block overflow-hidden">
              <span data-reveal className="block">
                Do the arithmetic
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-reveal className="nlm-lag block">
                before you brief us.
              </span>
            </span>
          </h2>
          <span
            className="nl-mono text-right"
            style={{ color: "var(--nl-meta)", lineHeight: 1.9 }}
          >
            Worksheet 01 — your own model
            <br />
            Set four numbers · read the bottom line
          </span>
        </div>

        {ROWS.map((row, i) => (
          <div
            key={row.k}
            data-row
            data-nrw="32px 1fr"
            className="nlm-row grid items-center"
            style={{
              gridTemplateColumns: "32px minmax(200px,1fr) minmax(180px,0.9fr) 150px",
              gap: 24,
              padding: "20px var(--nl-gutter)",
              borderTop: "1px solid var(--nl-r16)",
            }}
          >
            <span data-tnum className="nl-num text-[10.5px] tracking-[0.16em]" style={{ color: "var(--nl-meta)" }}>
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="flex flex-col gap-[3px]">
              <label
                htmlFor={`nlm-${row.k}`}
                style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em" }}
              >
                {row.label}
              </label>
              <span style={{ fontSize: 12.5, color: "var(--nl-meta)" }}>{row.sub}</span>
            </div>

            {/* data-anim="calcin" is kept, and it is the ONLY engine hook left
                in this section: Watching's session recorder matches that exact
                selector to notice that the reader dragged something. The engine
                also still listens on it, harmlessly — paintCalc finds no output
                nodes to write. React is the single writer of every figure. */}
            <input
              id={`nlm-${row.k}`}
              data-anim="calcin"
              data-k={row.k}
              data-cursor="Pull"
              type="range"
              min={row.min}
              max={row.max}
              step={row.step}
              value={val[row.k]}
              onChange={(e) => set[row.k](parseFloat(e.target.value))}
              aria-label={row.label}
            />

            <span
              data-tnum
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                textAlign: "right",
              }}
            >
              {row.fmt(val[row.k])}
            </span>
          </div>
        ))}

        {/* THE READ-OUT. Every cell is arithmetic on the four values above. */}
        <div
          className="nlm-out grid"
          style={{ gap: 1, background: "var(--nl-r16)", borderTop: "1px solid var(--nl-r16)" }}
        >
          {[
            { key: "now", text: us(eased.now), label: "Converting now, per month" },
            { key: "aft", text: us(eased.aft), label: "Converting at the rate you set" },
            {
              key: "pay",
              text: days > 365 || days === 0 ? "—" : `${days} ${days === 1 ? "day" : "days"}`,
              label: `To cover a ${TOP.name} build, at the gap above`,
            },
          ].map((cell) => (
            <div
              key={cell.key}
              className="flex flex-col gap-[5px]"
              style={{ background: "var(--nl-panel)", padding: "26px var(--nl-gutter)" }}
            >
              <span data-tnum style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.04em" }}>
                {cell.text}
              </span>
              <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
                {cell.label}
              </span>
            </div>
          ))}
        </div>

        {/* THE BOTTOM LINE. Dark ground, so data-tone flips the ladder and the
            accent goes to its blaze value — the one place on this section where
            the accent carries display type. */}
        <div
          data-row
          data-tone="dark"
          className="flex flex-wrap items-center justify-between gap-7"
          style={{ background: "var(--nl-ink-deep)", padding: 34 }}
        >
          <div className="flex flex-col gap-[7px]">
            <span className="nl-mono" style={{ color: "var(--nl-accent)" }}>
              The monthly gap your own numbers describe
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--nl-meta)", maxWidth: "46ch" }}>
              A model, not a forecast. It multiplies the four values you set above and nothing
              else — the rate you are aiming for is your assumption, and whether a page can reach
              it depends on your offer as much as the build.
            </span>
            <span className="nl-mono-xs" style={{ color: "var(--nl-faint)" }}>
              Built entirely from your four inputs · no median, no benchmark, no client data
            </span>
          </div>
          <span
            data-tnum
            className="nl-display"
            style={{ fontSize: "clamp(52px,7.4vw,116px)", color: "var(--nl-accent)" }}
          >
            ${us(eased.gap)}
          </span>
        </div>

        {/* THE EXIT. This is the highest-intent moment on the page — the reader
            has just watched a dollar figure assemble itself out of their OWN
            four numbers — and until now it terminated in a disclaimer. A
            visitor who has just quantified their own monthly loss and is given
            nothing to click has been persuaded and then abandoned, which is the
            most expensive kind of dead end a page can have. */}
        <Handoff line={handoffs.math.line} location={handoffs.math.location} />
      </div>
    </section>
  );
}
