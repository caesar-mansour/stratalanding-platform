"use client";

/**
 * THE PRICE LEDGER — the money path.
 *
 * PAPER REGISTER, same as System: ledger head, full-bleed ruled rows, zero
 * radius, zero shadow. Three rows, one per package, and the recommended tier
 * INVERTS — it is the only element on a light ground that flips to the deep
 * navy band, which is why it also carries data-tone="dark": nl.css re-points
 * the whole token ladder (accent 0891B2 -> 22D3EE, body/meta/hairlines to the
 * paper alphas) inside anything marked dark. Painting the row dark without the
 * attribute would leave navy-on-navy meta text.
 *
 * EVERY NUMBER COMES FROM brand.ts. No price, package name, delivery window,
 * revision count or scope line is typed in this file — `pricing` is the single
 * source and the chips are assembled from each tier's `deliverables` object.
 * feedback_pricing-accuracy.md: inventing a price here is the one mistake that
 * cannot be walked back after a client has read it.
 *
 * THE CTA CONTRACT (do not reorder, do not inline a bare <Link>):
 *   1. trackPlanSelect(pkg)  — persists the plan, fires plan_select
 *   2. trackCtaClick(...)    — writes sessionStorage.strata_cta_source
 * plan_select must land BEFORE cta_click or the funnel report attributes the
 * click to no plan. The href carries the PAGE SLUG ("lead-page"); /brief
 * normalises it to the package internally, so putting "growth" in the URL
 * silently drops the preselection.
 *
 * WHAT THE SOURCE CLAIMED AND THIS DOES NOT. The v4 markup sold the middle row
 * with a mono "MOST CHOSEN" and a lede promising "if the first page doesn't
 * beat what you have now on the same traffic, we rebuild it once at no charge".
 * StrataLanding has no client count to make "most chosen" true and no such
 * guarantee in writing anywhere. The marker is now OUR RECOMMENDATION (which is
 * exactly what brand.ts calls the highlighted tier) and the lede sells the real
 * terms: 50/50, and you approve the build before the balance is due.
 */

import { useRef } from "react";
import Link from "next/link";
import { pricing, planSlugToPackage, cta } from "@/lib/brand";
import { trackPlanSelect, trackCtaClick } from "@/lib/analytics";
import { useSectionView } from "@/components/strata/tier";
import { LedgerHead } from "../LedgerHead";

/**
 * brand.ts owns the mapping; this only narrows its `Record<string, string>` to
 * the union trackPlanSelect accepts. Re-declaring the pairs here is how the
 * slug->package map drifts, so it is deliberately a cast and not a new object.
 */
const SLUG_TO_PKG = planSlugToPackage as Record<string, "starter" | "growth" | "scale">;

/** "$4,800" -> 4800. Used only to find the top tier, never to print a price. */
const priceNum = (p: string) => Number(p.replace(/[^0-9.]/g, ""));

/** "6 rounds" -> "6 rounds of revisions"; "Unlimited" -> "Unlimited revisions". */
const revisionChip = (r: string) => (/^\d/.test(r) ? `${r} of revisions` : `${r} revisions`);

const CSS = `
/* THE ROW GRID LIVES HERE, NOT INLINE. It used to be an inline
   gridTemplateColumns plus data-nrw, which is the scroll engine's narrow-mode
   collapse — but the engine only mounts on desktop, so on a phone the collapse
   never fired and the description column squeezed to one word per line. In CSS
   a media query handles it with no JS at all, and an inline style can no longer
   outrank the breakpoint. */
[data-nl] .nlp-row{
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:20px;
  padding:24px var(--nl-gutter);
  align-items:start;
  transition:padding .45s var(--nl-ease),background-color .45s ease;
}
@media (min-width:860px){
  [data-nl] .nlp-row{
    grid-template-columns:minmax(0,1fr) auto;
    gap:44px;
    padding:34px;
    align-items:end;
  }
}
[data-nl] .nlp-row:hover{padding-left:54px;background-color:var(--nl-r06)}
[data-nl] .nlp-row.nlp-row-lead:hover{background-color:transparent}
/* A 1px-gap strip must fill every cell or the container hairline shows through
   as a solid block. auto-fit lands on 3 columns between ~474px and ~631px of
   container width, which would strand the fourth cell — so the columns are
   declared, 2 then 4. Same law as nl.css's .nl-strip-3, different item count. */
[data-nl] .nlp-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:900px){[data-nl] .nlp-strip{grid-template-columns:repeat(4,minmax(0,1fr))}}
/* Second headline line trails the first. Higher specificity than nl.css's
   [data-nl] [data-reveal] so stylesheet order can never decide the winner. */
@supports (animation-timeline: view()){
  [data-nl] [data-reveal].nlp-lag{animation-range:entry 14% cover 30%}
}
@media (prefers-reduced-motion: reduce){[data-nl] .nlp-row{transition:none}}
`;

export function Pricing() {
  const ref = useRef<HTMLElement | null>(null);
  useSectionView(ref, "pricing");

  const presence = pricing.find((p) => p.slug === "presence-page") ?? pricing[0];
  const top = pricing.reduce((a, b) => (priceNum(b.price) > priceNum(a.price) ? b : a));
  const unlimited = pricing
    .filter((p) => p.deliverables.revisions.toLowerCase() === "unlimited")
    .map((p) => p.name.replace(" Page", ""));

  return (
    <section
      ref={ref}
      id="pricing"
      data-screen-label="Pricing"
      data-bg="#f6f3ec"
      className="nl-section"
      style={{ background: "var(--nl-ground-bone)", paddingBottom: 120 }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <LedgerHead label="Pricing" meta="Fixed scope · released on milestones" />

      <div className="nl-inner flex flex-col gap-[46px]">
        <div className="grid items-end gap-[clamp(28px,4vw,64px)] lg:grid-cols-[0.9fr_1.1fr]">
          <h2 className="nl-h2 m-0" style={{ fontSize: "clamp(34px,4.6vw,66px)" }}>
            <span className="block overflow-hidden">
              <span data-reveal className="block">
                Priced like a build,
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-reveal className="nlp-lag block">
                not a subscription.
              </span>
            </span>
          </h2>
          <p
            data-fade
            className="m-0"
            style={{ fontSize: 18, lineHeight: 1.5, color: "var(--nl-body)", maxWidth: "52ch" }}
          >
            One number, agreed before we start. Half to begin, half before launch — and you
            approve the finished page before that balance is due. {cta.microcopy}
          </p>
        </div>

        {/* THE LEDGER. Full-bleed: the rows escape the 1240 column so the rules
            run past it, which is what stops three prices reading as three cards. */}
        <div data-fade className="nl-bleed flex flex-col">
          {pricing.map((p) => {
            const lead = p.highlighted;
            const chips = [
              p.deliverables.pages,
              p.deliverables.tracking,
              p.deliverables.integrations,
              revisionChip(p.deliverables.revisions),
            ].filter((c) => c && c !== "—");

            return (
              <div
                key={p.slug}
                data-lay
                {...(lead ? { "data-tone": "dark" as const } : {})}
                className={`nlp-row ${lead ? "nlp-row-lead" : ""}`}
                style={{
                  position: "relative",
                  borderTop: lead ? "1px solid var(--nl-ink-deep)" : "1px solid var(--nl-r20)",
                  ...(lead ? { background: "var(--nl-ink-deep)" } : {}),
                }}
              >
                {/* left — name, window, what it is, scope chips */}
                <div className="flex flex-col gap-[11px]">
                  <div className="flex flex-wrap items-baseline gap-4">
                    <span
                      className="nl-h2"
                      style={{
                        fontSize: lead ? "clamp(30px,3.7vw,62px)" : "clamp(30px,3.7vw,50px)",
                        lineHeight: 0.95,
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="nl-mono"
                      style={{ color: lead ? "var(--nl-accent)" : "var(--nl-meta)" }}
                    >
                      {p.delivery}
                    </span>
                  </div>

                  <p
                    className="m-0"
                    style={{ fontSize: 15, lineHeight: 1.55, color: "var(--nl-body)", maxWidth: "54ch" }}
                  >
                    {p.description}
                  </p>

                  <div className="flex flex-wrap gap-[7px] pt-[3px]">
                    {chips.map((c) => (
                      <span key={c} className="nl-chip">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* right — the number, the marker, the click */}
                <div className="flex flex-col items-end gap-[14px]">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      data-tnum
                      className="nl-num"
                      style={{
                        fontSize: lead ? "clamp(32px,4.1vw,68px)" : "clamp(32px,4.1vw,54px)",
                        fontWeight: 700,
                        letterSpacing: "-0.05em",
                        lineHeight: 0.92,
                      }}
                    >
                      {p.price}
                    </span>
                    {lead ? (
                      <span className="nl-mono" style={{ color: "var(--nl-meta)" }}>
                        Our recommendation
                      </span>
                    ) : null}
                  </div>

                  {/* THE CONTRACT. plan_select first, then cta_click. */}
                  <Link
                    href={`/brief?plan=${p.slug}`}
                    className={`nl-cta ${lead ? "" : "nl-cta-ghost"}`}
                    data-magnet
                    onClick={() => {
                      trackPlanSelect(SLUG_TO_PKG[p.slug]);
                      trackCtaClick(
                        "pricing",
                        p.highlighted ? "primary" : "secondary",
                        `/brief?plan=${p.slug}`,
                        "home"
                      );
                    }}
                  >
                    {cta.primary.label}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--nl-r20)" }} />
        </div>

        {/* THE TERMS STRIP. Four cells, every one checkable against brand.ts:
            nothing is charged before the proposal is approved; payment is the
            50/50 split the proposal and PayPal flow actually take; revision
            counts are read out of `deliverables`; handover is the FAQ answer
            verbatim in substance ("code, design, assets" after final payment). */}
        <div
          className="nlp-strip grid"
          style={{
            gap: 1,
            background: "var(--nl-r16)",
            border: "1px solid var(--nl-r16)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {[
            { n: "$0", t: "until you approve the proposal" },
            { n: "50/50", t: "deposit to start, balance before launch" },
            {
              n: presence.deliverables.revisions,
              t: `on ${presence.name.replace(" Page", "")} — ${unlimited.join(" and ")} are unlimited`,
            },
            { n: "100%", t: "of the code, design and assets, yours after final payment" },
          ].map((c) => (
            <div
              key={c.n}
              className="flex flex-col gap-[5px]"
              style={{ background: "var(--nl-bone)", padding: "20px 22px" }}
            >
              <span
                data-tnum
                className="nl-num"
                style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.04em" }}
              >
                {c.n}
              </span>
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--nl-meta)" }}>
                {c.t}
              </span>
            </div>
          ))}
        </div>

        <p
          data-fade
          className="m-0"
          style={{ fontSize: 13, lineHeight: 1.55, color: "var(--nl-meta)", maxWidth: "78ch" }}
        >
          Fixed scope, both ways: the deliverables above are exactly what is included. Anything
          outside them — extra pages, extra integrations, extra revision rounds on a {presence.name}
          {" "}— is quoted and confirmed in writing before we carry on, never billed by the hour.
          Builds larger than the {top.name} are quoted the same way, off your brief.
        </p>
      </div>
    </section>
  );
}
