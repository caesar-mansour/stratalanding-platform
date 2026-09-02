/**
 * REFUSAL — the work we turn down.
 *
 * PAPER REGISTER. A studio is defined by what it will not take money for, and
 * publishing that list in writing is the cheapest premium signal on the page —
 * the same argument the System section's constraint line makes, at section
 * scale. It is deliberately a static server component: no analytics contract,
 * no engine hooks, nothing to hydrate.
 *
 * ── WHERE THE CONTENT COMES FROM ────────────────────────────────────────────
 * Rows 1-5 are `scopeClarity.notIncluded` from brand.ts, one row each, written
 * as refusals rather than as a bulleted exclusions list. That export is the
 * real out-of-scope list the proposals and the pricing page already run on, so
 * this section cannot drift away from what we actually sell. Rows 6 and 7 are
 * the two delivery-model refusals that are equally true and are not in that
 * array: we don't do rush builds (the review checkpoints are the schedule), and
 * we don't do calls (100% async is the business, per brand.ts faq).
 *
 * Seven rows, not the source's five, because `notIncluded` has five entries of
 * its own and the delivery-model refusals are the two that actually surprise
 * people.
 *
 * ── WHAT WAS CUT FROM THE SOURCE, AND WHY ───────────────────────────────────
 *   "Two builds a month · that is the model"  -> cut. Invented capacity.
 *   "A third project in the same month, at any price"  -> cut, same reason.
 *   "When both slots are taken we tell you that day"   -> cut, same reason.
 *   "Nineteen days is the floor, not the target"       -> cut. Our delivery
 *       windows live in `pricing`; naming a different number here would
 *       contradict them.
 *   "before you spend thirty minutes on a call"        -> "before you spend ten
 *       minutes on a brief". StrataLanding never takes a call, and brand.ts
 *       states the brief takes about ten minutes.
 *
 * The hover is the page's universal row interaction — padding-left slides, no
 * transform. `.nl-row` hard-codes 20px; the source's refusal rows use 14px, so
 * the slide is spelled out in Tailwind here rather than by reaching into
 * nl.css. Padding must therefore stay in classes, not inline style, or the
 * inline value would outrank the hover variant.
 */

import { handoffs, scopeClarity } from "@/lib/brand";
import { Handoff } from "../Handoff";
import { SectionView } from "../SectionView";
import { LedgerHead } from "../LedgerHead";

interface RefusalRow {
  /** The statement, as a noun phrase. */
  work: string;
  /** Mono, right-aligned. Why it is a no, in three words or fewer. */
  reason: string;
  /** The brand.ts entry this row is the long form of, where one exists. */
  source?: (typeof scopeClarity.notIncluded)[number];
}

const REFUSALS: RefusalRow[] = [
  {
    work: "Ad accounts, budgets, and bid strategy",
    reason: "not our craft",
    source: "Ads management",
  },
  {
    work: "Running your promo calendar and campaigns",
    reason: "not the job",
    source: "Campaign management",
  },
  {
    work: "Social accounts, content calendars, posting",
    reason: "different discipline",
    source: "Social media",
  },
  {
    work: "Long-term SEO programs and content mills",
    reason: "foundation only",
    source: "Long-term SEO programs",
  },
  {
    work: "Monthly retainers with no number attached to them",
    reason: "no accountability",
    source: "Ongoing retainers",
  },
  {
    work: "Rush builds that skip a review checkpoint",
    reason: "quality is the schedule",
  },
  {
    work: "Discovery calls, kickoff calls, status calls", // nl-audit-allow: the no-list refuses them
    reason: "async by design",
  },
];

export function Refusal() {
  return (
    <section
      id="refusal"
      data-screen-label="What we turn down"
      data-bg="#ece6d7"
      className="nl-section"
      style={{ background: "var(--nl-ground-panel)" }}
    >
      {/* Reach reporting for a server component — see SectionView. This one
          carries a Handoff, so without it the cta_click had no denominator. */}
      <SectionView anchor="refusal" report="refusal" />

      <LedgerHead label="The no list" meta="In writing · before you ask" />

      <div className="nl-inner grid items-start gap-10 lg:grid-cols-[0.68fr_1.32fr] lg:gap-[70px]">
        <div className="flex flex-col gap-[22px]">
          <h2
            data-fade
            className="nl-h2 m-0"
            style={{ fontSize: "clamp(40px,5.2vw,86px)", lineHeight: 0.92 }}
          >
            The work
            <br />
            we turn
            <br />
            <span className="nl-serif" style={{ color: "var(--nl-accent)" }}>
              down
            </span>
            .
          </h2>
          <p
            data-fade
            className="m-0"
            style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--nl-body)", maxWidth: "32ch" }}
          >
            A studio is defined by its refusals. These are ours, in writing, before you spend ten
            minutes on a brief.
          </p>
        </div>

        <div className="flex flex-col" style={{ borderTop: "1px solid var(--nl-r20)" }}>
          {REFUSALS.map((r) => (
            <div
              key={r.work}
              data-lay
              className="grid grid-cols-[20px_minmax(0,1fr)] items-baseline gap-[18px] px-0 py-[19px] transition-[padding-left,background-color] duration-500 hover:bg-[rgba(11,27,58,0.06)] hover:pl-[14px] lg:grid-cols-[20px_minmax(0,1fr)_auto]"
              style={{
                borderBottom: "1px solid var(--nl-r11)",
                transitionTimingFunction: "var(--nl-ease)",
              }}
            >
              <span
                aria-hidden
                className="nl-num text-[12px]"
                style={{ color: "var(--nl-accent)" }}
              >
                ✕
              </span>
              <span
                className="font-semibold"
                style={{
                  fontSize: "clamp(17px,1.5vw,21px)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.25,
                  color: "var(--nl-ink)",
                }}
              >
                {r.work}
              </span>
              <span
                className="nl-mono-xs col-span-1 col-start-2 whitespace-nowrap lg:col-start-3"
                style={{ fontSize: 10, letterSpacing: "0.16em", color: "var(--nl-meta)" }}
              >
                {r.reason}
              </span>
            </div>
          ))}

          {/* A PARAGRAPH THAT SAID FOUR THINGS THE PAGE HAD ALREADY SAID.
              In sixty words it repeated the 24-hour proposal, the no-calls
              promise, the ten-minute brief and the payment terms — and the
              handoff thirty pixels below it says the first of those properly,
              aimed at the reader who has just found their own project on the
              list. Deleting it is four repeats in one edit and costs no
              argument at all.

              It was a data-fade paragraph, NOT one of the seven data-lay rows
              above: those carry seven of the build's thirteen [data-lay] against
              a specification of eleven, and deleting one would have spent slack
              the gate does not have. */}

          {/* THE EXIT FROM THE REFUSALS. Trust peaks here precisely because we
              just published seven things we will not take money for — a
              transparent limit is the strongest proof a studio this new
              can offer, and it was the one section that earned an action and
              did not have one. Note the line: it answers the buyer who has
              just found their own project on the list. */}
          <Handoff line={handoffs.refusal.line} location={handoffs.refusal.location} />
        </div>
      </div>
    </section>
  );
}
