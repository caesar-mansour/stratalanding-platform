"use client";

/**
 * BAND 13 — THE ASSAY. Three questions, answered on this page, sent
 * nowhere. The same local recommendation engine the site has always run —
 * restyled as the assay instrument. NO PRICES (law: bedrock owns cost —
 * the assay names the package and points down). Pre-seeded by THE BORES
 * via sessionStorage("strata_goal"). ai_assistant + #ai-assistant kept;
 * /brief?plan=<slug> deep-link kept.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cta } from "@/lib/brand";
import { trackCtaClick } from "@/lib/analytics";
import { useSectionView, useCut } from "../tier";
import { smoothScrollTo } from "@/components/motion/SmoothScroll";

type Slot = "goal" | "industry" | "timeline";

const QUESTIONS: { slot: Slot; q: string; choices: { id: string; label: string }[] }[] = [
  {
    slot: "goal",
    q: "SAMPLE I — THE JOB",
    choices: [
      { id: "leads", label: "Generate leads" },
      { id: "sales", label: "Sell products" },
      { id: "bookings", label: "Book appointments" },
      { id: "presence", label: "Look credible" },
    ],
  },
  {
    slot: "industry",
    q: "SAMPLE II — THE BUSINESS",
    choices: [
      { id: "saas", label: "SaaS / tech" },
      { id: "agency", label: "Agency" },
      { id: "ecommerce", label: "E-commerce" },
      { id: "health", label: "Health" },
      { id: "finance", label: "Finance" },
      { id: "realestate", label: "Real estate" },
      { id: "education", label: "Education" },
      { id: "other", label: "Something else" },
    ],
  },
  {
    slot: "timeline",
    q: "SAMPLE III — THE CLOCK",
    choices: [
      { id: "asap", label: "ASAP" },
      { id: "few-weeks", label: "2–3 weeks" },
      { id: "exploring", label: "Just exploring" },
    ],
  },
];

// strata each package drills (fill map v1 — honesty sign-off pending)
const STRATA_CODES = ["ST.01", "ST.02", "ST.03", "ST.04", "ST.05", "ST.06", "ST.07", "ST.08"];
const FILLS: Record<string, number[]> = {
  "presence-page": [1, 1, 0, 1, 0.5, 0, 0.35, 1],
  "lead-page": [1, 1, 1, 1, 1, 1, 0.7, 1],
  "purchase-page": [1, 1, 1, 1, 1, 1, 1, 1],
};

/* the same local recommendation engine the page has always run — minus prices */
function getRecommendation(goal: string) {
  if (goal === "sales") {
    return {
      name: "Purchase Page",
      reason:
        "A multi-page conversion flow with checkout integration — built to turn visitors into paying customers.",
      delivery: "14–21 business days",
      slug: "purchase-page",
    };
  }
  if (goal === "leads" || goal === "bookings") {
    return {
      name: "Lead Page",
      reason:
        goal === "bookings"
          ? "A conversion-optimized page with form capture and event tracking — designed to fill your calendar fast."
          : "A landing page + thank-you page with lead form integration and conversion tracking — the sweet spot for lead generation.",
      delivery: "10–14 business days",
      slug: "lead-page",
    };
  }
  return {
    name: "Presence Page",
    reason:
      "A single, high-performance landing page that establishes credibility and makes your brand look premium.",
    delivery: "7–10 business days",
    slug: "presence-page",
  };
}

// THE BORES speaks goal-router dialect; the assay speaks brief dialect
const BORE_TO_GOAL: Record<string, string> = {
  calls: "bookings",
  emails: "leads",
  sales: "sales",
  quotes: "leads",
};

export function Band13Assay() {
  const ref = useRef<HTMLElement | null>(null);
  useSectionView(ref, "ai_assistant");
  useCut(ref);

  const [answers, setAnswers] = useState<Partial<Record<Slot, string>>>({});

  // pre-seed from THE BORES
  useEffect(() => {
    try {
      const bore = sessionStorage.getItem("strata_goal");
      if (bore && BORE_TO_GOAL[bore])
        setAnswers((a) => ({ goal: BORE_TO_GOAL[bore], ...a }));
    } catch {
      /* ignore */
    }
  }, []);

  const done = QUESTIONS.every((q) => answers[q.slot]);
  const rec = useMemo(
    () => (done && answers.goal ? getRecommendation(answers.goal) : null),
    [done, answers.goal]
  );

  return (
    <section
      ref={ref}
      id="ai-assistant"
      data-strata-band="assay"
      data-strata-act="ink"
      className="st-grain st-grain-deep st-rays-deep st-column-deep relative text-strata-bone-body"
    >
      {/* the ink room owns the fixed chrome while the act runs */}
      <div data-strata-deep hidden aria-hidden />

      {/* the slip's own lamp, hung over the clipboard */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hidden h-full lg:block">
        <div className="pr-lamp" style={{ left: "72%" }}>
          <span className="cord" /><span className="pool" /><span className="shade" />
        </div>
      </div>

      <div className="st-bed relative py-24 lg:py-28">
        <div className="flex items-baseline justify-between">
          <p className="st-mono text-strata-bone-mute">
            THE ORDER SLIP — WHICH DEPTH DOES YOUR BUSINESS NEED?
          </p>
          <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
            ANSWERED ON THIS PAGE · SENT NOWHERE
          </p>
        </div>
        <div className="st-score mt-3 !bg-strata-hairline-deep" />

        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
          {/* the three samples */}
          <div className="st-open space-y-8">
            {QUESTIONS.map((q) => (
              <fieldset key={q.slot}>
                <legend className="st-mono-sm text-strata-bone-mute">
                  {q.q}
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.choices.map((c) => {
                    const on = answers[q.slot] === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setAnswers((a) => ({ ...a, [q.slot]: c.id }))
                        }
                        data-stamped={on || undefined}
                        className="pr-ticket !min-h-0 px-4 py-2.5 pl-7 text-[14px] focus-visible:outline-2 focus-visible:outline-strata-seam"
                        style={{
                          fontFamily: "var(--font-strata-ui)",
                          color: "#0B1B3A",
                        }}
                      >
                        {c.label}
                        {on && (
                          <span className="st-mono-sm ml-2 !text-[8px] text-strata-seam">
                            ●
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <p className="st-mono-sm max-w-[46ch] pt-2 text-strata-bone-mute">
              THREE SAMPLES AND THE SLIP TOTALS ITSELF. NO ACCOUNT, NO EMAIL,
              NOTHING SENT — THE ORDER IS YOURS UNTIL YOU HAND IT OVER.
            </p>
          </div>

          {/* the assay report */}
          <div
            className="st-open-iris pr-proof p-8 lg:p-9"
            data-brightest
            data-cut-step="2"
          >
            {/* the clipboard clip */}
            <span
              aria-hidden
              className="absolute -top-2 left-1/2 h-4 w-20 -translate-x-1/2"
              style={{
                background: "linear-gradient(180deg,#3a424c,#20242B 60%,#14181d)",
                borderRadius: "2px 2px 6px 6px",
                boxShadow: "0 3px 8px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.18)",
              }}
            />
            {rec ? (
              <>
                <p className="st-mono text-strata-seam">
                  ORDER SLIP — TOTAL: {rec.name.toUpperCase()}
                </p>
                <p className="st-body mt-5 text-strata-ink-body">
                  {rec.reason}
                </p>
                <p className="st-mono mt-4 text-strata-ink-mute">
                  DELIVERY: {rec.delivery.toUpperCase()}
                </p>

                {/* the required depth, drawn */}
                <div className="mt-6 flex items-end gap-1.5" aria-hidden>
                  {FILLS[rec.slug].map((f, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="flex h-16 w-6 items-end border border-strata-hairline">
                        <div
                          className="w-full bg-strata-seam"
                          style={{ height: `${f * 100}%` }}
                        />
                      </div>
                      <span className="st-mono-sm !text-[8px] text-strata-ink-mute">
                        {STRATA_CODES[i].slice(3)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href={`/brief?plan=${rec.slug}`}
                    className="st-btn st-btn-seam"
                    onClick={() =>
                      trackCtaClick(
                        "ai-assistant",
                        "primary",
                        `/brief?plan=${rec.slug}`
                      )
                    }
                  >
                    {cta.primary.label}
                  </Link>
                  <span className="st-mono-sm text-strata-ink-mute">
                    SEND TO PRESS
                  </span>
                  <button
                    type="button"
                    className="st-mono text-strata-ink underline-offset-4 hover:underline"
                    onClick={() => {
                      const el = document.getElementById("pricing");
                      if (el) smoothScrollTo(el, -88);
                    }}
                  >
                    SEE THE PROOF IN THE INK ROOM ↑
                  </button>
                </div>
              </>
            ) : (
              /* dormant instrument — the report awaits its three samples */
              <div className="flex h-full min-h-[240px] flex-col justify-between">
                <div>
                  <p className="st-mono text-strata-ink-mute">
                    THE ORDER SLIP — AWAITING SAMPLES
                  </p>
                  <div className="mt-5 space-y-0">
                    {[
                      ["SAMPLE I — THE JOB", answers.goal],
                      ["SAMPLE II — THE BUSINESS", answers.industry],
                      ["SAMPLE III — THE CLOCK", answers.timeline],
                    ].map(([label, val]) => (
                      <div
                        key={label as string}
                        className="flex items-baseline justify-between border-b border-strata-hairline py-3"
                      >
                        <span className="st-mono-sm text-strata-ink-mute">
                          {label as string}
                        </span>
                        <span
                          className="st-mono-sm"
                          style={{
                            color: val ? "#0891B2" : "rgba(11,27,58,.4)",
                          }}
                        >
                          {val ? "RECEIVED ●" : "AWAITING ○"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* the fill map, unlit until the report resolves */}
                <div>
                  <div className="mt-8 flex items-end gap-1.5" aria-hidden>
                    {STRATA_CODES.map((c, i) => (
                      <div key={c} className="flex flex-col items-center gap-1.5">
                        <div className="h-16 w-6 border border-strata-hairline" />
                        <span className="st-mono-sm !text-[8px] text-strata-ink-mute">
                          {STRATA_CODES[i].slice(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="st-mono-sm mt-5 text-strata-ink-mute">
                    THREE SAMPLES IN — THE SLIP TOTALS. NOTHING LEAVES THIS
                    PAGE.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
