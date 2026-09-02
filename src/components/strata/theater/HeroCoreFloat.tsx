"use client";

/**
 * DIRECTOR'S CUT — the core floats. A thin client boundary so the RSC hero
 * can hand its specimen figure to Buoyant (gentle bob + drift — the object
 * reads suspended in water). Buoyant self-gates on reduced motion/touch.
 * Amplitude stays small: the BorePortal reads the porthole rect at refresh
 * and a ±5px bob must never meaningfully move the aperture.
 */

import { Buoyant } from "@/components/motion/liquid";

export function HeroCoreFloat({ children }: { children: React.ReactNode }) {
  return (
    <Buoyant amplitude={5} duration={8} drift>
      {children}
    </Buoyant>
  );
}
