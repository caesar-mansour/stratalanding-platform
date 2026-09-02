/**
 * HANDOFF — the quiet exit at the close of a section that has finished arguing.
 *
 * WHY THIS IS ONE COMPONENT AND NOT SIX HAND-WRITTEN BLOCKS. Six copies of a
 * CTA is six chances for the label, the microcopy, the tracking call or the
 * hairline to drift apart, and a page whose CTAs disagree with each other reads
 * as six different companies. Written once, it is also one place to change if
 * the offer changes.
 *
 * WHY IT LOOKS LIKE THIS. The page alternates a pinned "cinema" register with a
 * static "paper" one, and a handoff must not read as an interruption in either.
 * So it is a ledger row: a hairline above, the mono voice on the left saying
 * what the reader has just earned the right to do, and the action on the right.
 * It is not a banner, it is not centred, it does not shout — the section it
 * closes has already done the persuading.
 *
 * THE LABEL IS NEVER PASSED IN. It is always `cta.primary.label`, because one
 * CTA label sitewide is the law, and a component that accepted a label would be
 * an invitation to break it. The `line` comes from `brand.ts handoffs`, so the
 * copy lives with the rest of the copy.
 *
 * TONE. Sections that close on a dark ground pass tone="dark", which sets
 * [data-tone="dark"] on the row itself. It does NOT invent dark-specific token
 * names: nl.css already redefines --nl-meta / --nl-faint / --nl-r16 under that
 * attribute, so the same three vars resolve correctly on either ground. Several
 * of these rows sit in normal flow directly after a pinned stage and would
 * otherwise inherit whatever band happens to surround them.
 */

import { cta } from "@/lib/brand";
import { CtaLink } from "./CtaLink";

interface HandoffProps {
  /** Copy + cta_location, from brand.ts `handoffs`. Never typed inline. */
  line: string;
  location: string;
  /** Flips the hairline and meta colour for a dark ground. */
  tone?: "light" | "dark";
  /** cta_destination. Defaults to the brief, which is where five of six go. */
  destination?: string;
  /** Overrides the CTA href — used by the pricing-adjacent handoffs. */
  href?: string;
}

export function Handoff({
  line,
  location,
  tone = "light",
  destination = "brief",
  href,
}: HandoffProps) {
  return (
    /* THE RULE BLEEDS, THE CONTENT DOES NOT — and that split is the fix for a
       real defect rather than a preference. This row was a single full-bleed
       flex with `justify-between`, so on a 2546px display the line sat against
       the left edge and the button against the right with 1,883px of nothing
       between them: measured, on the anatomy handoff. A sentence and its own
       button reading as two unrelated objects at opposite ends of the screen is
       the least classy thing a wide monitor can do to a page.
       The hairline still reaches both edges, because that is the page's
       ledger language. The content sits on --nl-max like everything else. */
    <div
      data-fade
      {...(tone === "dark" ? { "data-tone": "dark" } : {})}
      className="nl-bleed"
      style={{ borderTop: "1px solid var(--nl-r16)", marginTop: 8 }}
    >
      <div
        className="mx-auto flex w-full flex-wrap items-center justify-between gap-x-10 gap-y-5"
        style={{ maxWidth: "var(--nl-max)", padding: "26px var(--nl-gutter)" }}
      >
        <p
          className="m-0 max-w-[54ch] text-[14.5px] leading-[1.55]"
          style={{ color: "var(--nl-body)" }}
        >
          {line}
        </p>
        <CtaLink
          href={href ?? cta.primary.href}
          location={location}
          variant="primary"
          destination={destination}
          className="nl-cta"
          data-magnet
        >
          {cta.primary.label}
        </CtaLink>
        {/* THE LINE IS THE MICROCOPY, and that is why there is no second one.

            This used to render cta.reassurance underneath every handoff — six
            call sites, one source line, six appearances of "No calls. Clear
            scope. Delivered fast." on a page that already says some version of
            it more than twenty times. It was the single most repeated string on
            the site and it came from here.

            The law it existed to satisfy is still satisfied: never ship a CTA
            without copy answering "and then what?". Every handoffs.* line in
            brand.ts already does exactly that — the worksheet's says the
            proposal comes back priced against your numbers, the refusal's says
            it comes back within 24 hours, the film's says it takes one brief
            and no meetings. Adding a generic reassurance underneath a specific
            one does not reassure twice; it dilutes the specific one. The
            column wrapper that used to hold the two went with it. */}
      </div>
    </div>
  );
}
