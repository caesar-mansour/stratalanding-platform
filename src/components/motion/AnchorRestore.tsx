"use client";

/**
 * Deep-link repair. Below-the-fold chunks and the bore runway change the
 * page's geometry AFTER the browser's native anchor jump, so a cold visit
 * to /#pricing lands mid-hero. Re-aim the anchor once layout settles, and
 * once more on full load. Instant scroll (no smoothing) — this is a
 * correction, not a moment; routes through Lenis when it owns the scroll.
 */

import { useEffect } from "react";

export default function AnchorRestore() {
  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (!hash) return;

    const aim = () => {
      const el = document.getElementById(hash);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 88;
      const lenis = (
        window as unknown as {
          __lenis?: { scrollTo: (t: number, o: { immediate: boolean }) => void };
        }
      ).__lenis;
      if (lenis?.scrollTo) lenis.scrollTo(top, { immediate: true });
      else window.scrollTo(0, top);
    };

    const t1 = window.setTimeout(aim, 350);
    const t2 = window.setTimeout(aim, 950);
    window.addEventListener("load", aim);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("load", aim);
    };
  }, []);

  return null;
}
