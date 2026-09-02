"use client";

/**
 * SP3 — THE SPECIMEN BOOK (band 02, the concept engine). THE PRESSRUN.
 *
 * A full-width open book on the bed. LEFT PAGE: what agencies sell you —
 * the finished proof alone (the live reel still on a pinned sheet). RIGHT
 * PAGE: what you're actually buying — the eight plates CLEAVING apart on
 * scroll (the proven 260vh CSS-sticky runway, GSAP scrub:true, Lenis is
 * the smoothing, heights in CSS = zero CLS, will-change toggled onToggle).
 * The copy's argument, made spatial. Approved copy verbatim.
 *
 * Tier A / reduced motion / mobile: ShearedDeck / finished still (law).
 */

import { useEffect, useRef } from "react";
import { useStrataTier } from "../tier";
import { useIsMobile } from "@/lib/MobileContext";
import manifest from "./manifest.json";
import reel from "../Bore/reel-manifest.json";
import { ShearedDeck } from "./ShearedDeck";

const SLABS = manifest.slabs as { code: string; name: string; file: string }[];

export function Cleave() {
  const tier = useStrataTier();
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tier !== "B") return;
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    let killed = false;
    let teardown: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);

      const slabs = Array.from(
        stage.querySelectorAll<HTMLElement>("[data-slab]")
      );
      const labels = Array.from(
        stage.querySelectorAll<HTMLElement>("[data-slab-label]")
      );
      const scale = stage.clientWidth / manifest.frame.w;
      const closed = manifest.assembledGapPx * scale;
      const open = manifest.cleavedGapPx * scale;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onToggle: (self) => {
            slabs.forEach(
              (el) => (el.style.willChange = self.isActive ? "transform" : "")
            );
          },
        },
      });
      slabs.forEach((el, i) => {
        tl.fromTo(
          el,
          { y: i * closed },
          { y: i * open, duration: 1 },
          0
        );
      });
      labels.forEach((el, i) => {
        tl.fromTo(
          el,
          { opacity: 0, x: -8 },
          { opacity: 1, x: 0, duration: 0.14 },
          0.3 + i * 0.07
        );
      });

      teardown = () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    })();

    return () => {
      killed = true;
      teardown?.();
    };
  }, [tier]);

  // Mobile: the sheared deck owns the concept moment.
  if (isMobile) return <ShearedDeck />;

  const staticOpen = tier !== "B";

  return (
    <section
      ref={sectionRef}
      data-strata-band="cleave"
      className="st-grain st-rays st-column-shallow relative text-strata-ink lg:h-[260vh]"
    >
      <div className="lg:sticky lg:top-0 lg:h-[100svh] overflow-hidden">
        {/* the band's shop line */}
        <div className="st-bed pt-24">
          <div className="flex items-baseline justify-between border-b border-strata-hairline pb-3">
            <p className="st-mono text-strata-ink-mute">
              THE SPECIMEN BOOK — EVERYTHING YOU&rsquo;RE ACTUALLY BUYING
            </p>
            <p className="st-mono-sm hidden text-strata-ink-mute sm:block">
              FIG. 02 — THE CUT, OPENED
            </p>
          </div>
        </div>

        {/* THE SPREAD */}
        <div className="st-bed flex h-[calc(100svh-8.5rem)] items-center">
          <div className="pr-sheet relative grid w-full grid-cols-1 gap-10 px-8 py-10 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-0 lg:px-14 lg:py-12">
            <span className="pr-sheet-pin" aria-hidden />
            {/* the spine */}
            <span
              aria-hidden
              className="absolute bottom-8 top-8 hidden lg:left-[32rem] lg:block"
              style={{ borderLeft: "2px dashed rgba(11,27,58,0.18)" }}
            />

            {/* LEFT PAGE — the surface they sell you */}
            <div className="self-center lg:pr-14">
              <h2 className="st-chapter">
                This is everything you&rsquo;re actually buying.
              </h2>
              <p className="st-body mt-6 text-strata-ink-body">
                Most agencies sell you the top layer. The seven underneath are
                why a page sells — or quietly doesn&rsquo;t.
              </p>

              {/* the finished proof, alone — the top layer */}
              <div className="mt-9 max-w-[22rem]">
                <div
                  className="border border-strata-hairline bg-white p-2"
                  style={{ boxShadow: "0 18px 36px rgba(11,27,58,0.14)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={reel.still}
                    alt="The finished page — the only layer most agencies sell."
                    width={reel.w}
                    height={reel.h}
                    loading="lazy"
                    decoding="async"
                    className="w-full"
                  />
                </div>
                <p className="st-mono-sm mt-3 text-strata-ink-mute">
                  THE TOP LAYER, ALONE · FICTIONAL SHOWCASE
                </p>
              </div>
            </div>

            {/* RIGHT PAGE — the eight plates, cleaving */}
            <div className="flex items-center justify-center lg:pl-14">
              <div
                ref={stageRef}
                className="relative w-full lg:max-w-[560px] min-[1700px]:max-w-[720px]"
                style={{
                  aspectRatio: `${manifest.frame.w} / ${manifest.frame.h + 7 * manifest.cleavedGapPx}`,
                  // AUDIT 2026-08-12 (P2 PF-10): the slab offsets below are expressed in `cqw`,
                  // which is a CONTAINER query unit — it needs an ancestor that declares a
                  // containment context. There was none anywhere in the repo, so per spec `cqw`
                  // fell back to the small-viewport size and the slabs were positioned against the
                  // VIEWPORT width instead of this frame's width, misplacing them by the ratio
                  // between the two. Declaring the containment context here is what makes the unit
                  // mean what the code assumes it means.
                  containerType: 'inline-size',
                }}
              >
                {SLABS.map((s, i) => (
                  <div
                    key={s.code}
                    data-slab
                    className="absolute inset-x-0 top-0"
                    style={{
                      zIndex: 8 - i,
                      transform: staticOpen
                        ? `translateY(${((i * manifest.cleavedGapPx) / manifest.frame.w) * 100}cqw)`
                        : undefined,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.file}
                      alt=""
                      width={manifest.frame.w}
                      height={manifest.frame.h}
                      loading="lazy"
                      decoding="async"
                      className="pointer-events-none w-full"
                    />
                    <p
                      data-slab-label
                      className="st-mono absolute left-[73%] top-[38%] flex items-center gap-3 whitespace-nowrap text-strata-ink"
                      style={staticOpen ? undefined : { opacity: 0 }}
                    >
                      <span className="inline-block h-px w-16 bg-strata-seam" />
                      {s.code} / {s.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
