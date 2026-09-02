"use client";

/**
 * DIRECTOR'S CUT — THE SONAR. A 28px cyan ring trails the pointer
 * (gsap.quickTo — buttery, parks when idle); over interactive elements it
 * grows to 44px; click emits an expanding ping. The NATIVE cursor stays
 * (no cursor:none — taste law). pointer:fine + Tier-B only; zero bytes to
 * touch devices.
 */

import { useEffect, useRef } from "react";
import { useStrataTier } from "../tier";

export function SonarCursor() {
  const tier = useStrataTier();
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tier !== "B") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const ring = ringRef.current;
    if (!ring) return;

    let killed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { getGsapKit } = await import("./gsapKit");
      const { gsap } = await getGsapKit();
      if (killed) return;

      gsap.set(ring, { xPercent: -50, yPercent: -50, x: -100, y: -100 });
      const toX = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
      const toY = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
      const toScale = gsap.quickTo(ring, "scale", {
        duration: 0.25,
        ease: "power2",
      });

      const onMove = (e: PointerEvent) => {
        toX(e.clientX);
        toY(e.clientY);
      };
      const isInteractive = (t: EventTarget | null) =>
        t instanceof Element &&
        !!t.closest('a, button, [role="button"], input, textarea, select, summary');
      const onOver = (e: MouseEvent) => toScale(isInteractive(e.target) ? 1.57 : 1);
      const onDown = (e: PointerEvent) => {
        const ping = document.createElement("div");
        ping.className = "st-sonar-ping";
        ping.style.left = `${e.clientX}px`;
        ping.style.top = `${e.clientY}px`;
        document.body.appendChild(ping);
        gsap.fromTo(
          ping,
          { scale: 1, opacity: 0.8 },
          {
            scale: 2.6,
            opacity: 0,
            duration: 0.5,
            ease: "stExit",
            onComplete: () => ping.remove(),
          }
        );
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("mouseover", onOver, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("mouseover", onOver);
        window.removeEventListener("pointerdown", onDown);
      };
    })();

    return () => {
      killed = true;
      cleanup?.();
    };
  }, [tier]);

  if (tier !== "B") return null;

  return (
    <div
      ref={ringRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[70] h-7 w-7 rounded-full border border-strata-live/70"
      style={{ boxShadow: "0 0 12px rgba(34,211,238,0.35)" }}
    />
  );
}
