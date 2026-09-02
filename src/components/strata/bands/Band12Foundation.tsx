/**
 * ST.08 — THE FOUNDATION + THE DRILL LOG.
 * (a) Ownership, verbatim law: after final payment everything is yours —
 *     no licensing, no monthly, no strings.
 * (b) The 6-step async process as a bore log with ownership prefixes —
 *     lands on "~30 minutes. Total." (content parity with howToSchema;
 *     how_it_works + #how-it-works kept). RSC.
 */

import { process } from "@/lib/brand";
import { CutSection } from "../Cut";

// whose time each step costs — the async promise, made arithmetic
const OWNER: Record<number, { who: "YOU" | "US"; time: string }> = {
  1: { who: "YOU", time: "5 MIN" },
  2: { who: "YOU", time: "10 MIN" },
  3: { who: "YOU", time: "15 MIN" },
  4: { who: "US", time: "24 HOURS" },
  5: { who: "US", time: "SEE PACKAGE" },
  6: { who: "US", time: "1 DAY" },
};

export function Band12Foundation() {
  return (
    <CutSection
      band="foundation"
      id="how-it-works"
      analyticsId="how_it_works"
      className="st-grain st-grain-deep st-column-deep relative text-strata-bone-body"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="flex items-baseline justify-between">
          <p data-scramble className="st-mono text-strata-bone-mute">
            ST.08 / THE FOUNDATION — CODE YOU OWN, A PROCESS YOU CAN READ
          </p>
          <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
            INCLUDED: EVERY TIER
          </p>
        </div>
        <div className="st-score mt-3 !bg-strata-hairline-deep" />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
          <div className="st-open self-start lg:sticky lg:top-28">
            <h2 className="st-chapter text-strata-bone">
              Next.js. TypeScript. Yours.
            </h2>
            <p className="st-body mt-6 text-strata-bone-body">
              After final payment, everything is yours — code, design,
              assets. No licensing fees. No monthly charges. No strings.
            </p>
            <p className="st-body mt-4 text-strata-bone-body">
              And the whole build costs you about{" "}
              <span className="text-strata-bone">thirty minutes</span> of
              your own time. Everything else happens on our side of the
              glass.
            </p>
          </div>

          {/* the drill log */}
          <div className="st-open" data-cut-step="2">
            <p className="st-mono-sm mb-4 text-strata-bone-mute">
              THE DRILL LOG — SIX ENTRIES, START TO LAUNCH
            </p>
            <ol className="border-t border-strata-hairline-deep">
              {process.map((s) => {
                const o = OWNER[s.step];
                return (
                  <li
                    key={s.step}
                    className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 border-b border-strata-hairline-deep py-5"
                  >
                    <span className="st-mono text-strata-bone-mute">
                      {String(s.step).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="st-mono text-strata-bone">
                        {s.title.toUpperCase()}
                      </span>
                      <span className="st-body mt-1 block !text-[15px] text-strata-bone-body">
                        {s.description}
                      </span>
                    </span>
                    <span
                      className={`st-mono-sm text-right ${
                        o.who === "YOU"
                          ? "text-strata-seam"
                          : "text-strata-bone-mute"
                      }`}
                    >
                      {o.who} · {o.time}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="st-mono mt-6 text-strata-bone">
              YOUR TOTAL: ~30 MINUTES.{" "}
              <span className="text-strata-bone-mute">
                THE REST IS OURS TO CARRY.
              </span>
            </p>
          </div>
        </div>
      </div>
    </CutSection>
  );
}
