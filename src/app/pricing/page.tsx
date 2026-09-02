/**
 * /pricing — THE CATALOG, as its own destination (Observatory voice).
 * One world from the masthead to the closer. BEDROCK/the catalog is the
 * same band the homepage descends to. data-nav-force-deep keeps the
 * chrome in night glass here.
 */

import { Band14Bedrock } from "@/components/strata/bands/Band14Bedrock";
import { CtaRow } from "@/components/strata/CtaRow";
import { strataFontVars } from "@/components/strata/fonts";
import "@/components/strata/tokens.css";
import { scopeClarity, trustBadges } from "@/lib/brand";

export default function PricingPage() {
  return (
    <main className={`strata-world ${strataFontVars} bg-strata-bedrock`}>
      {/* keep the fixed chrome in deep glass on this route */}
      <div data-nav-force-deep hidden aria-hidden />

      {/* masthead — the catalog opens */}
      <section className="st-grain st-grain-deep st-column-deep relative text-strata-bone-body">
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-32 lg:px-10 lg:pt-36">
          <div className="flex items-baseline justify-between border-b border-strata-hairline-deep pb-3">
            <p className="st-mono text-strata-bone-mute">
              STRATALANDING — THE CATALOG
            </p>
            <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
              FIXED SCOPE · FIXED PRICE · NO CALLS
            </p>
          </div>
          <h1 className="st-chapter mt-10 max-w-[18ch] text-strata-bone">
            Three magnitudes.{" "}
            <em className="italic text-strata-live">Nothing variable.</em>
          </h1>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
            {trustBadges.map((b) => (
              <p key={b.label} className="st-mono text-strata-bone-mute">
                <span className="text-strata-live">{b.value}</span>
                &ensp;{b.label.toUpperCase()}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* BEDROCK — the same monuments the homepage descends to */}
      <Band14Bedrock />

      {/* the scope ledger — included vs not, as survey plates */}
      <section className="st-grain st-grain-deep st-column-floor relative text-strata-bone-body">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
          <p className="st-mono text-strata-bone-mute">
            THE SCOPE LEDGER — WHAT THE PRICE BUYS, AND WHAT IT NEVER DID
          </p>
          <div className="st-score mt-3 !bg-strata-hairline-deep" />

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="st-plate-deep p-8">
              <p className="st-mono text-strata-live">
                INCLUDED IN EVERY BUILD
              </p>
              <ul className="mt-5 space-y-3">
                {scopeClarity.included.map((item) => (
                  <li
                    key={item}
                    className="st-body flex gap-3 !text-[15px] text-strata-bone-body"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.7em] h-px w-4 shrink-0 bg-strata-live"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="st-plate-deep p-8">
              <p className="st-mono text-strata-bone-mute">
                NOT INCLUDED — THAT&rsquo;S THE SCOPE
              </p>
              <ul className="mt-5 space-y-3">
                {scopeClarity.notIncluded.map((item) => (
                  <li
                    key={item}
                    className="st-body flex gap-3 !text-[15px] text-strata-bone-mute"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.7em] h-px w-4 shrink-0 bg-strata-bone-mute"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* the closer */}
      <section className="st-grain st-grain-deep st-column-floor relative text-strata-bone-body">
        <div className="mx-auto max-w-6xl px-6 pb-28 pt-6 lg:px-10 lg:pb-32">
          <h2 className="st-chapter max-w-[16ch] text-strata-bone">
            Ten minutes of brief. A fixed proposal in 24 hours.
          </h2>
          <p className="st-body mt-5 text-strata-bone-body">
            No payment to submit the brief. No calls, ever. The balance only
            moves after you approve the finished page.
          </p>
          <div className="mt-8">
            <CtaRow location="pricing-final" />
          </div>
        </div>
      </section>
    </main>
  );
}
