/**
 * SP4 — THE REGISTRATION (claim band). THE PRESSRUN · Act I.
 *
 * Contract frame: scratchpad/pressbook/sp4-registration.png. One full-width
 * proof sheet pinned at 0.6°: the weak headline printed with its C plate
 * visibly off (misregistered forever — that IS the criticism) + the stamp;
 * the rewrite at chapter scale SLAMS into register on scroll (SNAP beat,
 * once per session, RegistrationSnap island; SSR/no-JS/reduced = registered
 * still). The argument sets in the sheet's own margin. Copy approved
 * verbatim. RSC + one null-rendering island.
 */

import { CutSection } from "../Cut";
import { RegistrationSnap } from "../theater/RegistrationSnap";

export function Band04Claim() {
  return (
    <CutSection
      band="claim"
      className="st-grain st-rays st-column-shallow-2 relative text-strata-ink"
    >
      <div className="st-bed py-20 lg:py-28">
        <div className="flex items-baseline justify-between">
          <p className="st-mono text-strata-ink-mute">
            ST.01 / THE CLAIM — HEADLINES · SECTIONS · CTAS
          </p>
          <p className="st-mono-sm hidden text-strata-ink-mute sm:block">
            INCLUDED: EVERY TIER
          </p>
        </div>
        <div className="st-score mt-3" />

        {/* THE PROOF SHEET */}
        <div
          className="pr-sheet mt-10 rotate-[0.6deg] px-7 py-9 lg:px-16 lg:py-14"
          data-cut-step="1"
        >
          <span className="pr-sheet-pin" aria-hidden />
          <div
            aria-hidden
            className="pr-regmark absolute right-8 top-8 hidden scale-90 lg:block"
          />
          <div
            aria-hidden
            className="pr-regmark absolute bottom-8 left-8 hidden scale-90 lg:block"
            data-c
          />

          <div className="flex items-baseline justify-between border-b border-strata-hairline pb-3">
            <p className="st-mono-sm text-strata-ink-mute">
              SPECIMEN — HEADLINE, AS RECEIVED
            </p>
            <p className="st-mono-sm hidden text-strata-ink-mute sm:block">
              PULLED FOR REVIEW
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-20">
            <div>
              {/* the weak headline — misregistered forever */}
              <div className="relative mt-9">
                <p
                  className="pr-misreg max-w-[24ch] text-[clamp(1.5rem,2.5vw,2.9rem)] leading-[1.25] text-strata-ink-mute"
                  style={{ fontFamily: "var(--font-strata-body)" }}
                >
                  &ldquo;Welcome to Radiant Dental — We Care About Your
                  Smile&rdquo;
                  <span className="pr-misreg-c" aria-hidden>
                    &ldquo;Welcome to Radiant Dental — We Care About Your
                    Smile&rdquo;
                  </span>
                </p>
                <div className="mt-4">
                  <span className="pr-stamp">
                    OUT OF REGISTER — SAYS NOTHING.
                  </span>
                </div>
              </div>

              {/* the divide */}
              <div className="mt-12 flex items-center gap-5">
                <span aria-hidden className="h-px flex-1 bg-strata-hairline" />
                <p className="st-mono-sm shrink-0 text-strata-ink-mute">
                  THE SAME PAGE, REWRITTEN — NOW IN REGISTER
                </p>
                <span aria-hidden className="h-px flex-1 bg-strata-hairline" />
              </div>

              {/* the rewrite — slams into register (SNAP) */}
              <h2
                data-registration-snap
                data-registered
                className="st-chapter mt-9 max-w-[16ch]"
              >
                New patients seen this week. Book by{" "}
                <span className="pr-misreg pr-underbar">
                  Thursday.
                  <span className="pr-misreg-c" aria-hidden>
                    Thursday.
                  </span>
                </span>
              </h2>
              <p className="st-mono-sm mt-5 text-strata-ink-mute">
                A DATE. A PROMISE. A REASON. — THAT&rsquo;S THE LAYER.
              </p>
            </div>

            {/* the argument, set in the sheet's margin */}
            <div
              className="self-center border-l border-strata-hairline pl-8 lg:pl-11"
              data-cut-step="2"
            >
              <p className="st-body text-strata-ink-body">
                Your visitors don&rsquo;t read. They scan for one reason to
                stay. We rewrite every headline, section, and call-to-action
                until each line earns its place — in your customer&rsquo;s
                words, not yours.
              </p>
              <p className="st-body mt-5 text-strata-ink-body">
                The words are the first layer of the build. Not an
                afterthought bolted onto a pretty design.
              </p>
            </div>
          </div>
        </div>
      </div>
      <RegistrationSnap />
    </CutSection>
  );
}
