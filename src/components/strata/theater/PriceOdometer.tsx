"use client";

/**
 * DIRECTOR'S CUT — bedrock prices roll like odometers.
 *
 * PRICE LAW: the SSR price string STAYS in the DOM (SEO + the law that
 * prices exist as real text). On bedrock's first cut, each digit is
 * overlaid by a rolling digit column; the SSR text is visibility:hidden
 * ONLY during the roll, then restored. tabular-nums = identical metrics =
 * zero shift. Overlay aria-hidden. Tier-B only; reduced/mobile: SSR text,
 * untouched, always.
 */

import { useEffect } from "react";
import { useStrataTier } from "../tier";

const COLUMN = "0123456789";

export function PriceOdometer() {
  const tier = useStrataTier();

  useEffect(() => {
    if (tier !== "B") return;
    let killed = false;
    let io: IntersectionObserver | undefined;

    (async () => {
      const prices = Array.from(
        document.querySelectorAll<HTMLElement>("[data-price-odometer]")
      );
      if (!prices.length) return;
      // deep-link guard: near view at mount → never touch
      if (
        prices.some(
          (p) => p.getBoundingClientRect().top < window.innerHeight * 1.5
        )
      )
        return;

      const { getGsapKit } = await import("./gsapKit");
      const { gsap } = await getGsapKit();
      if (killed) return;

      const roll = (el: HTMLElement) => {
        if (el.dataset.rolled) return;
        el.dataset.rolled = "1";
        const text = el.textContent ?? "";
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);

        const overlay = document.createElement("span");
        overlay.setAttribute("aria-hidden", "true");
        overlay.style.cssText = `position:absolute;inset:0;display:flex;overflow:hidden;font:inherit;letter-spacing:inherit;`;

        const lineH = rect.height;
        for (const ch of text) {
          const cell = document.createElement("span");
          cell.style.cssText = `position:relative;display:inline-block;height:${lineH}px;overflow:hidden;`;
          if (/\d/.test(ch)) {
            const col = document.createElement("span");
            col.style.cssText = `display:block;will-change:transform;`;
            col.textContent = COLUMN.split("").join("\n");
            col.style.whiteSpace = "pre";
            col.style.lineHeight = `${lineH}px`;
            cell.appendChild(col);
            const target = parseInt(ch, 10);
            gsap.fromTo(
              col,
              { y: 0 },
              {
                y: -target * lineH,
                duration: 0.9,
                ease: "stEnter",
                delay: 0.1,
              }
            );
          } else {
            cell.textContent = ch;
            cell.style.lineHeight = `${lineH}px`;
          }
          overlay.appendChild(cell);
        }

        const host = el.parentElement;
        if (!host) return;
        const hostPos = getComputedStyle(host).position;
        if (hostPos === "static") host.style.position = "relative";
        // overlay sits exactly over the price line
        overlay.style.left = `${el.offsetLeft}px`;
        overlay.style.top = `${el.offsetTop}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${lineH}px`;
        overlay.style.fontSize = style.fontSize;
        overlay.style.fontFamily = style.fontFamily;
        overlay.style.fontWeight = style.fontWeight;
        overlay.style.color = style.color;
        host.appendChild(overlay);

        el.style.visibility = "hidden";
        window.setTimeout(() => {
          el.style.visibility = "";
          overlay.remove();
        }, 1300);
      };

      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            io?.unobserve(e.target);
            roll(e.target as HTMLElement);
          }
        },
        { rootMargin: "0px 0px -25% 0px", threshold: 0 }
      );
      prices.forEach((p) => io?.observe(p));
    })();

    return () => {
      killed = true;
      io?.disconnect();
    };
  }, [tier]);

  return null;
}
