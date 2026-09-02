import { pageMetadata } from "@/lib/seo/metadata";
import { strataFontVars } from "@/components/strata/fonts";
import "@/components/strata/tokens.css";

export const metadata = pageMetadata({
  title: "Start Your Project Brief — 10 Minutes, No Calls",
  description:
    "Tell us about your project in 10 minutes. No calls required. Get a detailed proposal with scope, timeline, and pricing within 24 hours. Fixed price, async delivery.",
  path: "/brief",
  keywords: [
    "landing page brief",
    "project brief",
    "start landing page project",
    "landing page proposal",
    "landing page request",
  ],
});

/**
 * THE BRIEF — the handoff masthead (PERFECTION PASS).
 * The descent surfaces INTO the paperwork: a deep survey band bridges the
 * night-ocean world to the light document below. The form itself is
 * untouched — this layout only adds the masthead above it, so the film
 * never breaks at the exact moment it converts.
 */
export default function BriefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`strata-world ${strataFontVars}`}>
      <section className="st-grain st-grain-deep st-column-deep relative text-strata-bone-body">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-28 lg:px-10 lg:pt-32">
          <div className="flex items-baseline justify-between border-b border-strata-hairline-deep pb-3">
            <p className="st-mono text-strata-bone-mute">
              STRATALANDING — THE OBSERVING LOG
            </p>
            <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
              ADMISSION: A TEN-MINUTE BRIEF · NO CALLS
            </p>
          </div>
          <p
            className="mt-8 max-w-[22ch] text-[clamp(1.9rem,3.6vw,3.25rem)] leading-[1.06] text-strata-bone"
            style={{ fontFamily: "var(--font-strata-display)", fontWeight: 700 }}
          >
            Ten minutes of your time. A fixed proposal in 24 hours.
          </p>
          <p className="st-mono mt-6 text-strata-bone-mute">
            NO CALLS · NO PAYMENT TO SUBMIT · YOU APPROVE BEFORE THE BALANCE
            MOVES
          </p>
        </div>
        {/* the waterline — the descent hands you the pen */}
        <div
          className="h-[3px] w-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(8,145,178,0) 0%, rgba(34,211,238,.65) 18%, rgba(8,145,178,.35) 52%, rgba(34,211,238,.6) 82%, rgba(8,145,178,0) 100%)",
            boxShadow: "0 6px 24px rgba(34, 211, 238, 0.25)",
          }}
        />
      </section>
      {children}
    </div>
  );
}
