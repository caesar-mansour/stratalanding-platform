"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect user's reduced motion preference
 * Returns true if the user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to get animation variants based on reduced motion preference
 * Simplifies animations when user prefers reduced motion
 */
export function useMotionPreference() {
  const prefersReducedMotion = useReducedMotion();

  return {
    prefersReducedMotion,
    // Utility to conditionally apply animation
    animate: prefersReducedMotion ? false : true,
    // Simplified transition for reduced motion
    transition: prefersReducedMotion
      ? { duration: 0.01 }
      : undefined,
  };
}
