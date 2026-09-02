/**
 * ST.07 — THE MEASUREMENT + THE WINDOW. The client portal as a specimen:
 * drawn as the survey ledger it actually is (milestones you approve, Loom
 * walkthroughs, direct chat) — the async promise made tangible. Phosphor
 * only on the one genuinely live thing: the build in progress. RSC.
 */

import { CutSection } from "../Cut";

const MILESTONES = [
  { label: "BRIEF RECEIVED", state: "done" as const, note: "YOU · 10 MIN" },
  { label: "WIREFRAME + MESSAGING", state: "done" as const, note: "APPROVED BY YOU — CHECKPOINT 1" },
  { label: "FULL BUILD + TRACKING", state: "live" as const, note: "IN PRODUCTION — LOOM UPDATES AS IT HAPPENS" },
  { label: "FINAL REVIEW", state: "wait" as const, note: "AWAITS YOUR APPROVAL — CHECKPOINT 2" },
  { label: "BALANCE + LAUNCH", state: "wait" as const, note: "THE BALANCE ONLY MOVES AFTER YOU APPROVE" },
];

export function Band11Window() {
  return (
    <CutSection
      band="window"
      id="client-portal"
      analyticsId="client_portal"
      className="st-grain st-grain-deep st-column-deep relative text-strata-bone-body"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="flex items-baseline justify-between">
          <p data-scramble className="st-mono text-strata-bone-mute">
            ST.07 / THE MEASUREMENT — AND THE WINDOW YOU WATCH IT THROUGH
          </p>
          <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
            THE CLIENT PORTAL · THE ACTUAL PRODUCT
          </p>
        </div>
        <div className="st-score mt-3 !bg-strata-hairline-deep" />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
          <div className="st-open self-center">
            <h2 className="st-chapter text-strata-bone">
              You watch every layer get laid.
            </h2>
            <p className="st-body mt-6 text-strata-bone-body">
              Loom walkthroughs at every milestone. Direct chat — answered
              async, no meetings, ever. Two checkpoints where nothing moves
              until you approve it. Then StrataMetrics reports what the
              finished page actually does.
            </p>
            <p className="st-mono mt-6 text-strata-bone-mute">
              NO CALLS · NO TIMEZONE JUGGLING · NOTHING SHIPS UNAPPROVED
            </p>
          </div>

          {/* the window: the portal drawn as its own ledger */}
          <figure
            className="st-open-iris st-plate-deep"
            data-cut-step="2"
          >
            <figcaption className="flex items-center justify-between border-b border-strata-hairline-deep px-6 py-3">
              <span className="st-mono-sm text-strata-bone-mute">
                STRATA PORTAL — PROJECT: YOUR-PAGE
              </span>
              <span className="st-mono-sm flex items-center gap-2 text-strata-bone-mute">
                <span className="st-live-dot st-glow-soft" /> IN PRODUCTION
              </span>
            </figcaption>
            <ul>
              {MILESTONES.map((m) => (
                <li
                  key={m.label}
                  className="flex items-baseline justify-between gap-4 border-b border-strata-hairline-deep px-6 py-4 last:border-b-0"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={
                        m.state === "live"
                          ? "st-live-dot"
                          : "h-[6px] w-[6px] rounded-full " +
                            (m.state === "done"
                              ? "bg-strata-bone"
                              : "border border-strata-bone-mute")
                      }
                    />
                    <span
                      className={`st-mono ${
                        m.state === "wait"
                          ? "text-strata-bone-mute"
                          : "text-strata-bone"
                      }`}
                    >
                      {m.label}
                    </span>
                  </span>
                  <span className="st-mono-sm hidden text-right text-strata-bone-mute sm:block">
                    {m.note}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between px-6 py-4">
              <span className="st-mono-sm text-strata-bone-mute">
                ▶ LOOM — BUILD WALKTHROUGH · 4:32
              </span>
              <span className="st-mono-sm text-strata-bone-mute">
                CHAT — LAST REPLY: 2H AGO, IN WRITING
              </span>
            </div>
          </figure>
        </div>
      </div>
    </CutSection>
  );
}
