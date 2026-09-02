"use client";

/**
 * SP10 — THE PROOF PULL (Tier-B only). THE PRESSRUN's flagship moment.
 *
 * The hero is a 220vh CSS-sticky runway (never GSAP pin — Cleave's law).
 * A steel ROLLER descends and sweeps across the viewport; behind its edge
 * the real demo page PRINTS onto the sheet, full bleed. Scrub score:
 *
 *   p 0.00–0.12  DWELL      the loupe idles on the plate (10fps reel)
 *   p 0.12–0.58  THE PULL   the roller travels 0%→104% and the printed
 *                           band grows behind it (inset wipe, % units);
 *                           hero copy lifts away
 *   p 0.58–0.85  THE SHEET  frames scrub-advance full bleed; the honesty
 *                           label sits in the sheet's margin
 *   p 0.85–1.00  HANDOFF    a panel painted with the next band's exact
 *                           surface wipes up; unstick reads seamless
 *
 * Geometry law: the wipe is inset() in % on all four sides (GSAP cannot
 * interpolate px→%), recomputed on refresh (invalidateOnRefresh). Frames
 * fetched only Tier-B ∧ visible ∧ post-load idle; ring buffer ≤24 live
 * bitmaps; until decoded the scrub runs on the still (graceful).
 */

import { useEffect, useRef } from "react";
import { useStrataTier } from "../tier";
import manifest from "./reel-manifest.json";

const RING = 24; // max live ImageBitmaps around the playhead

export function BorePortal() {
  const tier = useStrataTier();
  const layerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tier !== "B") return;
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const roller = rollerRef.current;
    if (!layer || !canvas) return;

    let killed = false;
    let teardown: (() => void) | undefined;

    const boot = async () => {
      const section = document.querySelector<HTMLElement>(
        '[data-strata-band="surface"]'
      );
      const porthole = document.querySelector<HTMLElement>("[data-porthole]");
      const copy = document.querySelector<HTMLElement>("[data-hero-copy]");
      const blend = document.querySelector<HTMLElement>("[data-bore-blend]");
      if (!section || !porthole) return;

      const { getGsapKit } = await import("../theater/gsapKit");
      const { gsap, ScrollTrigger } = await getGsapKit();
      if (killed) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = manifest.w;
      canvas.height = manifest.h;

      // ---- frame store: still first, frames stream in post-load idle ----
      const bitmaps = new Map<number, ImageBitmap>();
      let still: ImageBitmap | null = null;
      let current = -1;

      const draw = (i: number) => {
        const bmp = bitmaps.get(i) ?? still;
        if (!bmp || current === i && bitmaps.has(i)) {
          if (!bmp) return;
        }
        current = i;
        ctx.drawImage(bmp, 0, 0, manifest.w, manifest.h);
      };

      const fetchFrame = async (i: number) => {
        if (bitmaps.has(i) || killed) return;
        try {
          const res = await fetch(
            `${manifest.dir}/frame-${String(i).padStart(3, "0")}.webp`
          );
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          if (killed) {
            bmp.close();
            return;
          }
          bitmaps.set(i, bmp);
          // ring-buffer eviction
          if (bitmaps.size > RING) {
            let worst = -1;
            let worstDist = -1;
            bitmaps.forEach((_, k) => {
              const d = Math.abs(k - current);
              if (d > worstDist) {
                worstDist = d;
                worst = k;
              }
            });
            if (worst >= 0 && worst !== i) {
              bitmaps.get(worst)?.close();
              bitmaps.delete(worst);
            }
          }
        } catch {
          /* frame stays still — graceful */
        }
      };

      // still immediately (it's tiny and likely cached from the SSR img)
      fetch(manifest.still)
        .then((r) => r.blob())
        .then((b) => createImageBitmap(b))
        .then((bmp) => {
          if (killed) return bmp.close();
          still = bmp;
          draw(0);
        })
        .catch(() => {});

      // frames: post-load, idle, chunks of 6
      const streamFrames = () => {
        let i = 0;
        const pump = async () => {
          if (killed || i >= manifest.frames) return;
          await Promise.all(
            Array.from({ length: 6 }, (_, k) => fetchFrame(i + k)).slice(
              0,
              Math.max(0, manifest.frames - i)
            )
          );
          i += 6;
          (window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 120)))(
            pump
          );
        };
        pump();
      };
      if (document.readyState === "complete") {
        (window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2500)))(
          streamFrames,
          { timeout: 2500 } as IdleRequestOptions
        );
      } else {
        window.addEventListener("load", () => streamFrames(), { once: true });
      }

      // ---- idle loop: the specimen breathes inside the porthole ----------
      let idleTimer: number | undefined;
      let idleFrame = 0;
      let scrubP = 0;
      const idleTick = () => {
        if (killed) return;
        if (scrubP < 0.12 && bitmaps.size > 4) {
          idleFrame = (idleFrame + 1) % Math.min(bitmaps.size, manifest.frames);
          draw(idleFrame);
        }
        idleTimer = window.setTimeout(idleTick, 100);
      };
      idleTick();

      // ---- geometry from the SSR porthole (recomputed on refresh) --------
      const geo = () => {
        const r = porthole.getBoundingClientRect();
        const sRect = section.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const vmax = Math.max(vw, vh) / 100;
        const cx = ((r.left + r.width / 2) / vw) * 100;
        // porthole center relative to viewport at pin (stage is sticky top-0)
        const cy = ((r.top - sRect.top + r.height / 2) / vh) * 100;
        return {
          r0: r.width / 2 / vmax,
          cx,
          cy: Math.min(90, Math.max(10, cy)),
          scale0: (r.width - 20) / manifest.w,
          x0: r.left + r.width / 2 - vw / 2,
          y0: r.top - sRect.top + r.height / 2 - vh / 2,
        };
      };

      gsap.set(layer, { clipPath: "inset(0% 100% 0% 0%)" });

      // the printed sheet sits ON the bed: contained, with paper margins
      const coverScale = () =>
        Math.min(
          (window.innerWidth * 0.84) / manifest.w,
          (window.innerHeight * 0.86) / manifest.h
        );

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            scrubP = self.progress;
            if (self.progress > 0.12) {
              const f = Math.round(
                Math.min(1, Math.max(0, (self.progress - 0.06) / 0.79)) *
                  (manifest.frames - 1)
              );
              draw(f);
              // prefetch ahead of the playhead
              fetchFrame(Math.min(manifest.frames - 1, f + 2));
              fetchFrame(Math.min(manifest.frames - 1, f + 4));
            }
          },
          onToggle: (self) => {
            layer.style.willChange = self.isActive ? "clip-path" : "";
            canvas.style.willChange = self.isActive ? "transform" : "";
          },
        },
      });

      // THE PULL — the printed band grows behind the roller's edge
      tl.fromTo(
        layer,
        { clipPath: "inset(0% 100% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.46 },
        0.12
      );
      if (roller) {
        gsap.set(roller, { left: "0%", opacity: 0 });
        tl.to(roller, { opacity: 1, duration: 0.04 }, 0.12);
        tl.fromTo(
          roller,
          { left: "0%" },
          { left: "100%", duration: 0.46 },
          0.12
        );
        tl.to(roller, { opacity: 0, duration: 0.05 }, 0.58);
      }
      tl.fromTo(
        canvas,
        { scale: () => coverScale() * 1.03 },
        { scale: () => coverScale(), duration: 0.46 },
        0.12
      );
      if (copy) {
        tl.fromTo(copy, { opacity: 1, y: 0 }, { opacity: 0, y: "-6%", duration: 0.25 }, 0.2);
      }
      // HANDOFF
      if (blend) {
        tl.fromTo(blend, { yPercent: 101 }, { yPercent: 0, duration: 0.15 }, 0.85);
        tl.to(layer, { opacity: 0.35, duration: 0.15 }, 0.85);
      }

      teardown = () => {
        window.clearTimeout(idleTimer);
        tl.scrollTrigger?.kill();
        tl.kill();
        bitmaps.forEach((b) => b.close());
        bitmaps.clear();
        still?.close();
      };
    };

    boot();
    return () => {
      killed = true;
      teardown?.();
    };
  }, [tier]);

  if (tier !== "B") return null;

  return (
    <>
    <div
      ref={layerRef}
      data-bore-layer
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-center overflow-hidden lg:flex"
      style={{ clipPath: "inset(0% 100% 0% 0%)", background: "#F6F3EC" }}
    >
      <canvas
        ref={canvasRef}
        className="origin-center"
        style={{
          width: manifest.w,
          height: manifest.h,
          boxShadow:
            "0 30px 70px rgba(11,27,58,.22), 0 8px 18px rgba(11,27,58,.12)",
          outline: "1px solid rgba(11,27,58,.14)",
        }}
      />
      <p className="st-mono-sm absolute bottom-5 left-6 text-strata-ink-mute">
        PULLED: {manifest.demo.replace(/-/g, " ").toUpperCase()} — LIVE PAGE
        · FICTIONAL SHOWCASE
      </p>
    </div>
    {/* THE ROLLER — travels ahead of the printed band */}
    <div
      ref={rollerRef}
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z-30 hidden w-[110px] lg:block"
      style={{
        transform: "translateX(-55%)",
        background: "linear-gradient(90deg,#2a3038,#14181d 45%,#0c0f13)",
        boxShadow: "-18px 0 60px rgba(0,0,0,.45), 18px 0 60px rgba(0,0,0,.5)",
        borderLeft: "3px solid #3a424c",
        borderRight: "3px solid #05070a",
        opacity: 0,
      }}
    >
      <span
        className="absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 3px, transparent 3px 12px)",
        }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "#3a424c", boxShadow: "inset 0 3px 8px rgba(0,0,0,.7)" }}
      />
    </div>
    </>
  );
}
