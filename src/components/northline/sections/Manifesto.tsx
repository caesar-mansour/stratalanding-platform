import { SectionView } from "../SectionView";
import { LedgerHead } from "../LedgerHead";
import { Plate } from "../Plate";

/**
 * THE MANIFESTO — the belief statement.
 *
 * The one place on the page that argues instead of demonstrating. Dark ground,
 * a background plate, and a single sentence set in the ornament face at display
 * size. Everything else in this section is deliberately small.
 *
 * THE PER-WORD REVEAL. Each word is its own [data-wm] element inside a
 * .nl-mask, and each carries an `animation-range` 2.4% later than the word
 * before it. That is a CSS scroll-driven animation (animation-timeline: view(),
 * declared in nl.css) — so these elements must NEVER also carry a data-anim
 * key. One writer per element. The line offsets (3.0 / 12.0 / 21.0) and the
 * fixed 17% entry-to-cover span are the source design's values, kept verbatim:
 * the slight overlap at each line break is what stops the reveal reading as
 * three separate mechanical sweeps.
 *
 * WHAT CHANGED FROM THE SOURCE. The statement is carried word for word. The two
 * closing paragraphs are not: Northline's closed on "measured against booked
 * revenue", which is a promise a studio with no client analytics on file cannot
 * make. Ours close on the four things that are structurally true of how
 * StrataLanding actually operates — async, no calls, fixed price, approval
 * before the balance — and "No calls, ever." is stated as a claim rather than
 * buried as a footnote, because it is the differentiator, not a caveat.
 */

/**
 * The statement, one line per array entry. `start` is the entry% of the line's
 * first word; every word after it steps by STEP. Cover is always start + SPAN.
 */
const STATEMENT: ReadonlyArray<{ start: number; words: readonly string[] }> = [
  { start: 3.0, words: ["A", "page", "is", "not", "decoration."] },
  { start: 12.0, words: ["It", "is", "the", "cheapest", "employee"] },
  { start: 21.0, words: ["you", "will", "ever", "hire."] },
];

/** Per-word delay, in scroll-range percent. The source's value. */
const STEP = 2.4;
/** Entry -> cover distance. Constant across every word. */
const SPAN = 17;

export function Manifesto() {
  return (
    <section
      id="manifesto"
      data-tone="dark"
      data-screen-label="Belief"
      data-bg="#0a1730"
      className="nl-section"
      style={{ background: "var(--nl-ground-ink-band)", paddingBottom: 140, overflow: "hidden" }}
    >
      {/* Never `priority`, always under the veil — Plate.tsx enforces both. */}
      <Plate id="manifesto" position="50% 30%" />

      <div className="relative">
        {/* Reach reporting for a server component — see SectionView. */}
      <SectionView anchor="manifesto" report="manifesto" />

      <LedgerHead label="Belief" meta="Why we build this way" />

        <div className="nl-inner flex flex-col gap-11">
          <span data-fade className="nl-mono" style={{ color: "var(--nl-meta)" }}>
            What we actually believe
          </span>

          <div
            className="nl-serif"
            style={{
              fontSize: "clamp(34px,5.4vw,84px)",
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              maxWidth: "20ch",
            }}
          >
            {STATEMENT.map((line) => (
              <span key={line.words.join("-")} className="block">
                {line.words.map((word, i) => (
                  <span key={word + i}>
                    {/* The mask clips the rise; the inner span is the one that
                        moves, so it has to stay inline-block. */}
                    <span className="nl-mask">
                      <span
                        data-wm="1"
                        style={{
                          display: "inline-block",
                          animationRange: `entry ${(line.start + i * STEP).toFixed(1)}% cover ${(
                            line.start +
                            i * STEP +
                            SPAN
                          ).toFixed(1)}%`,
                        }}
                      >
                        {word === "hire." ? (
                          <>
                            <em>hire</em>.
                          </>
                        ) : (
                          word
                        )}
                      </span>
                    </span>{" "}
                  </span>
                ))}
              </span>
            ))}
          </div>

          <div
            className="flex flex-wrap gap-14 pt-3"
            style={{ borderTop: "1px solid var(--nl-r16)" }}
          >
            <p
              data-fade
              className="m-0"
              style={{ fontSize: 17, color: "var(--nl-meta)", maxWidth: "38ch" }}
            >
              It works every hour you don&rsquo;t. It never forgets the pitch, never tires of the
              same question, and answers it the same way at two in the morning as it does at noon.
              Most owners pay theirs nothing and expect nothing back.
            </p>
            <p
              data-fade
              className="m-0"
              style={{
                fontSize: 17,
                color: "var(--nl-meta)",
                maxWidth: "38ch",
                animationRange: "entry 12% cover 32%",
              }}
            >
              {/* The third sentence restated the payment terms. This is the
                  page's BELIEF section — the one place a thing is asserted
                  rather than demonstrated — and the terms are demonstrated, in
                  the ledger, beside the numbers they apply to. Two structural
                  facts are enough to make the hire analogy land. */}
              So we build it the way you&rsquo;d make a hire. The price is fixed before a line is
              written, and no calls, ever &mdash; the whole build runs in writing, on your
              schedule.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
