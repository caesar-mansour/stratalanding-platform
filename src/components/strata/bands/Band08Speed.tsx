"use client";

/**
 * ST.04 — THE SPEED. The live instrument: this page measures itself in
 * front of the visitor. Real navigation/LCP/CLS of THIS visit — phosphor
 * numerals (THE LIVE law). Per-metric fallback: WebKit has no LCP/CLS
 * observers, so those gauges render as engraved TARGET plates while
 * transfer + TTFB stay genuinely measured everywhere. Honesty law: targets
 * are framed as targets, never as client results.
 *
 * Lazy chunk (dynamically imported), reads on IO-enter with buffered:true
 * (P0-proven: late registration still delivers), rAF count-up only while
 * visible. Instruments, never dashboards.
 */

import { useEffect, useRef, useState } from "react";
import { CutSection } from "../Cut";

type Gauge = {
  key: string;
  label: string;
  unit: string;
  target: string;
  value: number | null; // null = TARGET plate (unsupported)
  format: (v: number) => string;
};

function useTelemetry(): Gauge[] | null {
  const [gauges, setGauges] = useState<Gauge[] | null>(null);

  useEffect(() => {
    try {
      performance.setResourceTimingBufferSize?.(400);
    } catch {
      /* ignore */
    }
    const supported: readonly string[] =
      (typeof PerformanceObserver !== "undefined" &&
        PerformanceObserver.supportedEntryTypes) ||
      [];

    const result: Record<string, number | null> = {
      lcp: supported.includes("largest-contentful-paint") ? 0 : null,
      cls: supported.includes("layout-shift") ? 0 : null,
      kb: 0,
    };

    const nav = performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const resources = performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[];
      result.kb = Math.round(
        (nav.transferSize +
          resources.reduce((s, r) => s + (r.transferSize || 0), 0)) /
          1024
      );
    } else {
      result.kb = null;
    }

    const observers: PerformanceObserver[] = [];
    if (result.lcp !== null) {
      try {
        const po = new PerformanceObserver((l) => {
          const e = l.getEntries();
          if (e.length) result.lcp = Math.round(e[e.length - 1].startTime);
        });
        po.observe({ type: "largest-contentful-paint", buffered: true });
        observers.push(po);
      } catch {
        result.lcp = null;
      }
    }
    if (result.cls !== null) {
      try {
        const po = new PerformanceObserver((l) => {
          l.getEntries().forEach((e) => {
            const ls = e as PerformanceEntry & {
              hadRecentInput?: boolean;
              value?: number;
            };
            if (!ls.hadRecentInput && typeof ls.value === "number")
              result.cls = (result.cls ?? 0) + ls.value;
          });
        });
        po.observe({ type: "layout-shift", buffered: true });
        observers.push(po);
      } catch {
        result.cls = null;
      }
    }

    const t = setTimeout(() => {
      observers.forEach((o) => o.disconnect());
      setGauges([
        {
          key: "lcp",
          label: "GAUGE I — LARGEST CONTENTFUL PAINT",
          unit: "S",
          target: "TARGET < 2.5S",
          value: result.lcp,
          format: (v) => (v / 1000).toFixed(2),
        },
        {
          key: "cls",
          label: "GAUGE II — LAYOUT SHIFT",
          unit: "CLS",
          target: "TARGET < 0.1",
          value: result.cls,
          format: (v) => v.toFixed(3),
        },
        {
          key: "kb",
          label: "GAUGE III — TRANSFERRED",
          unit: "KB",
          target: "TARGET: LEAN",
          value: result.kb,
          format: (v) => String(Math.round(v)),
        },
      ]);
    }, 700);
    return () => {
      clearTimeout(t);
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  return gauges;
}

/** phosphor numeral that counts up once when it enters view */
function LiveNumeral({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(format(value));
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const D = 700;
        const ease = (t: number) => 1 - Math.pow(1 - t, 3);
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / D);
          setDisplay(format(value * ease(p)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, format]);

  return (
    <span ref={ref} className="st-glow-text tabular-nums text-strata-live">
      {display}
    </span>
  );
}

export function Band08Speed() {
  const gauges = useTelemetry();

  return (
    <CutSection
      band="speed"
      id="proof"
      analyticsId="proof"
      className="st-grain st-grain-deep st-rays-deep st-column-mid relative text-strata-bone-body"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="flex items-baseline justify-between">
          <p data-scramble className="st-mono text-strata-bone-mute">
            ST.04 / QUALITY CONTROL — MEASURED, NEVER SIMULATED
          </p>
          <p className="st-mono-sm hidden text-strata-bone-mute sm:block">
            INCLUDED: EVERY TIER
          </p>
        </div>
        <div className="st-score mt-3 !bg-strata-hairline-deep" />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-16">
          <div className="st-open self-center">
            <h2 className="st-chapter !text-[clamp(2rem,3vw,4.25rem)] text-strata-bone">
              This page is measuring itself. Right now.
            </h2>
            <p className="st-body mt-6 text-strata-bone-body">
              Not lab numbers. Not a case study. The page you&rsquo;re
              reading, measured live on your connection, this visit. Every
              page we ship is engineered to the same targets.
            </p>
            <p className="st-mono mt-6 text-strata-bone-mute">
              TARGETS WE BUILD TO: LCP &lt; 2.5S · CLS &lt; 0.1 · INP &lt;
              200MS
            </p>
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-3">
            {(gauges ?? []).map((g, i) => (
              <figure
                key={g.key}
                className="st-open st-plate-deep relative p-6"
                data-cut-step={i + 1}
              >
                {((g.key === "lcp" && g.value !== null && g.value < 2500) ||
                  (g.key === "cls" && g.value !== null && g.value < 0.1)) && (
                  <span
                    className="pr-stamp absolute right-4 top-1/2 -translate-y-1/2 !border-[#22D3EE] !bg-transparent !text-[9px] !text-[#22D3EE]"
                    style={{ boxShadow: "0 0 18px rgba(34,211,238,.3)" }}
                  >
                    PASS
                  </span>
                )}
                <figcaption className="st-mono-sm text-strata-bone-mute">
                  {g.label}
                </figcaption>
                {g.value !== null ? (
                  <>
                    <p
                      className="mt-6 whitespace-nowrap text-[clamp(2.1rem,2.9vw,3rem)] leading-none"
                      style={{ fontFamily: "var(--font-strata-display)", fontWeight: 700 }}
                    >
                      <LiveNumeral value={g.value} format={g.format} />
                      <span className="ml-1.5 align-baseline text-[0.32em] tracking-wide text-strata-bone-mute">
                        {g.unit}
                      </span>
                    </p>
                    <p className="st-mono-sm mt-5 flex items-center gap-2 text-strata-bone-mute">
                      <span className="st-live-dot st-glow-soft" />
                      MEASURED — THIS VISIT
                    </p>
                  </>
                ) : (
                  <>
                    <p
                      className="mt-6 text-[clamp(1.6rem,2.2vw,2.1rem)] leading-none text-strata-bone-mute"
                      style={{ fontFamily: "var(--font-strata-display)", fontWeight: 700 }}
                    >
                      {g.target}
                    </p>
                    <p className="st-mono-sm mt-5 text-strata-bone-mute">
                      YOUR BROWSER WITHHOLDS THIS GAUGE — THE TARGET STANDS
                    </p>
                  </>
                )}
              </figure>
            ))}
            <div className="sm:col-span-3 mt-2 grid gap-x-16 sm:grid-cols-2">
              {[
                ["FIXED PROPOSAL RETURNED", "WITHIN 24 HOURS"],
                ["LAYERS PER BUILD", "8 OF 8"],
                ["PRICE MOVEMENT AFTER QUOTE", "NONE — FIXED"],
                ["PAYMENT BEFORE YOUR APPROVAL", "NEVER"],
                ["CALLS REQUIRED, BRIEF TO LAUNCH", "0"],
                ["READINGS SHOWN TO CLIENTS", "ALWAYS — LIVE"],
              ].map(([l, r]) => (
                <div
                  key={l}
                  className="flex items-baseline justify-between border-b py-3"
                  style={{ borderColor: "rgba(246,243,236,.14)" }}
                >
                  <span className="st-mono-sm text-strata-bone-body">{l}</span>
                  <span className="st-mono-sm text-strata-live">{r}</span>
                </div>
              ))}
            </div>
            {!gauges &&
              [0, 1, 2].map((i) => (
                <figure
                  key={i}
                  className="border border-strata-hairline-deep bg-strata-deep2 p-6"
                  aria-hidden
                >
                  <div className="h-3 w-2/3 bg-strata-bone/10" />
                  <div className="mt-6 h-12 w-1/2 bg-strata-bone/10" />
                </figure>
              ))}
          </div>
        </div>
      </div>
    </CutSection>
  );
}
