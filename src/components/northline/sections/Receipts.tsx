"use client";

import { useRef } from "react";
import { handoffs } from "@/lib/brand";
import { trackCtaClick } from "@/lib/analytics";
import { CtaLink } from "../CtaLink";
import { Handoff } from "../Handoff";
import { LedgerHead } from "../LedgerHead";
import { useSectionView } from "@/components/strata/tier";

/**
 * THE RECORD — the honest version of the source's "Receipts".
 *
 * ═══ WHAT WAS CUT, AND WHY ══════════════════════════════════════════════════
 * The source design ships an eight-row ledger of client results and every
 * single figure in it is invented: practices in Madison, Green Bay, Boulder and
 * Rockford; booking rates going "1.1% → 7.6%"; costs per booked chair going
 * "$112 → $41"; sparkline SVGs plotted from those numbers; a summary strip
 * reading "5.4× median lift", "64% median drop", "19 days median brief to
 * live", "0 templates reused"; a ledger head meta of "Eleven builds ·
 * 2019—2026"; and a footnote offering reference calls with practices that do
 * not exist. Northline is a fictional studio. StrataLanding is a real one, and
 * none of that shipped.
 *
 * There is precedent for this exact deletion in the codebase: `sampleResults`
 * was removed from src/lib/brand.ts on 2026-06-04 for presenting invented
 * metrics ("+340% conversion") as "representative results" for a studio with
 * zero clients. See the note near the end of that file.
 *
 * ═══ WHAT WAS KEPT ══════════════════════════════════════════════════════════
 * The FORM. A ruled ledger with pure-CSS row expansion is the strongest
 * structural device on the page, and a studio that publishes a plain list of
 * everything it has made reads as a studio with nothing to hide. So the ledger
 * stays and the contents become true:
 *
 *   1. ON THE RECORD — the public client, quote carried verbatim from the
 *      shipped Testimonials component. No stars, no metrics, no dates, no
 *      invented client. It is linked so the reader can check it.
 *   2. THE ARCHIVE — four demo pages that really exist under src/app/demos and
 *      really render, labelled "Fictional showcase · Live page" and carrying
 *      the same "Sample design — placeholder brand & content" notice every demo
 *      route already shows in its own chrome. They are specimens, not history.
 *
 * The closing strip holds facts that are structurally true of the business
 * (client count, no calls, 24h proposal turnaround, fully async) rather than
 * performance statistics. No percentage, no lift, no inflated client count,
 * and no founding year appears anywhere in this file.
 *
 * ═══ MECHANICS ═════════════════════════════════════════════════════════════
 * Row expansion is `.nl-expand` from nl.css — grid-template-rows auto 0fr → auto
 * 1fr on :hover and :focus-within. No JavaScript, and keyboard users get it via
 * focus-within on the row's own link.
 *
 * `section_view` fires with the id "testimonials". That string is a CONTRACT:
 * every historical funnel report keys off it, so it stays byte-identical even
 * though the section is now called The Record and anchors at #receipts.
 */

/** Shared ledger grid. Collapses to a stack below `md`; header hides with it. */
const COLS =
  "md:grid-cols-[34px_minmax(0,1.35fr)_minmax(0,0.95fr)_172px_172px] md:gap-[18px] md:items-center";

interface LedgerRowData {
  n: string;
  /** Left of the middot. */
  name: string;
  /** Right of the middot, in meta. */
  sector: string;
  /** What the page is built to do. */
  what: string;
  /** The honesty label. Never hidden, at any breakpoint. */
  standing: string;
  href: string;
  linkLabel: string;
  external?: boolean;
  /** Expansion body. For clients this is their quote, unedited. */
  note: string;
  /** Expansion right-hand mono line. */
  noteMeta: string;
}

/**
 * THE PUBLIC CLIENT RECORD. The note describes what was built — it is NOT a
 * testimonial, because no attributable quote exists for this build. Do not
 * attach a number to it, and do not turn it back into a quote.
 */
const RECORD: readonly LedgerRowData[] = [
  {
    n: "01",
    name: "VIP High Class",
    sector: "Luxury car service",
    what: "Premium brand page",
    standing: "On the record",
    href: "https://viphighclass.com",
    linkLabel: "viphighclass.com",
    external: true,
    note: "A dark-luxury brand page for a Dubai chauffeur service: black and gold, a fleet showcase, and every call to action routed straight to phone or WhatsApp rather than a form.",
    noteMeta: "What we built — no testimonial on file",
  },
];

/**
 * THE SPECIMEN ARCHIVE. Real routes with real screenshots on file. The brands
 * inside them are invented, which is why every row says so twice.
 */
const ARCHIVE: readonly LedgerRowData[] = [
  {
    n: "01",
    name: "Agency Niche",
    sector: "Agency · salon growth",
    what: "Client acquisition",
    standing: "Fictional showcase · Live page",
    href: "/demos/agency-niche",
    linkLabel: "Open the page",
    note: "A single-offer page for an agency selling to salon owners. One visitor, one decision, headline to enquiry, with nothing else competing for the click.",
    noteMeta: "Sample design — placeholder brand & content",
  },
  {
    n: "02",
    name: "SaaS Waitlist",
    sector: "Startup · pre-launch",
    what: "Waitlist signups",
    standing: "Fictional showcase · Live page",
    href: "/demos/saas-waitlist",
    linkLabel: "Open the page",
    note: "A pre-launch page with one field and one promise. Everything above the fold exists to earn an email address, and nothing below it asks for a second thing.",
    noteMeta: "Sample design — placeholder brand & content",
  },
  {
    n: "03",
    name: "Gaming Tournament",
    sector: "Esports · events",
    what: "Tournament registrations",
    standing: "Fictional showcase · Live page",
    href: "/demos/gaming-tournament",
    linkLabel: "Open the page",
    note: "A registration page working against a deadline. The entry form is the page; everything around it is the reason to fill it in before the clock runs down.",
    noteMeta: "Sample design — placeholder brand & content",
  },
  {
    n: "04",
    name: "Meditation App",
    sector: "Wellness · consumer",
    what: "Free trial signups",
    standing: "Fictional showcase · Live page",
    href: "/demos/meditation-app",
    linkLabel: "Open the page",
    note: "A free-trial page for a consumer wellness app. Calm enough to belong to the product, and the trial button is never more than a thumb away.",
    noteMeta: "Sample design — placeholder brand & content",
  },
];

/** TWO things that are true about how this studio runs. Not results.
 *
 *  It was four, and two of them were the hero's instrument strip printed again
 *  at 90% scroll depth — "24h / Brief in, proposal back" was BYTE-IDENTICAL to
 *  the hero cell, and "0 / Calls, ever" mirrored its neighbour. Repeating your
 *  own opening numbers forty viewports later does not reinforce them; it tells
 *  the reader you have run out of things to say.
 *
 *  The two that survive are the two the hero does NOT print, and they are the
 *  two this section is actually about: how many clients there are, and that the
 *  whole thing runs without a meeting. The client count is stated as it is; it
 *  is never rounded up. */
const STANDING = [
  { value: "1", label: "Public client, linked above" },
  { value: "100%", label: "Async, from brief to launch" },
] as const;

/* THESE LINKS WERE THE ONLY CLICKABLE PROOF ON THE PAGE, AND ALL OF THEM WERE
   DARK. The section says, in its own lede, "open them and judge for yourself" —
   and then had no idea whether anyone ever did. Worse for the four internal
   ones: bypassing CtaLink also bypasses sessionStorage["strata_cta_source"],
   so a visitor who opened a demo and came back to send a brief was
   unattributable. The demo archive is this studio's largest proof asset and
   its entire contribution to the funnel was invisible.

   The external one keeps a bare <a>: CtaLink renders next/link, which does
   not forward target/rel, and it must open in a new tab or the page loses
   the reader to a client's site. It gets the tracking call directly. */
function LedgerRow({ row }: { row: LedgerRowData }) {
  const link = row.external ? (
    <a
      href={row.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackCtaClick("testimonials", "secondary", row.href, "home")}
      className="nl-mono-sm underline-offset-4 hover:underline"
      style={{ color: "var(--nl-accent)" }}
    >
      {row.linkLabel} ↗
    </a>
  ) : (
    <CtaLink
      href={row.href}
      location="testimonials"
      variant="secondary"
      destination="demos"
      className="nl-mono-sm underline-offset-4 hover:underline"
      style={{ color: "var(--nl-accent)" }}
    >
      {row.linkLabel} ↗
    </CtaLink>
  );

  return (
    <div
      data-row
      data-cursor="Detail"
      className="nl-expand"
      style={{ borderBottom: "1px solid var(--nl-r11)" }}
    >
      {/* The visible row. Stacks below md so nothing — least of all the
          honesty label — has to be dropped to fit a phone. */}
      <div className={`flex flex-col gap-[7px] px-[14px] py-[15px] md:grid ${COLS}`}>
        <span
          data-tnum
          className="nl-num hidden text-[10px] tracking-[0.14em] md:block"
          style={{ color: "var(--nl-accent)" }}
        >
          {row.n}
        </span>

        <span
          className="text-[15.5px] font-semibold leading-tight tracking-[-0.02em] md:truncate"
          style={{ color: "var(--nl-paper)" }}
        >
          {row.name}
          <span className="font-normal" style={{ color: "var(--nl-meta)" }}>
            {" "}
            · {row.sector}
          </span>
        </span>

        <span className="text-[13.5px] leading-snug" style={{ color: "var(--nl-body)" }}>
          {row.what}
        </span>

        <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
          {row.standing}
        </span>

        <span className="md:text-right">{link}</span>
      </div>

      {/* The disclosure. `.nl-expand > :last-child` carries the overflow clip. */}
      <div>
        <div className="flex flex-col gap-3 px-[14px] pb-5 pt-0.5 md:flex-row md:items-start md:justify-between md:gap-8 md:pl-[66px]">
          <p
            className="m-0"
            style={{
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--nl-meta)",
              maxWidth: "70ch",
            }}
          >
            {row.note}
          </p>
          <span
            className="nl-mono-xs whitespace-nowrap pt-[3px]"
            style={{ color: "var(--nl-faint)" }}
          >
            {row.noteMeta}
          </span>
        </div>
      </div>
    </div>
  );
}

function LedgerBlock({
  caption,
  meta,
  nameCol,
  whatCol,
  rows,
}: {
  caption: string;
  meta: string;
  nameCol: string;
  whatCol: string;
  rows: readonly LedgerRowData[];
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 px-[14px]">
        <span className="nl-mono" style={{ color: "var(--nl-paper)" }}>
          {caption}
        </span>
        <span className="nl-mono-sm" style={{ color: "var(--nl-faint)" }}>
          {meta}
        </span>
      </div>

      <div
        className={`hidden px-[14px] pb-[10px] md:grid ${COLS}`}
        style={{ borderBottom: "1px solid var(--nl-r20)" }}
      >
        <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
          №
        </span>
        <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
          {nameCol}
        </span>
        <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
          {whatCol}
        </span>
        <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
          Standing
        </span>
        <span className="nl-mono-xs md:text-right" style={{ color: "var(--nl-meta)" }}>
          Where
        </span>
      </div>

      {rows.map((row) => (
        <LedgerRow key={row.name} row={row} />
      ))}
    </div>
  );
}

interface ReceiptsProps {
  /**
   * Computed in page.tsx via readdirSync, exactly like the hero's. Optional —
   * when it is absent the archive caption simply doesn't quote a figure, which
   * is preferable to printing one this file cannot verify.
   */
  demoCount?: number;
}

export function Receipts({ demoCount }: ReceiptsProps) {
  const ref = useRef<HTMLElement | null>(null);
  // CONTRACT: the analytics id stays "testimonials". Do not rename to match
  // the section's new label — the funnel reports key off this string.
  useSectionView(ref, "testimonials");

  return (
    <section
      ref={ref}
      id="receipts"
      data-tone="dark"
      data-screen-label="Receipts"
      data-bg="#0a1730"
      className="nl-section"
      style={{ background: "var(--nl-ground-ink-band)", paddingBottom: 118 }}
    >
      <LedgerHead label="The record" meta="One public client · every page on file" />

      <div className="nl-inner flex flex-col" style={{ gap: 46 }}>
        <div className="grid gap-8 md:grid-cols-[1.08fr_0.92fr] md:items-end md:gap-16">
          <h2 className="nl-h2 m-0" style={{ fontSize: "clamp(34px,4.6vw,66px)", lineHeight: 0.95 }}>
            <span className="block overflow-hidden">
              <span data-reveal className="block">
                Every build,
              </span>
            </span>
            <span className="block overflow-hidden">
              <span
                data-reveal
                className="block"
                style={{ animationRange: "entry 14% cover 30%" }}
              >
                and what it is.
              </span>
            </span>
          </h2>
          <p
            data-fade
            className="m-0"
            style={{ fontSize: 17.5, color: "var(--nl-meta)", maxWidth: "50ch" }}
          >
            A new studio with one public client and no curated case studies. It is named and
            linked below &mdash; open it and judge for yourself. Everything under it is a page we
            built to show the work, and it is labelled as fiction. Every number on this page is
            either a target we build to or a live measurement, never a statistic we invented.
          </p>
        </div>

        <LedgerBlock
          caption="On the record"
          meta="Clients who paid · public"
          nameCol="Client · sector"
          whatCol="What we built"
          rows={RECORD}
        />

        <LedgerBlock
          caption="The archive"
          meta={
            demoCount ? `${demoCount} pages on file · four shown` : "Every page on file · four shown"
          }
          nameCol="Specimen · industry"
          whatCol="Conversion goal"
          rows={ARCHIVE}
        />

        {/* Explicit columns, not auto-fit: a half-empty row would expose the
            hairline ground as a solid block. See the note in nl.css. With two
            cells the lg:grid-cols-4 variant HAD to go too — it would have left
            two empty cells and printed exactly that block. Two large numerals
            is also the more confident composition. */}
        <div
          className="grid grid-cols-2"
          style={{
            gap: 1,
            background: "var(--nl-r14)",
            borderTop: "1px solid var(--nl-r14)",
            borderBottom: "1px solid var(--nl-r14)",
          }}
        >
          {STANDING.map((s) => (
            <div
              key={s.label}
              data-fade
              className="flex flex-col gap-[5px]"
              style={{ background: "var(--nl-ink-band)", padding: "20px 22px" }}
            >
              <span
                data-tnum
                className="nl-num text-[27px] font-bold leading-none tracking-[-0.04em]"
                style={{ color: "var(--nl-paper)" }}
              >
                {s.value}
              </span>
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--nl-meta)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p data-fade className="m-0" style={{ fontSize: 13, color: "var(--nl-faint)", maxWidth: "78ch" }}>
          {/* "open their pages and judge them" came out — the lede sixty lines
              above says "open them and judge for yourself", directly over the
              links it refers to, which is the only place the instruction is
              actionable. Saying it a second time here, and a third time in the
              handoff below, read as pleading.

              The opening negation stays exactly as written: nl-audit's
              fabricated-proof rule matches "reference call", and this sentence
              passes only because it negates it. */}
          There are no reference calls here, because there are no calls. The four specimens are
          showcase builds:
          real code, real design, invented brands, and they say so on every screen. When your page is
          live, the numbers on it will be yours.
        </p>

        {/* THE EXIT FROM THE RECORD. This section states the page's largest
            objection in the studio's own voice — "a new studio with two public
            clients and no curated case studies" — and then, until now, left the
            reader holding it with nowhere to go except six outbound links. A
            visitor who has just been told the honest worst thing about us and
            is still reading is the most qualified visitor on the page. */}
        <Handoff line={handoffs.receipts.line} location={handoffs.receipts.location} />
      </div>
    </section>
  );
}
