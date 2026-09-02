/**
 * SP5 — THE TYPE CASE (design band). THE PRESSRUN · Act I.
 *
 * A compositor's drawer, full width on the bed: 24 sort cells behind brass
 * dividers, each holding a REAL element specimen set in ink — no lorem, no
 * abstractions. ONE cell per drawer is freshly inked (FRESH INK, wet cyan).
 * Approved h2/body verbatim; the three lab plates retire. RSC — zero
 * client JS beyond the CutSection shell.
 */

import type { ReactNode } from "react";
import { CutSection } from "../Cut";

const display = {
  fontFamily: "var(--font-strata-display)",
  fontWeight: 700,
} as const;

type Sort = { tag: string; body: ReactNode; wet?: boolean };

const SORTS: Sort[] = [
  {
    tag: "DISPLAY 52",
    body: <span className="text-[46px] leading-none" style={display}>Aa</span>,
  },
  {
    tag: "CHAPTER 28",
    body: <span className="text-[28px] leading-none" style={display}>Aa</span>,
  },
  {
    tag: "BODY 17",
    body: (
      <span className="text-[17px] leading-snug" style={{ fontFamily: "var(--font-strata-body)" }}>
        Aa — readable at arm&rsquo;s length
      </span>
    ),
  },
  {
    tag: "MONO 11",
    body: <span className="st-mono">LABEL · TICKET · SPEC</span>,
  },
  {
    tag: "ITALIC — RATIONED",
    body: (
      <span className="text-[30px] italic leading-none text-strata-seam" style={display}>
        fine
      </span>
    ),
  },
  {
    tag: "NUMERALS — TABULAR",
    body: (
      <span className="text-[26px] leading-none" style={{ ...display, fontVariantNumeric: "tabular-nums lining-nums" }}>
        0123456789
      </span>
    ),
  },
  {
    tag: "BUTTON — THE PRESS",
    wet: true,
    body: (
      <span className="st-btn st-btn-seam pointer-events-none !h-10 px-4 !text-[12px]">
        Start your brief
      </span>
    ),
  },
  {
    tag: "BUTTON — HAIRLINE",
    body: (
      <span className="st-btn st-btn-hairline pointer-events-none !h-10 px-4 !text-[12px]">
        Browse the demos
      </span>
    ),
  },
  {
    tag: "STAMP",
    body: <span className="pr-stamp !text-[9px]">ON THE PRESS</span>,
  },
  {
    tag: "INPUT",
    body: (
      <span className="block w-full border-b-2 border-strata-seam pb-1 st-mono text-strata-ink-mute">
        YOUR BUSINESS_
      </span>
    ),
  },
  {
    tag: "LINK",
    body: (
      <span className="text-[15px] text-strata-seam underline underline-offset-4" style={{ fontFamily: "var(--font-strata-ui)" }}>
        See an example →
      </span>
    ),
  },
  {
    tag: "RULE — DOUBLE",
    body: (
      <span className="block w-full">
        <span className="block h-[3px] w-full bg-strata-ink" />
        <span className="mt-1.5 block h-px w-full bg-strata-ink" />
      </span>
    ),
  },
  {
    tag: "REG MARK",
    body: <span className="pr-regmark inline-block scale-90" />,
  },
  {
    tag: "DENSITY STEPS",
    body: (
      <span className="flex gap-1">
        {["#0B1B3A", "#3a4a6b", "#0891B2", "#7cc5d8", "#e3f2f6"].map((c) => (
          <span key={c} className="h-8 w-5" style={{ background: c }} />
        ))}
      </span>
    ),
  },
  {
    tag: "INK / PAPER / PLATE",
    body: (
      <span className="flex gap-1.5">
        <span className="h-8 w-8 bg-strata-ink" />
        <span className="h-8 w-8 border border-strata-hairline bg-strata-bone" />
        <span className="h-8 w-8 bg-strata-seam" />
      </span>
    ),
  },
  {
    tag: "SPACING — 8 / 16 / 24",
    body: (
      <span className="block space-y-1.5">
        {[8, 16, 24].map((s) => (
          <span key={s} className="block h-1.5 bg-strata-ink/25" style={{ width: s * 3 }} />
        ))}
      </span>
    ),
  },
  {
    tag: "TICKET PUNCH",
    body: (
      <span
        className="inline-block h-4 w-4 rounded-full"
        style={{ boxShadow: "inset 0 1px 2px rgba(11,27,58,.35), 0 0 0 1.5px rgba(11,27,58,.25)" }}
      />
    ),
  },
  {
    tag: "TEAR LINE",
    body: <span className="block w-full border-t-2 border-dashed border-[rgba(17,17,17,0.25)]" />,
  },
  {
    tag: "QUOTES",
    body: <span className="text-[38px] leading-none" style={display}>&ldquo;&nbsp;&rdquo;</span>,
  },
  {
    tag: "LEADER LINE",
    body: (
      <span className="st-mono-sm flex items-center gap-2 text-strata-ink-mute">
        <span className="inline-block h-px w-12 bg-strata-seam" />
        ST.02
      </span>
    ),
  },
  {
    tag: "CHECK ROW",
    body: (
      <span className="st-body flex gap-3 !text-[14px] text-strata-ink-body">
        <span aria-hidden className="mt-[0.7em] h-px w-4 shrink-0 bg-strata-seam" />
        Wired to your CRM
      </span>
    ),
  },
  {
    tag: "FOCUS RING",
    body: (
      <span
        className="st-mono-sm inline-block px-3 py-2 text-strata-ink-mute"
        style={{ outline: "2px solid #111", outlineOffset: 2 }}
      >
        FOCUSED
      </span>
    ),
  },
  {
    tag: "SELECTION",
    body: (
      <span className="st-body !text-[15px]" style={{ background: "rgba(8,145,178,.18)" }}>
        selected text
      </span>
    ),
  },
  {
    tag: "CAPTION",
    body: (
      <span className="st-mono-sm text-strata-ink-mute">
        FIG. 02 — SET BY HAND
      </span>
    ),
  },
];

export function Band05Design() {
  return (
    <CutSection
      band="design"
      className="st-grain st-rays st-column-shallow-3 relative text-strata-ink"
    >
      <div className="st-bed py-20 lg:py-28">
        <div className="flex items-baseline justify-between">
          <p className="st-mono text-strata-ink-mute">
            ST.02 / THE TYPE CASE — A SYSTEM, NOT A SKIN
          </p>
          <p className="st-mono-sm hidden text-strata-ink-mute sm:block">
            INCLUDED: EVERY TIER
          </p>
        </div>
        <div className="st-score mt-3" />

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
          <div className="st-open self-start lg:sticky lg:top-24">
            <h2 className="st-chapter">
              Premium isn&rsquo;t a look. It&rsquo;s a system.
            </h2>
            <p className="st-body mt-6 text-strata-ink-body">
              A type scale with intent. A spacing rhythm that holds under
              pressure. A color discipline that makes one button impossible
              to miss. Built for your brand — not borrowed from a template
              eleven of your competitors already use.
            </p>
            <p className="st-mono-sm mt-6 text-strata-ink-mute">
              THE DRAWER — 24 SORTS, EVERY ONE FROM THIS PAGE
            </p>
          </div>

          {/* THE DRAWER — brass dividers, paper cells */}
          <div
            className="st-open grid grid-cols-2 gap-px border p-px sm:grid-cols-3 min-[1700px]:grid-cols-4"
            style={{ background: "#20242B", borderColor: "#20242B" }}
            data-cut-step="1"
          >
            {SORTS.map((s) => (
              <figure
                key={s.tag}
                className="relative flex min-h-[8.5rem] flex-col justify-between gap-3 p-4"
                style={{
                  background: s.wet ? "color-mix(in srgb, #22D3EE 9%, #F3EFE4)" : "var(--color-strata-paper2)",
                  boxShadow: s.wet ? "inset 0 0 24px rgba(34,211,238,.12)" : undefined,
                }}
              >
                {s.wet && (
                  <span
                    className="st-mono-sm absolute right-2 top-2"
                    style={{ color: "#0891B2" }}
                  >
                    FRESH INK ●
                  </span>
                )}
                <span className="flex min-h-[3.5rem] items-center">{s.body}</span>
                <figcaption className="st-mono-sm text-strata-ink-mute">
                  {s.tag}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </CutSection>
  );
}
