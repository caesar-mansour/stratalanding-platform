/**
 * ST.06 — THE MECHANICS. The machine layer: an engraved schematic of a
 * lead's path — page → form → your inbox / your CRM — with the real event
 * names pulsing along the channel (phosphor = live law; pulses pause until
 * the band cuts in). RSC.
 */

import { CutSection } from "../Cut";

export function Band10Mechanics() {
  return (
    <CutSection
      band="mechanics"
      className="st-grain st-grain-deep st-column-deep relative text-strata-bone-body"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="flex items-baseline justify-between">
          <p data-scramble className="st-mono text-strata-bone-mute">
            ST.06 / THE MECHANICS — THE MACHINE UNDER THE PAGE
          </p>
          <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
            INCLUDED: LEAD · PURCHASE
          </p>
        </div>
        <div className="st-score mt-3 !bg-strata-hairline-deep" />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
          <div className="st-open self-center">
            <h2 className="st-chapter text-strata-bone">
              A page that captures, routes, and reports.
            </h2>
            <p className="st-body mt-6 text-strata-bone-body">
              Not a brochure. Your form wired to your email tool or CRM.
              Every click and submit tracked under real event names. When a
              lead lands, it lands somewhere — and you can see it happen.
            </p>
          </div>

          {/* the schematic */}
          <figure className="st-open st-plate-deep p-6 lg:p-8" data-cut-step="2">
            <figcaption className="st-mono-sm text-strata-bone-mute">
              SCHEMATIC — THE LEAD CHANNEL
            </figcaption>
            <svg viewBox="0 0 720 260" className="mt-6 w-full" aria-hidden>
              {/* plates */}
              <g stroke="rgba(234,242,247,.5)" fill="none">
                <rect x="24" y="86" width="150" height="88" />
                <rect x="272" y="86" width="150" height="88" />
                <rect x="540" y="30" width="156" height="72" />
                <rect x="540" y="158" width="156" height="72" />
              </g>
              {/* channels */}
              <g stroke="rgba(234,242,247,.35)" fill="none">
                <path d="M174,130 H272" />
                <path d="M422,130 H480 M480,130 V66 H540 M480,130 V194 H540" />
              </g>
              {/* plate labels */}
              <g fill="rgba(234,242,247,.7)" fontFamily="var(--font-strata-mono), Consolas, monospace" fontSize="13" letterSpacing="2">
                <text x="48" y="135">THE PAGE</text>
                <text x="296" y="135">THE FORM</text>
                <text x="556" y="72">YOUR INBOX</text>
                <text x="556" y="200">YOUR CRM</text>
              </g>
              {/* event names along the channel */}
              <g fill="rgba(234,242,247,.42)" fontFamily="var(--font-strata-mono), Consolas, monospace" fontSize="10" letterSpacing="1.5">
                <text x="176" y="116">CTA_CLICK</text>
                <text x="296" y="228">FORM_START → FORM_SUBMIT</text>
                <text x="474" y="248">THANK_YOU_VIEW</text>
              </g>
              {/* phosphor terminals */}
              <circle cx="696" cy="66" r="5" fill="#22D3EE" className="st-live-dot" />
              <circle cx="696" cy="194" r="5" fill="#22D3EE" className="st-live-dot" />
            </svg>
            <p className="st-mono-sm mt-5 text-strata-bone-mute">
              ZAPIER · MAKE · N8N · OR STRAIGHT TO YOUR EMAIL TOOL — WIRED
              FOR YOU
            </p>
          </figure>
        </div>
      </div>
    </CutSection>
  );
}
