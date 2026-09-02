"use client";

/**
 * CtaLink — every conversion click on the homepage goes through this.
 *
 * It exists so the analytics contract is enforced in one place rather than
 * re-typed at each of the page's CTAs. `cta_location` strings are a CONTRACT:
 * every historical funnel report keys off them, so the inherited ones must stay
 * byte-identical to what the previous homepage emitted.
 *
 * ⚠️ THIS LIST IS NOW ENFORCED, NOT TRUSTED. It used to claim to be "the full
 * permitted set" while five values had drifted in below it and two documented
 * values were emitted by nothing — which is exactly how the hero shipped with
 * both of its CTAs reporting the same location, making the split between "start
 * the brief" and "look at the work first" unreadable. scripts/nl-audit.cjs
 * compares the emitted set against this list in BOTH directions and fails on a
 * mismatch either way, so a value cannot appear in the code without appearing
 * here, and cannot sit here without being emitted.
 *
 * INHERITED (do not rename — historical funnel reports key off them):
 *   hero · hero_demo · proof · what_we_build · why_not_diy · ai-assistant
 *   how_it_works · client_portal · pricing · cta_band · testimonials
 *
 * ADDED BY THE CONVERSION AND SUBTRACTION PASSES:
 *   nav · nav_sheet · footer · math · refusal
 *
 * RETIRED: `proof_cta`. It was never emitted as a cta_location — it existed
 * only as a section_view id on the Watching band, which has no CTA at all, so
 * every reach report read that band as CTA reach. Watching reports "watching"
 * now.
 *
 * (Yes, `ai-assistant` uses a hyphen where everything else uses an underscore.
 * That inconsistency is in the shipped data. Preserve it; don't "fix" it.)
 *
 * trackCtaClick also writes sessionStorage["strata_cta_source"], which is what
 * makes a later brief_submit attributable to the CTA that started the journey.
 * Bypassing this component with a bare <Link> silently breaks that attribution.
 *
 * The click fires before navigation. track() queues onto a sendBeacon flush, so
 * it survives the page transition without delaying it.
 */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { trackCtaClick } from "@/lib/analytics";

interface CtaLinkProps {
  href: string;
  /** cta_location — must come from the permitted set above. */
  location: string;
  variant: "primary" | "secondary" | "ghost";
  /** cta_destination, e.g. "brief", "demos", "pricing". */
  destination: string;
  className?: string;
  /** Inline styles, forwarded. Needed by the Receipts ledger rows, which are
   *  accent-coloured mono links rather than buttons — they still have to go
   *  through this component or they write no strata_cta_source. */
  style?: CSSProperties;
  children: ReactNode;
  /** Marks the element for the engine's magnetic-hover pass. */
  "data-magnet"?: boolean;
  /** Cursor ring label, e.g. "Watch", "Drag". */
  "data-cursor"?: string;
}

export function CtaLink({
  href,
  location,
  variant,
  destination,
  className,
  style,
  children,
  ...rest
}: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => trackCtaClick(location, variant, destination, "home")}
      {...rest}
    >
      {children}
    </Link>
  );
}
