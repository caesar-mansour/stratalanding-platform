"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * THE MOTION LAYER.
 *
 * The previous build banned motion outright — its own CSS said "Forbidden on
 * hover anywhere: transform, scale, translate" — because a reference do-not list
 * warned against the `scale(1.02)` card lift. That was a rule about ONE cheap
 * gesture, and turning it into a total prohibition left a page where the only
 * thing that moved was link colour. Static is why it read dead.
 *
 * What the premium references actually do is not decoration; it is:
 *   · content that ARRIVES rather than being already there (staggered reveal)
 *   · a hero that resolves on load instead of appearing fully formed
 *   · the product visual doing something only a real page could do
 *   · hover that gives real feedback, not a bouncing card
 *
 * Everything here is transform/opacity only, so it composites on the GPU and
 * cannot cause layout. Reduced-motion and coarse pointers get the finished state
 * immediately — the page is designed to be excellent completely still, and the
 * motion is the reward for scrolling.
 */

const EASE = "cubic-bezier(.22,1,.36,1)";

function prefersStill() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * REVEAL — content arrives on scroll. 14px rise + fade, 620ms, with an optional
 * stagger so a row of cells resolves left-to-right instead of all at once.
 *
 * IntersectionObserver rather than a scroll handler: it fires once, costs nothing
 * per frame, and self-disconnects. `once` is deliberate — content that re-hides
 * when you scroll back up is the single most irritating scroll effect there is.
 */
export function Reveal({
  children,
  delay = 0,
  stagger = 0,
  as: Tag = "div",
  className = "",
  id,
}: {
  children: ReactNode;
  delay?: number;
  stagger?: number;
  as?: "div" | "section" | "header" | "aside";
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersStill()) { el.dataset.shown = "true"; return; }

    const kids = stagger ? Array.from(el.children) as HTMLElement[] : [];
    kids.forEach((k, i) => { k.style.transitionDelay = `${delay + i * stagger}ms`; });
    if (!stagger) el.style.transitionDelay = `${delay}ms`;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          el.dataset.shown = "true";
          io.disconnect();
        }
      },
      // fire a little before the element is fully in view, so it is already
      // resolving as it enters rather than starting once it has arrived
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, stagger]);

  return (
    <Tag
      ref={ref as never}
      id={id}
      className={`one-rv ${stagger ? "one-rv--stagger" : ""} ${className}`}
      data-shown="false"
    >
      {children}
    </Tag>
  );
}

/**
 * HERO INTRO — the headline resolves line by line on load, then everything under
 * it follows. This is the one piece of motion that happens without being asked
 * for, so it is the one that decides whether the page feels alive in the first
 * second.
 *
 * Lines are already separate spans in the markup (the declared-lines rule that
 * stops mid-word breaks), so no text splitting is needed at runtime — which also
 * means no font-load race and no CLS.
 */
export function HeroIntro({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersStill()) { el.dataset.shown = "true"; return; }
    // one frame, so the initial state paints before the transition starts
    const r = requestAnimationFrame(() => { el.dataset.shown = "true"; });
    return () => cancelAnimationFrame(r);
  }, []);

  return <div ref={ref} className="one-intro" data-shown="false">{children}</div>;
}

/**
 * PLATE SCRUB — the signature.
 *
 * The plate holds a real client page captured full-height (1440×12,749). As you
 * scroll past it, the capture travels through its own content inside the frame,
 * so you watch a real finished landing page scroll. It is the one motion on the
 * page that could not be faked with a graphic, and it is the thing that proves
 * the plate is a page rather than a picture of one.
 *
 * One ScrollTrigger writing one translate3d. `will-change` is held only while the
 * plate is on screen — leaving it on permanently would pin a compositor layer for
 * a 12,749px-tall texture. Not an iframe: an iframe would mount React and compete
 * for this thread, which is how it would blow the 200ms long-task budget.
 */
export function PlateScrub({
  children,
  /** how far the capture travels, in multiples of the frame's own height */
  travel = 1.8,
}: {
  children: ReactNode;
  travel?: number;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const shot = el.querySelector<HTMLImageElement>(".one-plate__shot");
    const win = el.querySelector<HTMLElement>(".one-plate__window");
    if (!shot || !win) return;
    if (prefersStill()) return;

    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const frameH = win.clientHeight || 0;
      const shotH = shot.naturalHeight || shot.clientHeight || 0;
      // never travel past the end of the capture, however generous `travel` is
      const distance = Math.min(frameH * travel, Math.max(0, shotH - frameH));
      if (distance <= 0) return;

      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
        onUpdate: (self) => {
          gsap.set(shot, { y: -(self.progress * distance), overwrite: "auto" });
        },
        onToggle: (self) => {
          shot.style.willChange = self.isActive ? "transform" : "auto";
        },
      });
      cleanup = () => { shot.style.willChange = "auto"; st.kill(); };
    })();

    return () => { cancelled = true; cleanup(); };
  }, [travel]);

  return <div ref={wrap} className="one-scrub">{children}</div>;
}

export { EASE };
