"use client";

/**
 * NLCLOCK — the footer clock.
 *
 * THE HOOK THIS DELIBERATELY DOES NOT EMIT: data-anim="clock".
 *
 * The engine's shell() writes that node every second as:
 *
 *     new Date().toLocaleTimeString('en-US', { timeZone: 'America/Chicago', ... })
 *
 * because Northline is a fictional studio in Wisconsin. The timezone is a hard
 * literal inside generated code (engine/NLEngine.ts is regenerated from
 * scripts/northline/port-engine.cjs and edits to it are destroyed), and
 * StrataLanding is not in Chicago. Emitting the hook would ship a real business
 * standing in a fake city's timezone — the same class of fabrication as the
 * invented clients and the invented founding year.
 *
 * So the hook is cut and the clock is honest: it reads the READER's own clock,
 * and says so. A visitor in Toronto sees Toronto time; the studio claims
 * nothing about where it is. If the engine is ever regenerated with the
 * timezone removed, this component becomes redundant, not wrong.
 *
 * SSR renders the em-dash placeholder and `suppressHydrationWarning` covers the
 * first client tick — a time string is by definition different on the server.
 */

import { useEffect, useState } from "react";

export function NLClock() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className="nl-mono-sm"
      style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--nl-faint)" }}
      suppressHydrationWarning
    >
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--nl-green)", display: "block" }}
      />
      <span className="nl-num" suppressHydrationWarning>
        {time ?? "--:--:--"}
      </span>
      <span>your local time</span>
    </span>
  );
}
