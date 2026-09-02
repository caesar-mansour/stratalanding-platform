"use client";

/**
 * THE SHEARED DECK — mobile's cleave. The 8 slabs as an offset fan that
 * opens with one-shot IO class flips (THE OPEN verb — the single mobile
 * motion grammar). No scroll-linking, no 3D, no scrub. Transform/opacity
 * only; reduced motion renders the finished fan.
 */

import { useEffect, useRef } from "react";
import manifest from "./manifest.json";

const SLABS = manifest.slabs as { code: string; name: string; file: string }[];

export function ShearedDeck() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-cut");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          el.classList.add("is-cut");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -25% 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      data-strata-band="cleave"
      className="st-grain st-rays st-column-shallow relative overflow-hidden px-6 py-20 text-strata-ink"
    >
      <p className="st-mono text-strata-ink-mute">FIG. 02 — THE CUT, OPENED</p>
      <h2 className="st-chapter mt-5">
        This is everything you&rsquo;re actually buying.
      </h2>
      <p className="st-body mt-5 text-strata-ink-body">
        Most agencies sell you the top layer. The seven underneath are why a
        page sells — or quietly doesn&rsquo;t.
      </p>

      <div className="mt-10 space-y-6">
        {SLABS.map((s, i) => (
          <figure
            key={s.code}
            className="st-open"
            data-cut-step={Math.min(3, Math.floor(i / 3) + 1)}
          >
            <div className="flex items-baseline gap-3 border-b border-strata-hairline pb-2">
              <span className="st-mono-sm text-strata-seam">{s.code}</span>
              <span className="st-mono-sm text-strata-ink-mute">{s.name}</span>
            </div>
            {/* crop window: the slab occupies the middle band of its baked
                frame — show that band only, no dead transparency */}
            <div className="mt-2 aspect-[2.2/1] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.file}
                alt=""
                width={manifest.frame.w}
                height={manifest.frame.h}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                style={{ objectPosition: "57% 52%" }}
              />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
