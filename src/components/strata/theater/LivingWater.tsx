"use client";

/**
 * DIRECTOR'S CUT — LIVING WATER. The vendored WebGL fluid sim under the
 * whole descent: cursor strokes leave dye in the water, and the shader's
 * own uScroll/uScrollVel uniforms flare the caustics as you dive.
 *
 * Mount ladder (the sim is DEAD LAST, always):
 *   useStrataTierHigh() ∧ perf 'full' ∧ no session latch
 *   → after window load → requestIdleCallback ≥1200ms post-nav
 * Pause ladder: document.hidden ∨ window blur ∨ takeover open.
 * Degrade ladder: perf level leaves 'full' → unmount + session latch
 * (st-sim-off) so it never restarts this session. No-sim path = today's
 * opaque CSS atmosphere, byte-identical. While mounted, .strata-world
 * gets [data-sim-active] → column gradients go slightly alpha so the
 * water reads through the deep bands.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useStrataTierHigh } from "../tier";
import { usePerformanceLevel } from "@/lib/animation-perf";

const SplashCursor = dynamic(() => import("@/components/motion/SplashCursor"), {
  ssr: false,
});

export function LivingWater() {
  const high = useStrataTierHigh();
  const perf = usePerformanceLevel();
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [latched, setLatched] = useState(false);

  // mount: dead last
  useEffect(() => {
    if (!high) return;
    try {
      if (sessionStorage.getItem("st-sim-off")) {
        setLatched(true);
        return;
      }
    } catch {
      /* ignore */
    }
    let killed = false;
    const arm = () => {
      const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
      idle(() => {
        if (!killed) setMounted(true);
      });
    };
    const t = window.setTimeout(() => {
      if (document.readyState === "complete") arm();
      else window.addEventListener("load", arm, { once: true });
    }, 1200);
    return () => {
      killed = true;
      window.clearTimeout(t);
    };
  }, [high]);

  // degrade: leave 'full' → unmount + latch for the session
  useEffect(() => {
    if (!mounted) return;
    if (perf !== "full") {
      setMounted(false);
      setLatched(true);
      try {
        sessionStorage.setItem("st-sim-off", "1");
      } catch {
        /* ignore */
      }
    }
  }, [perf, mounted]);

  // pause: hidden / blur / takeover
  useEffect(() => {
    if (!mounted) return;
    const update = () =>
      setPaused(
        document.hidden ||
          !document.hasFocus() ||
          document.body.hasAttribute("data-takeover")
      );
    const onTakeover = () => update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("blur", update);
    window.addEventListener("focus", update);
    window.addEventListener("sl-takeover-open", onTakeover);
    window.addEventListener("sl-takeover-close", onTakeover);
    update();
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("blur", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("sl-takeover-open", onTakeover);
      window.removeEventListener("sl-takeover-close", onTakeover);
    };
  }, [mounted]);

  // flag the world: column gradients go alpha while the water lives
  useEffect(() => {
    const world = document.querySelector(".strata-world");
    if (!world) return;
    if (mounted) world.setAttribute("data-sim-active", "");
    else world.removeAttribute("data-sim-active");
    return () => world.removeAttribute("data-sim-active");
  }, [mounted]);

  if (!high || latched || !mounted) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <SplashCursor
        SIM_RESOLUTION={128}
        DYE_RESOLUTION={512}
        DENSITY_DISSIPATION={4.2}
        VELOCITY_DISSIPATION={1.8}
        PRESSURE={0.1}
        CURL={0.9}
        SPLAT_RADIUS={0.09}
        SPLAT_FORCE={4200}
        COLOR_UPDATE_SPEED={10}
        paused={paused}
      />
    </div>
  );
}
