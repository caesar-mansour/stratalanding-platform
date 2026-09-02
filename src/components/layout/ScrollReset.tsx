"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fixes the demo-page-opens-scrolled-down problem.
 *
 * Two separate issues:
 *
 * 1. Browser scroll restoration: the browser remembers your Y position from a
 *    previous visit and restores it when you navigate to the same URL. We take
 *    manual control so the browser never does this automatically.
 *
 * 2. Smooth-scroll animation on Next.js's internal scrollTo(0,0): globals.css
 *    sets `scroll-behavior: smooth` on <html>. Next.js resets scroll to 0 on
 *    page navigation, but because smooth-scroll is on, it ANIMATES from the
 *    old Y position (e.g. 3000px down the demos list) up to 0 — that sweep is
 *    what the user sees as "scrolling from the bottom to the top."
 *
 * Fix:
 *  - On mount: tell the browser WE handle scroll restoration (no auto-restore).
 *  - On every pathname change (useLayoutEffect — fires before paint):
 *      • Kill smooth scroll
 *      • Jump to 0 immediately
 *      • Re-enable smooth scroll one frame later so anchor links still animate
 */
export function ScrollReset() {
  const pathname = usePathname();

  // Take scroll restoration out of the browser's hands — once, on mount
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  // useLayoutEffect fires synchronously after DOM mutations, BEFORE the browser
  // paints — so the user never sees the page at the wrong scroll position
  useLayoutEffect(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);

    // Re-enable smooth scroll one frame later so in-page anchor links still work
    const id = requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = "";
    });

    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
