/**
 * BAND 07 — THE WATER TABLE + THE CRUST. The polarity flip: the descent
 * crosses from daylight paper into the deep. Carries the DIY objection
 * (why_not_diy): a template is a crust over void; a build is a core.
 * Emits [data-strata-water] — the sentinel that flips ONLY fixed chrome
 * (Navbar, Rail, Depth Line). Bands paint their own backgrounds; there is
 * no page-wide theme flip. RSC.
 */

import Image from "next/image";
import { CutSection } from "../Cut";
import specimen from "../Specimen/manifest.json";

export function Band07WaterTable() {
  return (
    <CutSection
      band="watertable"
      id="why-not-diy"
      analyticsId="why_not_diy"
      className="st-submersion relative text-strata-bone-body"
    >
      {/* nav-flip sentinel: the chrome goes deep the moment the waterline
          passes, not after the whole plunge has scrolled by */}
      <div data-strata-water aria-hidden className="h-px w-full" />
      {/* THE PLUNGE — a full screen of falling light */}
      <div className="relative flex min-h-[80vh] items-center border-b border-strata-hairline-deep">
        {/* depth ticks streaming past on the right */}
        <div
          aria-hidden
          className="absolute bottom-8 right-6 top-8 hidden flex-col justify-between text-right lg:right-10 lg:flex"
        >
          {["−5M", "−10M", "−20M", "−40M", "−80M"].map((d, i) => (
            <p
              key={d}
              className="st-mono-sm text-strata-bone-mute"
              style={{ opacity: 0.9 - i * 0.14 }}
            >
              {d} ———
            </p>
          ))}
        </div>
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <p data-scramble className="st-mono text-strata-bone-mute">
            THE DEEP FIELD — NAKED-EYE SEEING ENDS HERE
          </p>
          <p
            data-submersion-line
            className="mt-8 max-w-[16ch] text-[clamp(2.6rem,6.4vw,5.5rem)] leading-[1.04] text-strata-bone"
            style={{ fontFamily: "var(--font-strata-display)", fontWeight: 700 }}
          >
            Below this line, the layers you{" "}
            <span className="st-glow-text italic text-strata-live">
              can&rsquo;t see.
            </span>
          </p>
          <p className="st-mono mt-8 text-strata-bone-mute">
            EVERYTHING ABOVE: WHAT VISITORS NOTICE. EVERYTHING BELOW: WHAT
            MAKES THEM ACT.
          </p>
        </div>
      </div>

      {/* the crust vs the core */}
      <div className="st-grain-deep st-grain st-rays-deep relative mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="flex items-baseline justify-between">
          <p className="st-mono text-strata-bone-mute">
            THE CRUST — WHY NOT A TEMPLATE, OR AI?
          </p>
        </div>
        <div className="st-score mt-3 !bg-strata-hairline-deep" />

        <div className="mt-14 grid gap-16 lg:grid-cols-2 lg:gap-12">
          {/* the crust: one thin plate over void */}
          <figure className="st-open-wipe">
            <div className="relative flex h-56 items-start justify-center lg:h-72">
              <div className="relative mt-8 w-4/5" style={{ transform: "matrix(0.94,-0.2,0.24,0.9,0,0)" }}>
                <div className="h-14 border border-strata-hairline-deep bg-strata-bone/90" />
                <div className="h-[6px] bg-[#0d1118]" />
                <div
                  aria-hidden
                  className="mx-auto mt-10 h-8 w-3/4 rounded-[50%] bg-black/40 blur-xl"
                />
              </div>
            </div>
            <figcaption className="mt-6">
              <p className="st-mono text-strata-bone-mute">
                FIG. 03A — A TEMPLATE: ALL SURFACE
              </p>
              <p className="st-body mt-4 text-strata-bone-body">
                AI can pour you a page tonight. Templates sell the crust. It
                looks like land. It holds no weight.
              </p>
            </figcaption>
          </figure>

          {/* the core: all eight */}
          <figure className="st-open-iris" data-cut-step="2">
            <div className="relative flex h-56 items-center justify-center lg:h-72">
              <Image
                src={specimen.assembled.file}
                alt=""
                width={specimen.assembled.w}
                height={specimen.assembled.h}
                loading="lazy"
                quality={82}
                className="w-full max-w-[420px]"
              />
            </div>
            <figcaption className="mt-6">
              <p className="st-mono text-strata-bone-mute">
                FIG. 03B — A BUILD: ALL EIGHT LAYERS
              </p>
              <p className="st-body mt-4 text-strata-bone-body">
                The seven layers underneath are the two weeks of obsession
                you&rsquo;re actually paying for.
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </CutSection>
  );
}
