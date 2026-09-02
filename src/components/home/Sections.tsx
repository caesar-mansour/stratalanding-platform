import Link from "next/link";
import { cta, pricing, goalRouter } from "@/lib/brand";
import { Reveal } from "./Motion";

/**
 * S3 · S4 · S5 — the three bands that turn a hero into a page.
 *
 * Each band has a DELIBERATELY different internal structure, because three
 * consecutive card grids read as a UI kit. Websmith states the rhythm:
 * "alternating section types: large text blocks, 2-column card grids… and a
 * testimonial block." So:
 *
 *   S3  seamed grid   — gap:0, hairlines ON the cell borders, no floating cards
 *   S4  ruled table   — mono step no. | title | body | mono duration, one rule per row
 *   S5  navy band     — the page's one full-bleed inversion, carrying the prices
 *
 * Helloivy is the reference for the seamed grid: "a strong, visible grid system
 * using fine 1px borders that divide the page into distinct, almost cell-like
 * blocks" — and its stated depth mechanism is borders, not shadows. 19–86 builds
 * an entire page on nothing but 1px rules and tabular alignment, which is exactly
 * what the ruled table is.
 *
 * Gapped cards floating in a field is what "component preview" looks like.
 * Seamed compartments on ruled paper is what a page looks like.
 */

const STEPS = [
  { d: "Day 0", t: "You send the brief", y: "A short form. No call, no meeting.", s: "10 minutes" },
  { d: "Day 1", t: "You get the proposal", y: "Fixed scope, fixed price, a date.", s: "24 hours" },
  { d: "Day 2", t: "We build", y: "Design, copy, and the Next.js build.", s: "7–21 days" },
  { d: "Review", t: "You mark it up", y: "Revisions until you sign off.", s: "Unlimited" },
  { d: "Launch", t: "You own it", y: "Source, domain, analytics. Yours.", s: "Same day" },
];

export function Sections({ demoCount }: { demoCount: number }) {
  return (
    <>
      {/* ── S3 — WHAT YOU GET · seamed grid, gap 0 ──────────────────────── */}
      <section data-band="s3" className="one-sec" id="what">
        <div className="one-wrap">
          <Reveal as="header" className="one-secHead">
            <span className="one-eyebrow">
              <span className="one-eyebrow__no">02</span>
              What you get
            </span>
            <h2 className="one-h2">One page, built to do one job.</h2>
            <p className="one-secHead__lead">
              Tell us the outcome you need. Every build ships with the design, the
              copy, the code, the forms and the tracking already done.
            </p>
          </Reveal>

          <Reveal className="one-seam" stagger={80}>
            {goalRouter.map((g, i) => (
              <Link key={g.goal} href={g.demoHref} className="one-seam__cell">
                <span className="one-seam__no">{String(i + 1).padStart(2, "0")}</span>
                <span className="one-seam__t">{g.label}</span>
                <span className="one-seam__d">{g.description}</span>
                <span className="one-seam__specs">
                  {g.specs.map((s) => (
                    <span key={s} className="one-seam__spec">{s}</span>
                  ))}
                </span>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── S4 — HOW IT WORKS · ruled table ─────────────────────────────── */}
      <section data-band="s4" className="one-sec one-sec--alt" id="how">
        <div className="one-wrap">
          <Reveal as="header" className="one-secHead one-secHead--row">
            <span className="one-eyebrow">
              <span className="one-eyebrow__no">03</span>
              How it works
            </span>
            <h2 className="one-h2">No calls, ever.</h2>
          </Reveal>

          <Reveal className="one-table" stagger={60}>
            <div className="one-table__head">
              <span>Stage</span><span>What happens</span><span>Your part</span><span className="one-ta-r">Takes</span>
            </div>
            {STEPS.map((s) => (
              <div key={s.t} className="one-table__row">
                <span className="one-num one-table__d">{s.d}</span>
                <span className="one-table__t">{s.t}</span>
                <span className="one-table__y">{s.y}</span>
                <span className="one-num one-table__s">{s.s}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── S5 — PRICING · the page's one full-bleed navy inversion ──────── */}
      <section data-band="s5" className="one-pit" id="pricing">
        <div className="one-wrap">
          <Reveal as="header" className="one-secHead one-secHead--row">
            <span className="one-eyebrow one-eyebrow--dark">
              <span className="one-eyebrow__no">04</span>
              Pricing
            </span>
            <h2 className="one-h2 one-h2--dark">Three prices. Agreed before we start.</h2>
          </Reveal>

          <Reveal className="one-tiers" stagger={90}>
            {pricing.map((p) => (
              <div key={p.slug} className={`one-tier ${p.highlighted ? "is-pick" : ""}`}>
                {p.highlighted && <span className="one-tier__pick">Most chosen</span>}
                <span className="one-tier__name">{p.name}</span>
                {/* prices in mono tabular so the three optically align on the $ */}
                <span className="one-price one-price--dark">{p.price}</span>
                <span className="one-tier__meta one-num">{p.delivery}</span>
                <ul className="one-tier__list">
                  {p.features.slice(0, 5).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href={`/brief?plan=${p.slug}`} className="one-cta one-cta--onDark one-cta--sm">
                  {cta.primary.label}
                </Link>
              </div>
            ))}
          </Reveal>

          <p className="one-pit__foot">
            {cta.microcopy}{" "}
            <Link href={cta.secondary.href} className="one-link one-link--dark">
              Browse the <span className="one-num">{demoCount}</span>{" "}demo pages
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
