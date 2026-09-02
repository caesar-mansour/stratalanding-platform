"use client";

/**
 * SP8 — THE INK ROOM (pricing). THE PRESSRUN · Act II, the dark passage.
 *
 * Contract frame: scratchpad/pressbook/sp8-inkroom.png. Three proof sheets
 * pinned under three hanging lamps — the sheets are the page's luminance
 * peak (paper at full brightness against the room's navy). Registration
 * blocks carry the honest plate map per tier; prices at monument scale.
 * Below: the press INVOICE (deposit → approval → balance) and THE JOB
 * DOCKET (12 questions, parity with faqPageSchema). pricing + #pricing +
 * trackPlanSelect kept verbatim. Prices exist ONLY here (law).
 */

import { useRef } from "react";
import Link from "next/link";
import { pricing, pricingFAQ, scopeNote, cta } from "@/lib/brand";
import { trackPlanSelect, trackCtaClick } from "@/lib/analytics";
import { useSectionView, useCut } from "../tier";

const SLUG_TO_PKG = {
  "presence-page": "starter",
  "lead-page": "growth",
  "purchase-page": "scale",
} as const;

const STRATA_CODES = ["01", "02", "03", "04", "05", "06", "07", "08"];
const FILLS: Record<string, number[]> = {
  "presence-page": [1, 1, 0, 1, 0.5, 0, 0.35, 1],
  "lead-page": [1, 1, 1, 1, 1, 1, 0.7, 1],
  "purchase-page": [1, 1, 1, 1, 1, 1, 1, 1],
};
const DEPTH_LINE: Record<string, string> = {
  "presence-page": "DRILLS 5 OF 8 STRATA · 1 PAGE",
  "lead-page": "DRILLS ALL 8 STRATA · 2 PAGES",
  "purchase-page": "DRILLS ALL 8 STRATA · 3–5 PAGE FLOW",
};

export function Band14Bedrock() {
  const ref = useRef<HTMLElement | null>(null);
  useSectionView(ref, "pricing");
  useCut(ref);

  return (
    <section
      ref={ref}
      id="pricing"
      data-strata-band="bedrock"
      data-strata-act="ink"
      className="st-grain st-grain-deep st-column-floor relative text-strata-bone-body"
    >
      {/* the ink room owns the fixed chrome while the act runs */}
      <div data-strata-deep hidden aria-hidden />

      {/* the three hanging lamps — Act II's only light sources */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-full lg:block">
        <div className="pr-lamp" style={{ left: "22%" }}>
          <span className="cord" /><span className="pool" /><span className="shade" />
        </div>
        <div className="pr-lamp" data-bright style={{ left: "50%" }}>
          <span className="cord" /><span className="pool" /><span className="shade" />
        </div>
        <div className="pr-lamp" style={{ left: "78%" }}>
          <span className="cord" /><span className="pool" /><span className="shade" />
        </div>
      </div>

      <div className="st-bed relative py-24 lg:py-32">
        <div className="flex items-baseline justify-between">
          <p className="st-mono text-strata-bone-mute">
            THE INK ROOM — WHERE THE PRICE IS SET
          </p>
          <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
            FIXED SCOPE · FIXED PRICE · NO CALLS
          </p>
        </div>
        <div className="st-score mt-3 !bg-strata-hairline-deep" />

        <h2 className="st-chapter mt-8 max-w-[24ch] text-strata-bone">
          Three proofs. Locked{" "}
          <em className="italic text-strata-live">in register.</em> Nothing
          hidden.
        </h2>

        {/* THE PROOFS — pinned, lit, one per lamp */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-10">
          {pricing.map((p, i) => (
            <article
              key={p.slug}
              className={`st-open pr-proof flex flex-col p-8 lg:p-9 ${
                p.highlighted ? "lg:-mt-6" : ""
              }`}
              data-brightest={p.highlighted || undefined}
              data-cut-step={i + 1}
            >
              <span className="pr-sheet-pin" aria-hidden />
              {p.highlighted && (
                <p className="pr-stamp mb-5 self-start !text-[9px]">
                  BRIGHTEST PROOF ON THE LINE — RECOMMENDED
                </p>
              )}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="st-mono text-strata-ink">{p.name.toUpperCase()}</h3>
                  <p
                    className="mt-4 text-[clamp(3.1rem,4.4vw,5.5rem)] leading-none text-strata-ink"
                    style={{
                      fontFamily: "var(--font-strata-price)",
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums lining-nums",
                    }}
                  >
                    {p.price}
                  </p>
                  <p className="st-mono-sm mt-3 text-strata-ink-mute">
                    {DEPTH_LINE[p.slug]}
                  </p>
                </div>
                {/* the core column */}
                <div className="flex shrink-0 gap-1" aria-hidden>
                  <div className="flex flex-col gap-[3px]">
                    {FILLS[p.slug].map((f, j) => (
                      <div
                        key={j}
                        className="h-4 w-5 border border-strata-hairline"
                      >
                        <div
                          className="h-full bg-strata-seam"
                          style={{ width: `${f * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-[3px]">
                    {STRATA_CODES.map((c) => (
                      <span
                        key={c}
                        className="st-mono-sm flex h-4 items-center !text-[7px] text-strata-ink-mute"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="st-body mt-5 !text-[15px] text-strata-ink-body">
                {p.description}
              </p>

              <ul className="mt-6 flex-1 space-y-2 border-t border-strata-hairline pt-5">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="st-body flex gap-3 !text-[14px] text-strata-ink-body"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.65em] h-px w-3 shrink-0 bg-strata-seam"
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <p className="st-mono-sm mt-5 text-strata-ink-mute">
                DELIVERY: {p.delivery.toUpperCase()}
              </p>

              <Link
                href={`/brief?plan=${p.slug}`}
                className={`st-btn mt-6 w-full ${
                  p.highlighted ? "st-btn-seam" : "st-btn-hairline"
                }`}
                onClick={() => {
                  trackPlanSelect(SLUG_TO_PKG[p.slug as keyof typeof SLUG_TO_PKG]);
                  // "pricing", not the "home" default. This band ships on the
                  // /pricing route, so every click it reported was labelled as
                  // coming from the homepage — the one comparison that route's
                  // funnel data exists to make.
                  trackCtaClick(
                    "pricing",
                    p.highlighted ? "primary" : "secondary",
                    `/brief?plan=${p.slug}`,
                    "pricing"
                  );
                }}
              >
                {cta.primary.label}
              </Link>
            </article>
          ))}
        </div>

        {/* THE INVOICE — the risk reversal, torn from the docket */}
        <div className="st-open pr-invoice mt-16 p-8" data-cut-step="2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="st-mono whitespace-nowrap text-strata-bone">
              50% DEPOSIT — THE PRESS STARTS
            </span>
            <span className="h-px min-w-8 flex-1 bg-strata-seam" aria-hidden />
            <span className="st-mono-sm whitespace-nowrap text-strata-seam">
              YOU APPROVE THE FINISHED PAGE HERE
            </span>
            <span className="h-px min-w-8 flex-1 bg-strata-hairline-deep" aria-hidden />
            <span className="st-mono whitespace-nowrap text-strata-bone-mute">
              50% BALANCE — ONLY AFTER APPROVAL
            </span>
          </div>
          <p className="st-body mt-4 !text-[15px] text-strata-bone-body">
            The deposit starts the drill. The balance only moves after you
            approve the finished page — with two review checkpoints before
            anything goes live.
          </p>
        </div>

        {/* the core log — 12 questions */}
        <div className="mt-16">
          <p className="st-mono text-strata-bone-mute">
            THE JOB DOCKET — TWELVE QUESTIONS, ANSWERED PLAINLY
          </p>
          <div className="mt-4 border-t border-strata-hairline-deep">
            {pricingFAQ.map((f) => (
              <details key={f.question} className="group border-b border-strata-hairline-deep">
                <summary
                  className="flex cursor-pointer items-baseline justify-between gap-6 py-4 text-[17px] text-strata-bone marker:content-none [&::-webkit-details-marker]:hidden"
                  style={{ fontFamily: "var(--font-strata-body)" }}
                >
                  {f.question}
                  <span
                    aria-hidden
                    className="st-mono text-strata-bone-mute transition-transform duration-150 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="st-faq-body">
                  <div>
                    <p className="st-body st-faq-seam max-w-3xl pb-5 !text-[15px] text-strata-bone-body">
                      {f.answer}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
          <div className="mt-6 max-w-3xl border border-strata-hairline-deep p-5">
            <p className="st-mono-sm text-strata-bone">
              {scopeNote.title.toUpperCase()}
            </p>
            <p className="st-mono-sm mt-2 !normal-case !tracking-normal text-strata-bone-mute">
              {scopeNote.content}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
