"use client";

/**
 * DIRECTOR'S CUT — MonoDecode. Every band's mono eyebrow decodes into
 * place (ScrambleText, survey charset) the first time it enters view.
 * ONE island, ONE IntersectionObserver, mono only — never display type
 * (taste law).
 *
 * IN-VIEW SKIP LAW: any [data-scramble] already within 1.5 viewports at
 * mount is left untouched — deep-link/anchor arrivals must always see
 * finished text.
 */

import { useEffect } from "react";
import { useStrataTier } from "../tier";

export function MonoDecode() {
  const tier = useStrataTier();

  useEffect(() => {
    if (tier !== "B") return;
    let killed = false;
    let io: IntersectionObserver | undefined;

    (async () => {
      const { getGsapKit } = await import("./gsapKit");
      const { gsap } = await getGsapKit();
      if (killed) return;

      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-scramble]")
      ).filter(
        (el) =>
          el.getBoundingClientRect().top > window.innerHeight * 1.5 &&
          !el.dataset.decoded
      );
      if (!els.length) return;

      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target as HTMLElement;
            io?.unobserve(el);
            if (el.dataset.decoded) continue;
            el.dataset.decoded = "1";
            const text = el.textContent ?? "";
            gsap.to(el, {
              duration: 0.55,
              scrambleText: {
                text,
                chars: "▪01·—/",
                speed: 0.4,
              },
              ease: "none",
            });
          }
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0 }
      );
      els.forEach((el) => io?.observe(el));
    })();

    return () => {
      killed = true;
      io?.disconnect();
    };
  }, [tier]);

  return null;
}
