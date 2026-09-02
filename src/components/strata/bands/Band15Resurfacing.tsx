/**
 * BAND 15 — THE RESURFACING. The specimen, reassembled and LIVE (phosphor
 * frame — the one moment the whole core glows alive). The last ask.
 * cta_band kept. RSC + client CTA leaf.
 */

import Image from "next/image";
import { CutSection } from "../Cut";
import { CtaRow } from "../CtaRow";
import { cta } from "@/lib/brand";
import specimen from "../Specimen/manifest.json";

export function Band15Resurfacing({ demoCount }: { demoCount: number }) {
  return (
    <CutSection
      band="resurfacing"
      analyticsId="cta_band"
      className="st-grain st-grain-deep st-column-floor relative text-strata-bone-body"
    >
      <div className="mx-auto max-w-6xl px-6 pb-28 pt-8 lg:px-10 lg:pb-36">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,26rem)]">
          <div className="st-open">
            <p data-scramble className="st-mono text-strata-bone-mute">
              THE RESURFACING — {demoCount} PAGES ON FILE
            </p>
            <h2 className="st-display mt-6 max-w-[12ch] text-strata-bone">
              Stop paying for surfaces.
            </h2>
            <p className="st-body mt-6 text-strata-bone-body">
              {/* explicit {" "}: the SWC minifier eats the plain space after
                  a JSX expression here (rendered "793pages" — caught by the
                  §N text audit). Copy unchanged — approved verbatim. */}
              {demoCount}
              {" "}pages on file. Yours isn&rsquo;t one of them yet.
              Start the brief — a fixed proposal lands within 24 hours.
            </p>
            <div className="mt-8">
              <CtaRow location="cta-band" />
            </div>
            <p className="st-mono mt-6 text-strata-bone-mute">
              {cta.reassurance.toUpperCase()}
            </p>
          </div>

          {/* the core, resurfaced and alive */}
          <figure className="st-open hidden lg:block" data-cut-step="2">
            <div className="st-glow border border-strata-live/40 p-1">
              <div className="flex items-center justify-center gap-2 border-b border-strata-live/30 py-1.5">
                <span className="st-live-dot st-glow-soft" />
                <span className="st-mono-sm text-strata-live">
                  SPECIMEN — LIVE
                </span>
              </div>
              <Image
                src={specimen.assembled.file}
                alt="The assembled core sample, live."
                width={specimen.assembled.w}
                height={specimen.assembled.h}
                loading="lazy"
                quality={82}
                className="w-full"
              />
            </div>
            <figcaption className="st-mono-sm mt-3 text-strata-bone-mute">
              FIG. 04 — THE PART WHERE IT BECOMES A PAGE.
            </figcaption>
          </figure>
        </div>
      </div>
    </CutSection>
  );
}
