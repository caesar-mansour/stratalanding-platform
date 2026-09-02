"use client";

/**
 * SP2 — THE JOB BOARD (goal router). THE PRESSRUN · Act I.
 *
 * Four press job tickets pinned on the board: punch holes, route codes,
 * tear lines. Picking a ticket STAMPS it (ON THE PRESS) and the pulled
 * tab prints that job's report. NO PRICES here (law: the ink room owns
 * cost — the router names the package).
 *
 * Contracts kept verbatim: goal values (locked to /demos filter),
 * trackGoalSelect, section_view id "what_we_build", anchor #what-we-build,
 * /demos?goal= links, sessionStorage("strata_goal") pre-seed for the slip.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import {
  goalRouter,
  goalRouterDefault,
  goalRouterIncludes,
  goalRouterIncludesClose,
  goalRouterPresence,
  cta,
} from "@/lib/brand";
import { trackGoalSelect, trackCtaClick } from "@/lib/analytics";
import { useSectionView, useCut } from "../tier";

export function Band03Bores() {
  const ref = useRef<HTMLElement | null>(null);
  useSectionView(ref, "what_we_build");
  useCut(ref);

  const [goal, setGoal] = useState<string>(goalRouterDefault);
  const active = goalRouter.find((g) => g.goal === goal) ?? goalRouter[0];

  const choose = (g: string) => {
    setGoal(g);
    trackGoalSelect(g);
    try {
      sessionStorage.setItem("strata_goal", g);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      ref={ref}
      id="what-we-build"
      data-strata-band="bores"
      className="st-grain st-rays st-column-shallow-2 relative text-strata-ink"
    >
      <div className="st-bed py-20 lg:py-28">
        <div className="flex items-baseline justify-between">
          <p className="st-mono text-strata-ink-mute">
            THE JOB BOARD — FIRST: WHAT MUST YOUR PAGE DO?
          </p>
          <p className="st-mono-sm hidden text-strata-ink-mute sm:block">
            FOUR ROUTES · ONE GETS STAMPED
          </p>
        </div>
        <div className="st-score mt-3" />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,44rem)_1fr] lg:gap-16">
          {/* THE BOARD — four tickets */}
          <div className="st-open" data-cut-step="1">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {goalRouter.map((g, i) => {
                const on = g.goal === goal;
                return (
                  <button
                    key={g.goal}
                    type="button"
                    onClick={() => choose(g.goal)}
                    aria-pressed={on}
                    data-stamped={on || undefined}
                    className="pr-ticket flex min-h-[9.5rem] flex-col items-start gap-2 p-5 pl-8 pb-7 text-left focus-visible:outline-2 focus-visible:outline-strata-seam"
                  >
                    <span className="pr-ticket-stamp pr-stamp !px-2 !py-1 !text-[9px]">
                      ON THE PRESS
                    </span>
                    <span className="st-mono-sm text-strata-ink-mute">
                      ROUTE RT-0{i + 1}
                    </span>
                    <span
                      className="text-[19px] font-semibold leading-tight"
                      style={{
                        fontFamily: "var(--font-strata-display)",
                        color: "#0B1B3A",
                      }}
                    >
                      {g.label}
                    </span>
                    <span className="st-mono-sm text-strata-ink-mute">
                      {g.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="st-mono-sm mt-6 border-t border-strata-hairline pt-4 text-strata-ink-mute">
              {goalRouterPresence.text}{" "}
              <Link
                href="/pricing/presence-page"
                className="text-strata-seam underline-offset-4 hover:underline"
                onClick={() =>
                  trackCtaClick("bores-presence", "ghost", "/pricing/presence-page")
                }
              >
                {goalRouterPresence.linkLabel}
              </Link>
            </p>
          </div>

          {/* THE PULLED TAB — the job's report prints */}
          <div className="st-open" data-cut-step="2" key={active.goal}>
            <p className="st-mono text-strata-seam">{active.outputEyebrow}</p>
            <h2 className="st-chapter mt-4">{active.outcomeHeadline}</h2>
            <p className="st-body mt-5 text-strata-ink-body">{active.artifact}</p>
            <p className="st-mono mt-5 text-strata-ink-mute">
              {active.specs.join(" · ")}
            </p>

            <ul className="mt-8 grid gap-2 border-t border-strata-hairline pt-6 sm:grid-cols-2">
              {goalRouterIncludes.map((line) => (
                <li key={line} className="st-body flex gap-3 text-strata-ink-body">
                  <span aria-hidden className="mt-[0.72em] h-px w-4 shrink-0 bg-strata-seam" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="st-body mt-4 font-medium text-strata-ink">
              {goalRouterIncludesClose}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={cta.primary.href}
                className="st-btn st-btn-seam"
                onClick={() =>
                  trackCtaClick("bores", "primary", cta.primary.href)
                }
              >
                {cta.primary.label}
              </Link>
              <Link
                href={active.demoHref}
                className="st-btn st-btn-hairline"
                onClick={() =>
                  trackCtaClick("bores", "secondary", active.demoHref)
                }
              >
                {cta.secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
