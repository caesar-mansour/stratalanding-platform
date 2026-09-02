"use client";

/**
 * THE ASSAY — pick the job, get the page.
 *
 * WHY THIS SECTION EXISTS. The Northline design has no equivalent of the old
 * homepage's brief assistant, but three contracts depended on it: the
 * `#ai-assistant` anchor, the `ai_assistant` section_view, and the
 * `ai-assistant` cta_location (which really does use a hyphen where every other
 * location uses an underscore — that inconsistency is in the shipped analytics
 * data, so it is preserved, not tidied). Dropping the section would have
 * silently blanked a funnel report and broken any inbound anchor link.
 *
 * IT IS NOT AI, AND IT DOES NOT PRETEND TO BE. The old section was labelled
 * "AI-Powered" while running a three-branch if/else with no network call. Same
 * engine here, honest label: it is a router, and the routing table is
 * `goalRouter` in brand.ts — the same table that feeds /demos?goal=. One source
 * of truth means the recommendation can never disagree with the demo filter.
 *
 * PLACEMENT. Immediately before the price ledger. The visitor names the job,
 * gets told which of the three pages does that job, and then reads the prices
 * with a tier already in mind. Deliberately NO PRICES here — the ledger owns
 * cost, and a number in two places is a number that will eventually disagree.
 *
 * IT PRE-SEEDS FROM THE FILM. The journey stage writes the visitor's chosen
 * goal to sessionStorage["strata_goal"]; this section reads it on mount so a
 * visitor who already answered upstream sees their answer carried forward
 * rather than being asked twice.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cta, goalRouter, goalRouterDefault, pricing } from "@/lib/brand";
import { trackCtaClick, trackGoalSelect } from "@/lib/analytics";
import { useSectionView } from "@/components/strata/tier";
import { LedgerHead } from "../LedgerHead";

/**
 * goalRouter states its answer in prose ("Your page: Lead Page"), which is fine
 * for a human and useless for a link. Resolve it to a real tier from `pricing`
 * by name so a rename in brand.ts surfaces here as a build error rather than a
 * dead /brief?plan= link.
 */
function tierFor(outputEyebrow: string) {
  const named = pricing.find((p) => outputEyebrow.includes(p.name));
  return named ?? pricing.find((p) => p.highlighted) ?? pricing[0];
}

export function Assay() {
  const ref = useRef<HTMLElement>(null);
  useSectionView(ref, "ai_assistant");

  const [goal, setGoal] = useState<string | null>(null);

  // Carry forward whatever the visitor already told the film upstream.
  useEffect(() => {
    try {
      const seeded = sessionStorage.getItem("strata_goal");
      if (seeded && goalRouter.some((g) => g.goal === seeded)) setGoal(seeded);
    } catch {
      /* private mode — the section just starts blank, which is fine */
    }
  }, []);

  const active = goalRouter.find((g) => g.goal === goal) ?? null;
  const shown = active ?? goalRouter.find((g) => g.goal === goalRouterDefault)!;
  const tier = tierFor(shown.outputEyebrow);

  function choose(g: string) {
    setGoal(g);
    try {
      sessionStorage.setItem("strata_goal", g);
    } catch {
      /* ignore */
    }
    trackGoalSelect(g);
  }

  return (
    <section
      ref={ref}
      id="ai-assistant"
      data-screen-label="The assay"
      data-bg="#ece6d7"
      className="nl-section"
      style={{ background: "var(--nl-ground-panel)", paddingBottom: 118 }}
    >
      <LedgerHead label="The assay" meta="One question · then the page" />

      <div className="nl-inner">
        <div className="flex flex-wrap items-end justify-between gap-8 pb-[clamp(20px,3vw,38px)]">
          <h2 className="nl-h2 m-0" style={{ fontSize: "clamp(28px,3.6vw,52px)" }}>
            What is the page for?
          </h2>
          <p
            className="m-0 max-w-[36ch] text-[15px] leading-[1.5]"
            style={{ color: "var(--nl-body)" }}
          >
            Every business job maps to one of the three. Name yours and we&rsquo;ll say which page
            does it — no form, no email, nothing sent.
          </p>
        </div>

        {/* The four jobs. Radio semantics, not buttons: this is a single choice
            among a fixed set, and a screen reader should hear it that way. */}
        <div
          role="radiogroup"
          aria-label="What is the page for?"
          /* The column count lives in CSS, not here. An inline
             gridTemplateColumns outranks any stylesheet rule, so declaring it
             on the element would silently pin the grid at its mobile shape and
             the desktop media query would never win. */
          className="nl-assay-grid gap-px"
          style={{
            background: "var(--nl-r16)",
            borderTop: "1px solid var(--nl-r16)",
            borderBottom: "1px solid var(--nl-r16)",
          }}
        >
          {goalRouter.map((g, i) => {
            const on = goal === g.goal;
            return (
              <button
                key={g.goal}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(g.goal)}
                className="nl-assay-cell text-left"
                style={{
                  background: on ? "var(--nl-ink)" : "var(--nl-panel)",
                  color: on ? "var(--nl-paper)" : "var(--nl-ink)",
                  padding: "22px 22px 24px",
                }}
              >
                <span
                  data-tnum
                  className="nl-num text-[11px] tracking-[0.14em]"
                  style={{ color: on ? "var(--nl-paper)" : "var(--nl-accent)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-2 block text-[clamp(17px,1.5vw,21px)] font-semibold leading-tight">
                  {g.label}
                </span>
                <span
                  className="mt-1 block text-[13.5px] leading-[1.45]"
                  style={{ color: on ? "rgba(251,249,244,0.66)" : "var(--nl-meta)" }}
                >
                  {g.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* The answer. Rendered from the default until a choice is made, so the
            section is never an empty box — and marked as the default in words
            so it cannot read as a recommendation the visitor didn't ask for. */}
        <div
          aria-live="polite"
          className="mt-[clamp(24px,3.5vw,44px)] grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"
        >
          <div>
            <span className="nl-mono" style={{ color: "var(--nl-accent)" }}>
              {active ? "Your page" : `Most common — ${shown.label.toLowerCase()}`}
            </span>
            <p
              className="nl-h3 mt-3 mb-0"
              style={{ fontSize: "clamp(24px,2.8vw,38px)" }}
            >
              {shown.outcomeHeadline}
            </p>
            <p
              className="mt-3 mb-0 max-w-[52ch] text-[15px] leading-[1.55]"
              style={{ color: "var(--nl-body)" }}
            >
              {shown.artifact}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {shown.specs.map((s) => (
                <span key={s} className="nl-chip">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* THE LABEL IS THE SITEWIDE ONE. It read "Start with the {tier.name}",
              which was a nice piece of personalisation and a breach of the law
              in brand.ts: one CTA label everywhere, so a visitor who has seen
              the hero recognises the same door here rather than wondering
              whether this is a different offer.

              Nothing is lost by obeying it. The tier and its FIXED PRICE now sit
              in the microcopy directly under the button, which is stronger than
              a longer label: at the exact moment this section answers "which one
              do I need", the reader gets the name, the number and what happens
              after the click. Both come from brand.ts by value — no price is
              ever typed into a component. */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/brief?plan=${tier.slug}`}
                className="nl-cta"
                data-magnet
                onClick={() =>
                  trackCtaClick("ai-assistant", "primary", `/brief?plan=${tier.slug}`, "home")
                }
              >
                {cta.primary.label}
              </Link>
              <Link
                href={shown.demoHref}
                className="nl-cta nl-cta-ghost"
                onClick={() => trackCtaClick("ai-assistant", "secondary", shown.demoHref, "home")}
              >
                See one built
              </Link>
            </div>
            {/* NO PRICE HERE. This line read "{tier.name} · {tier.price} fixed
                · No calls…" — a number one viewport above the ledger, against
                the law this file states at the top of itself: the ledger owns
                cost, and a number in two places is a number that will
                eventually disagree. The previous pass put it there. The tier
                name and its delivery window are what this section is for —
                answering "which one do I need" — and the price is the very
                next thing the reader scrolls to. */}
            <span className="nl-mono-sm" style={{ color: "var(--nl-meta)" }}>
              {tier.name} · {tier.delivery}
            </span>
          </div>
        </div>


      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
[data-nl] .nl-assay-cell{transition:background-color .4s ease,color .4s ease;cursor:pointer}
[data-nl] .nl-assay-cell:hover{background-color:var(--nl-r06)}
[data-nl] .nl-assay-cell[aria-checked="true"]:hover{background-color:var(--nl-ink)}
[data-nl] .nl-assay-cell:focus-visible{outline:2px solid var(--nl-accent);outline-offset:-2px}
/* Two up on a phone, four across from 860px. Both declared here so neither can
   be outranked by an inline style. */
[data-nl] .nl-assay-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:860px){
  [data-nl] .nl-assay-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (prefers-reduced-motion: reduce){[data-nl] .nl-assay-cell{transition:none}}
`,
        }}
      />
    </section>
  );
}
