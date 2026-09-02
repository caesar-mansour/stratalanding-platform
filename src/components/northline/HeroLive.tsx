"use client";

/**
 * HERO LIVE — the right half of the hero.
 *
 * The source puts a streaming event panel here, headed "LIVE — FROM CLIENT
 * PAGES, RIGHT NOW", cycling nine invented events on a 2,150ms timer: a
 * deposit_paid from Stripe, a call_click to a (608) number, a lead_submitted
 * from "M. Halvorsen". Northline is a fictional studio, so that panel is
 * fiction, and it was cut from the port along with the rest of it.
 *
 * But cutting it left the hero half empty, which is its own problem — a
 * composition designed as two columns rendered as one column and a void. So
 * the slot is kept and filled with the honest version of the same idea: the
 * events are real, and they are YOURS. Scroll depth, dwell, the section you
 * are looking at. The panel demonstrates the product (StrataMetrics, which
 * ships on every build) by running it on the visitor, instead of describing
 * results we have not measured.
 *
 * NOTHING LEAVES THE PAGE. No fetch, no beacon, no cookie, no storage. The
 * whole session is one ref that dies with the tab. That claim is printed in the
 * panel, so it has to stay true — if you add a network call here, delete the
 * line first.
 *
 * Desktop only. On a phone the hero is a single column and this would be noise;
 * useStrataTier() returns "A" on SSR and first client render, so nothing here
 * costs a mobile visitor anything, including the rAF loop.
 */

import { useEffect, useRef, useState } from "react";
import { useStrataTier } from "@/components/strata/tier";

interface Row {
  t: string;
  event: string;
  detail: string;
}

/** hh:mm:ss in the visitor's own locale, tabular so rows can't jitter. */
function stamp(d: Date) {
  return d.toLocaleTimeString(undefined, { hour12: false });
}

export function HeroLive() {
  const tier = useStrataTier();
  const [rows, setRows] = useState<Row[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const t0 = useRef<number>(0);

  useEffect(() => {
    if (tier !== "B") return;
    t0.current = performance.now();

    const push = (event: string, detail: string) => {
      if (seen.current.has(event)) return;
      seen.current.add(event);
      setRows((r) => [{ t: stamp(new Date()), event, detail }, ...r].slice(0, 3));
    };

    // The first event is true the moment the component mounts.
    push("page_view", `${window.innerWidth}x${window.innerHeight} · ${document.referrer ? "referral" : "direct"}`);

    let raf = 0;
    let lastDepth = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const depth = Math.round((doc.scrollTop / max) * 100);
      if (depth >= 25 && lastDepth < 25) push("scroll_25", "a quarter of the way down");
      if (depth >= 50 && lastDepth < 50) push("scroll_50", "half the page read");
      if (depth >= 75 && lastDepth < 75) push("scroll_75", "three quarters");
      lastDepth = Math.max(lastDepth, depth);

      const secs = (performance.now() - t0.current) / 1000;
      if (secs > 15) push("dwell_15s", "still here — that is a real signal");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tier]);

  if (tier !== "B") return null;

  return (
    <div data-hfade style={{ animationDelay: "0.72s" }} className="hidden lg:block">
      <div className="flex items-center justify-between gap-4 pb-2">
        <span className="nl-mono-xs" style={{ color: "var(--nl-meta)" }}>
          Live — from this page
        </span>
        <span className="nl-mono-xs flex items-center gap-2" style={{ color: "var(--nl-green)" }}>
          <span
            aria-hidden
            className="block h-[6px] w-[6px] rounded-full"
            style={{ background: "var(--nl-green)" }}
          />
          recording
        </span>
      </div>

      <div style={{ borderTop: "1px solid var(--nl-r16)" }}>
        {/* Three slots, always rendered, so the panel never collapses and
            re-flows the hero as events arrive. */}
        {[0, 1, 2].map((i) => {
          const r = rows[i];
          return (
            <div
              key={i}
              className="grid items-baseline gap-3 py-[9px]"
              style={{
                gridTemplateColumns: "62px auto minmax(0,1fr)",
                borderBottom: "1px solid var(--nl-r09)",
                opacity: r ? 1 - i * 0.34 : 0.16,
                transition: "opacity .5s var(--nl-ease)",
              }}
            >
              <span data-tnum className="nl-num text-[9px]" style={{ color: "var(--nl-faint)" }}>
                {r ? r.t : "--:--:--"}
              </span>
              <span className="nl-mono-xs" style={{ color: "var(--nl-ink)" }}>
                {r ? r.event : "waiting"}
              </span>
              <span className="nl-mono-xs truncate" style={{ color: "var(--nl-meta)" }}>
                {r ? r.detail : ""}
              </span>
            </div>
          );
        })}
      </div>

      <p className="nl-mono-xs pt-3" style={{ color: "var(--nl-faint)" }}>
        Your own session, measured by the spine we install on every build.
        Nothing here leaves the page.
      </p>
    </div>
  );
}
