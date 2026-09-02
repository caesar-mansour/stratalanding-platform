"use client";

/**
 * SectionView — fires `section_view` for a section that is a SERVER component.
 *
 * Six sections on this page reported no reach at all: System, Manifesto, Spine,
 * Refusal, Math and the verticals band. Two of them now carry a Handoff CTA, so
 * their `cta_click` had no denominator — you could count the clicks forever and
 * never learn the rate.
 *
 * The obvious fix is to add `useSectionView` to each, and it is the wrong one:
 * five of the six are server components ON PURPOSE. Refusal.tsx says so in its
 * own header — "deliberately a static server component… nothing to hydrate".
 * Converting a whole section to a client component to fire one observer ships
 * its entire markup to the browser twice, as HTML and again as an RSC payload,
 * for a single beacon.
 *
 * So this renders `null` and hydrates alone. It takes the id of the section it
 * reports on rather than a ref, because a server parent cannot hand a child a
 * ref — and the id is already there, since every one of these sections is a
 * rail anchor.
 *
 * ⚠️ THE OBSERVER OPTIONS ARE COPIED EXACTLY from useSectionView in
 * components/strata/tier.ts — `rootMargin: "0px 0px -30% 0px"`, `threshold: 0`.
 * Its comment records that the -30% is "the threshold the analytics dashboards
 * were calibrated against". A different threshold here would make these six
 * sections' reach numbers quietly incomparable with the eleven that already
 * report, which is worse than not reporting at all: the figures would look
 * usable and be wrong.
 *
 * Fires ONCE, then disconnects. Deliberately not re-armed on scroll-back — a
 * reader scrubbing a pinned scene up and down would otherwise report a dozen
 * views of one section and inflate every rate on the page.
 */

import { useEffect } from "react";
import { trackSectionView } from "@/lib/analytics";

interface SectionViewProps {
  /** The id of the section to observe. Must already exist in the markup. */
  anchor: string;
  /** The section_view id. Kept separate from `anchor` because several of these
   *  are historical analytics strings that do NOT match their DOM id — the
   *  anatomy stage is #proof, the process stage is #how-it-works. */
  report: string;
}

export function SectionView({ anchor, report }: SectionViewProps) {
  useEffect(() => {
    const el = document.getElementById(anchor);
    if (!el || typeof IntersectionObserver === "undefined") return;

    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!done && e.isIntersecting) {
            done = true;
            trackSectionView(report);
            io.disconnect();
          }
        }
      },
      // identical to useSectionView — see the note above
      { rootMargin: "0px 0px -30% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [anchor, report]);

  return null;
}
