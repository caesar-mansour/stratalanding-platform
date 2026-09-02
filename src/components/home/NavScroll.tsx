"use client";

import { useEffect } from "react";

/**
 * Sets `data-scrolled` on the nav past 24px so it gains its translucent
 * background, its blur and its hairline. The reference behaviour: no bottom
 * border on the default state, a subtle border in the scroll state.
 *
 * A passive listener writing one attribute — no layout read, no transform, and
 * the nav's height never changes, so this cannot cause reflow or CLS.
 */
export function NavScroll() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-nav]");
    if (!nav) return;
    let on = false;
    const onScroll = () => {
      const next = window.scrollY > 24;
      if (next !== on) { on = next; nav.dataset.scrolled = String(next); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
