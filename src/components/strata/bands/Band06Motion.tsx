/**
 * SP6 — THE MOTION SCORE (motion band). THE PRESSRUN · Act I.
 *
 * The two authored easings drawn as press scores — the curves are PLOTTED
 * FROM THE REAL TOKENS (§H6: the platen .18,0,.04,1 · the roller
 * .42,0,.16,1), never redrawn by hand. The score-dot rides the platen
 * curve (existing offset-path mechanic). The banned list survives as
 * struck sorts. Self-referential by construction: these figures OPEN with
 * the exact grammar we sell (.st-open). RSC.
 *
 * Copy note: "Seven moves" is an honesty correction (the motion score has
 * seven named beats) — logged in the DECISIONS ledger.
 */

import { CutSection } from "../Cut";

/* control points computed from the H6 beziers on the 20→540 / 78→12 stage */
const PLATEN_PATH = "M20,78 C113.6,78 40.8,12 540,12"; /* (.18,0,.04,1) */
const ROLLER_PATH = "M20,78 C238.4,78 103.2,12 540,12"; /* (.42,0,.16,1) */

const GRID = "rgba(11,27,58,.12)";

export function Band06Motion() {
  return (
    <CutSection
      band="motion"
      className="st-grain st-rays st-column-shallow-3 relative text-strata-ink"
    >
      <div className="st-bed py-20 lg:py-28">
        <div className="flex items-baseline justify-between">
          <p className="st-mono text-strata-ink-mute">
            ST.03 / THE MOTION SCORE — CHOREOGRAPHY, NOT DECORATION
          </p>
          <p className="st-mono-sm hidden text-strata-ink-mute sm:block">
            INCLUDED: LEAD · PURCHASE
          </p>
        </div>
        <div className="st-score mt-3" />

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
          <div className="st-open self-center">
            <h2 className="st-chapter">
              Motion has one job: direct attention.
            </h2>
            <p className="st-body mt-6 text-strata-ink-body">
              Two authored curves. Seven moves. Nothing loops, nothing
              floats, nothing performs for its own sake. If an animation
              doesn&rsquo;t help a visitor decide, it gets deleted.
            </p>
            <p className="st-mono-sm mt-6 text-strata-ink-mute">
              THE FIGURES OPPOSITE JUST DEMONSTRATED IT — THAT REVEAL IS THE
              PRODUCT.
            </p>
          </div>

          {/* the scores — plotted from the live tokens */}
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <figure
                className="st-open border border-strata-hairline bg-strata-paper2 p-6"
                data-cut-step="1"
              >
                <figcaption className="st-mono-sm text-strata-ink-mute">
                  SCORE I — THE PLATEN · ENTER
                </figcaption>
                <div className="relative mt-4">
                  <svg viewBox="0 0 560 90" className="w-full" aria-hidden>
                    <g stroke={GRID}>
                      <path d="M0,22H560M0,45H560M0,68H560" />
                    </g>
                    <path
                      d={PLATEN_PATH}
                      fill="none"
                      stroke="#0891B2"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <span
                    aria-hidden
                    className="st-score-dot"
                    style={{ offsetPath: `path('${PLATEN_PATH}')` }}
                  />
                </div>
                <p className="st-mono-sm mt-3 text-strata-ink-mute">
                  CUBIC-BEZIER(.18, 0, .04, 1) · 180–400MS · ONCE, ON ENTRY
                </p>
              </figure>

              <figure
                className="st-open border border-strata-hairline bg-strata-paper2 p-6"
                data-cut-step="2"
              >
                <figcaption className="st-mono-sm text-strata-ink-mute">
                  SCORE II — THE ROLLER · THE SWEEP
                </figcaption>
                <div className="relative mt-4">
                  <svg viewBox="0 0 560 90" className="w-full" aria-hidden>
                    <g stroke={GRID}>
                      <path d="M0,22H560M0,45H560M0,68H560" />
                    </g>
                    <path
                      d={ROLLER_PATH}
                      fill="none"
                      stroke="#0B1B3A"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <span
                    aria-hidden
                    className="st-score-dot"
                    data-curve="exit"
                    style={{ offsetPath: `path('${ROLLER_PATH}')` }}
                  />
                </div>
                <p className="st-mono-sm mt-3 text-strata-ink-mute">
                  CUBIC-BEZIER(.42, 0, .16, 1) · SCRUBBED + 160MS STATES
                </p>
              </figure>
            </div>

            <figure
              className="st-open flex flex-wrap items-baseline gap-x-6 gap-y-2 border border-strata-hairline bg-strata-paper2 px-6 py-4"
              data-cut-step="3"
            >
              <figcaption className="st-mono-sm text-strata-ink-mute">
                THE BANNED LIST
              </figcaption>
              <p className="st-mono leading-7 text-strata-ink-mute">
                <span className="line-through decoration-strata-seam">PARALLAX</span> ·{" "}
                <span className="line-through decoration-strata-seam">FLOATING BLOBS</span> ·{" "}
                <span className="line-through decoration-strata-seam">BLUR-INS</span> ·{" "}
                <span className="line-through decoration-strata-seam">SCALE POPS</span> ·{" "}
                <span className="line-through decoration-strata-seam">ENDLESS LOOPS</span>
              </p>
            </figure>
          </div>
        </div>
      </div>
    </CutSection>
  );
}
