import Link from "next/link";
import { cta } from "@/lib/brand";
import { Plate } from "./Plate";
import { HeroIntro, Reveal, PlateScrub } from "./Motion";
import type { Plate as PlateData } from "./plateTypes";

/**
 * S1 HERO — split, left-aligned, 704 / 64 / 432 inside 1200px.
 *
 * The previous version was a centred five-object stack, and that composition is
 * exactly why the page read raw: five objects at generous spacing in a large
 * empty field. The references state the fix as geometry — "large headline on left
 * (~55% width) with a brief descriptive paragraph on right at ~30%, generous top
 * padding (~80px)" — which turns a stack into two composed columns and buys a
 * whole extra content slot at zero vertical cost.
 *
 * Object count in the first viewport goes 5 → ~40. Nothing about the foundation
 * changes to get there: no shadow, no gradient, no hover transform, no new
 * radius. The density comes entirely from the two tiers that were sitting at
 * ZERO usage — the JetBrains Mono metadata tier and the hairline tier.
 *
 * Display weight drops 500 → 400. Both calm warm-light references get their
 * authority by going LIGHTER, not bigger (one reference at 56px/330: "lightness
 * commands attention through understated elegance rather than brute force";
 * Dialog 70px/400 with an explicit ban on 600+). Do not fix "raw" by going
 * heavier — that is the direction that already got rejected at 132px/800.
 */

/* Declared lines. The underline on one keyword is the page's only decorative
   emphasis — the reference rule: "a thick text-decoration underline only — never color,
   bold weight increase, or highlight backgrounds." It is the single piece of
   visible authorship a no-colour palette can afford. */
const SPEC_ROWS = [
  { k: "Price", v: "$2,400 — $9,600, fixed" },
  { k: "Turnaround", v: "7–21 business days" },
  { k: "Calls", v: "None, ever" },
  { k: "Revisions", v: "Until you sign off" },
] as const;

const PROOF = [
  { k: "Mobile", v: "100/100" },
  { k: "LCP", v: "1.2s" },
  { k: "Proposal", v: "24h" },
] as const;

export function S1Hero({ plate, demoCount }: { plate: PlateData; demoCount: number }) {
  return (
    <>
      <section data-band="s1" className="one-s1" id="top">
        <div className="one-wrap one-s1__grid">
          {/* ── LEFT COLUMN, 704px ─────────────────────────────────────── */}
          <HeroIntro>
          <div className="one-s1__l">
            <span className="one-eyebrow">
              <span className="one-eyebrow__no">01</span>
              Landing page studio
            </span>

            <h1 className="one-display">
              Landing pages that{" "}
              <span className="one-display__mark">actually sell.</span>
            </h1>

            <div className="one-s1__ctas">
              <Link href={cta.primary.href} className="one-cta one-cta--primary">
                {cta.primary.label}
              </Link>
              <Link href={cta.secondary.href} className="one-cta one-cta--ghost">
                {cta.secondary.label}
              </Link>
            </div>

            {/*
              The proof strip. Divided by vertical hairlines, mono values —
              Panxo's greyscale trust strip at "equal visual weight across
              brands". Every number here is measurable today, which is the
              honesty gate: a real measured number or the cell is removed.
            */}
            <div className="one-s1__proof">
              {PROOF.map((p, i) => (
                <span key={p.k} className="one-s1__proofCell">
                  {i > 0 && <span className="one-vrule" aria-hidden="true" />}
                  <span className="one-s1__proofK">{p.k}</span>
                  <span className="one-s1__proofV one-num">{p.v}</span>
                </span>
              ))}
            </div>
          </div>
          </HeroIntro>

          {/* ── RIGHT COLUMN, 432px ────────────────────────────────────────
              Top-aligned with the headline, then four hairline label/value rows.
              This occupies the horizontal field at zero vertical cost and
              answers the four buying questions above the fold. The references run
              mono label/value pairs with "zero visual chrome"; GUSTAVO Faria
              separates list rows with nothing but 1px hairlines. */}
          <Reveal as="aside" className="one-s1__r" delay={420}>
            <p className="one-subline">
              We design, write and build the whole page in Next.js, then hand you
              something that loads fast and asks for the sale.
            </p>
            <dl className="one-spec">
              {SPEC_ROWS.map((r) => (
                <div key={r.k} className="one-spec__row">
                  <dt className="one-spec__k">{r.k}</dt>
                  <dd className="one-spec__v">{r.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* ── THE WORK ──────────────────────────────────────────────────────
            Text tabs above the plate — underlined text, no pills, no chips.
            They are the fourth object group in the stage and they promise the
            catalogue without needing a second band to do it. */}
        <div className="one-s1__stage" id="work">
          <Reveal className="one-stageHead">
            <span className="one-label">Selected work</span>
            <span className="one-stageHead__tabs">
              <span className="one-tab is-on">Dental</span>
              <span className="one-tab">SaaS</span>
              <span className="one-tab">Local service</span>
              <span className="one-tab">Ecommerce</span>
            </span>
            <Link href={cta.secondary.href} className="one-link one-stageHead__all">
              All <span className="one-num">{demoCount}</span>{" "}pages
            </Link>
          </Reveal>
          <PlateScrub travel={1.8}>
            <Plate plate={plate} variant="page" fadeBottom priority />
          </PlateScrub>
        </div>
      </section>

      {/* ── S2 — the ruled ledger, not three floating logos ────────────────
          A hairline index table: mono uppercase column headers, one rule under
          every row. This is the device both genuine studio-index references use
          (Studio Emmerer's PROJECT/TYPE/LOCATION/YEAR, 19–86's project table),
          and it converts a sparse trust band into ~30 legible marks with no
          colour, no shadow and no new component. */}
      <section data-band="s2" className="one-s2">
        <div className="one-wrap">
          <Reveal className="one-ledger" stagger={70}>
            <div className="one-ledger__head">
              <span>Client</span><span>Sector</span><span>Built</span><span>Live at</span>
            </div>
            <div className="one-ledger__row">
              <span className="one-ledger__c1">VIP High Class</span>
              <span>Luxury car service</span>
              <span className="one-num">Presence Page</span>
              <a className="one-link one-num" href="https://viphighclass.com" target="_blank" rel="noopener noreferrer">viphighclass.com</a>
            </div>
            <div className="one-ledger__row is-muted">
              <span className="one-ledger__c1">
                <span className="one-num">{demoCount}</span>{" "}demo pages
              </span>
              <span>Every sector we build for</span>
              <span className="one-num">Browsable</span>
              <Link className="one-link" href={cta.secondary.href}>Browse the demos</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
