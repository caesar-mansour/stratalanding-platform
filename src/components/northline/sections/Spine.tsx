import { pricing } from "@/lib/brand";
import { Plate } from "../Plate";
import { SectionView } from "../SectionView";
import { Stage } from "../Stage";

/**
 * THE TRACKING SPINE — a pinned dark scene.
 *
 * One of the few sections that needed almost no honesty surgery, because it
 * describes a real product: StrataMetrics is first-party, ships on every build,
 * and genuinely runs with zero third-party tag managers. The claims here are
 * about how the system works, not about results it produced.
 *
 * THE ENGINE CONTRACT (see spine() in engine/NLEngine.ts). This markup exists to
 * satisfy it exactly:
 *   data-anim="spineline"  the SVG path. On first collect() the engine reads
 *                          getTotalLength() and sets strokeDasharray/offset, then
 *                          draws it over p 0.08 -> 0.86.
 *   data-anim="node"       an event marker. `data-at` (0..1) is its position
 *                          ALONG THE PATH — the engine calls getPointAtLength()
 *                          and writes left/top as percentages of the 1240x300
 *                          viewBox, so the viewBox numbers below are load-bearing
 *                          and must not be changed casually.
 *   data-anim="packet"     a dot that rides the path continuously.
 *   data-anim="spinestat"  a counter; `data-to`, optional `data-prefix`/-suffix.
 *
 * The nodes are absolutely positioned by the engine, so they render at 0/0 until
 * it runs. On mobile the stage is unpinned and the engine never mounts, so the
 * SVG shows undrawn and the nodes would pile up in the corner — hence the
 * mobile-only static list below, and `nl-spine-nodes` hidden at the same
 * breakpoint. Content parity, no broken layout.
 */

const NODES = [
  { at: "0.06", t: "t+0s", label: "page_view" },
  { at: "0.30", t: "t+22s", label: "cta_click" },
  { at: "0.60", t: "t+56s", label: "lead_submitted" },
  { at: "0.92", t: "t+74s", label: "brief_submit" },
];

/* THE EVENT COUNT IS READ, NOT INVENTED. This cell said "7 — Tracked events per
   session", and seven is not any tier: brand.ts sells 1 on a Presence Page, 4 on
   a Lead Page, 6 on a Purchase Page. "Per session" was a third unit again — a
   session emits however many the visitor triggers, not a constant. It now reads
   the top tier's own figure and names the tier, so the number cannot drift from
   what is sold, and the other three cells beside it are structural facts that
   were always true. */
const TOP = pricing.reduce((a, b) =>
  Number(b.price.replace(/[^0-9.]/g, "")) > Number(a.price.replace(/[^0-9.]/g, "")) ? b : a
);

const STATS = [
  { to: String(TOP.deliverables.trackedEvents), label: `Funnel events on a ${TOP.name}` },
  { to: "0", label: "Third-party tag managers" },
  { to: "100", suffix: "%", label: "First-party, your domain" },
  { to: "0", label: "Data sold, shared or resold" },
];

export function Spine() {
  return (
    <Stage name="spine" height={460} tone="dark" label="Spine" id="spine" bg="#0a1730">
      {/* Reach reporting for a server component — see SectionView. */}
      <SectionView anchor="spine" report="spine" />
      <div className="relative h-full w-full" style={{ background: "var(--nl-ground-ink-band)" }}>
        <Plate id="spine" position="50% 50%" opacity={0.5} />

        <div
          className="relative mx-auto grid h-full w-[min(1240px,100%)] items-center gap-[clamp(28px,4vw,64px)] px-[var(--nl-gutter)] py-[clamp(40px,8vh,90px)] lg:grid-cols-[0.95fr_1.05fr]"
        >
          <div>
            <span className="nl-mono" style={{ color: "var(--nl-accent)" }}>
              The tracking spine
            </span>
            <h2
              className="nl-h2 mt-5"
              style={{ fontSize: "clamp(32px,4.2vw,58px)" }}
            >
              If you can&rsquo;t name the click that paid you, you&rsquo;re guessing.
            </h2>
            <p
              className="mt-6 max-w-[42ch] text-[17px] leading-[1.55]"
              style={{ color: "var(--nl-body)" }}
            >
              One event schema, one identity, one ledger — installed on every build and running on
              your own domain. No tag manager, no third-party pixel farm, nothing sold onward.
            </p>

            {/* Mobile parity: the engine never runs here, so the drawn path and
                its positioned nodes are replaced by the same four events as a
                plain list. */}
            <ol className="nl-spine-fallback mt-8 list-none p-0" style={{ borderTop: "1px solid var(--nl-r14)" }}>
              {NODES.map((nd) => (
                <li
                  key={nd.label}
                  className="flex items-baseline gap-4 py-3"
                  style={{ borderBottom: "1px solid var(--nl-r14)" }}
                >
                  <span data-tnum className="nl-num text-[11px]" style={{ color: "var(--nl-accent)" }}>
                    {nd.t}
                  </span>
                  <span className="nl-mono-sm" style={{ color: "var(--nl-body)" }}>
                    {nd.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative">
            {/* The path. viewBox is 1240x300 because the engine converts
                getPointAtLength() results into percentages of exactly those
                numbers when positioning nodes and packets. */}
            <div className="nl-spine-nodes relative w-full" style={{ aspectRatio: "1240 / 300" }}>
              <svg
                viewBox="0 0 1240 300"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden
              >
                <path
                  d="M40 250 C 240 250, 240 60, 420 60 S 620 250, 810 250 S 1010 70, 1200 70"
                  fill="none"
                  stroke="var(--nl-r14)"
                  strokeWidth={2}
                />
                <path
                  data-anim="spineline"
                  d="M40 250 C 240 250, 240 60, 420 60 S 620 250, 810 250 S 1010 70, 1200 70"
                  fill="none"
                  stroke="var(--nl-accent)"
                  strokeWidth={2.5}
                />
              </svg>

              {NODES.map((nd) => (
                <div
                  key={nd.label}
                  data-anim="node"
                  data-at={nd.at}
                  className="absolute flex flex-col items-center gap-2"
                  style={{ opacity: 0 }}
                >
                  <span
                    className="block h-[9px] w-[9px] rounded-full"
                    style={{ background: "var(--nl-accent)" }}
                  />
                  <span className="nl-mono-xs whitespace-nowrap" style={{ color: "var(--nl-paper)" }}>
                    {nd.label}
                  </span>
                  <span data-tnum className="nl-num text-[9px]" style={{ color: "var(--nl-meta)" }}>
                    {nd.t}
                  </span>
                </div>
              ))}

              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  data-anim="packet"
                  aria-hidden
                  className="absolute block h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: "var(--nl-accent)", opacity: 0 }}
                />
              ))}
            </div>

            <div className="nl-strip nl-strip-4 mt-[clamp(24px,4vh,48px)]">
              {STATS.map((s) => (
                <div key={s.label}>
                  <span
                    data-anim="spinestat"
                    data-to={s.to}
                    data-suffix={s.suffix || ""}
                    data-tnum
                    className="nl-num block text-[27px] font-bold leading-none tracking-[-0.04em]"
                  >
                    {s.to}
                    {s.suffix || ""}
                  </span>
                  <span className="nl-mono-xs mt-2 block" style={{ color: "var(--nl-meta)" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}
