"use client";

/**
 * Liquid Interaction System
 * -------------------------------------------------------------
 * One cohesive idea: the page behaves like the surface of the
 * locked WebGL water. Scroll + cursor "disturb" the content the
 * way they disturb the background — so motion answers the water
 * instead of ignoring it. Reference-locked to Lusion (cursor +
 * scroll interaction), Deta Surf (buoyant tilt cards, blue-tinted
 * elevation) and OFF+BRAND (sculpted scroll reveals, dashed
 * blueprint linework). Palette: navy #0B1B3A + cyan #0891B2/#22D3EE.
 *
 * All effects are transform/opacity only, gate off under
 * reduced-motion + coarse pointers, and never touch the bg.
 */

import {
  motion,
  animate,
  useScroll,
  useVelocity,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionTemplate,
  useInView,
} from "framer-motion";
import {
  useRef,
  useState,
  useEffect,
  useCallback,
  createElement,
  type ReactNode,
  type CSSProperties,
  type ElementType,
} from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

// ── shared: is rich pointer interaction allowed? ─────────────────
function useInteractive() {
  const reduce = useReducedMotion();
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  return !reduce && !coarse;
}

// ── DepthReveal ─────────────────────────────────────────────────
// Element *develops* as it enters: rise + un-blur + fade, scrubbed
// to scroll position (continuous), not a one-shot trigger pop.
export function DepthReveal({
  children,
  className,
  y = 44,
  blur = 7,
  start = 0.9,
  end = 0.55,
  style,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  blur?: number;
  start?: number; // viewport fraction where reveal begins (1=bottom)
  end?: number; // viewport fraction where reveal completes
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`start ${start}`, `start ${end}`],
  });
  const eased = useSpring(scrollYProgress, { stiffness: 150, damping: 30, mass: 0.6 });
  const opacity = useTransform(eased, [0, 1], [0, 1]);
  const ty = useTransform(eased, [0, 1], [y, 0]);
  const filter = useTransform(eased, [0, 0.7, 1], [`blur(${blur}px)`, "blur(0.5px)", "blur(0px)"]);

  if (reduce) {
    return (
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ opacity, y: ty, filter, willChange: "transform, opacity, filter", ...style }}
    >
      {children}
    </motion.div>
  );
}

// ── CurrentDrift ────────────────────────────────────────────────
// Media/cards lag in the "current": drift + micro-rotate driven by
// scroll velocity, settling with a spring when scrolling stops.
export function CurrentDrift({
  children,
  className,
  strength = 16,
  rotate = 1.1,
  style,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  rotate?: number;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const v = useVelocity(scrollY);
  const sv = useSpring(v, { stiffness: 90, damping: 30, mass: 0.7 });
  const y = useTransform(sv, [-2600, 0, 2600], [strength, 0, -strength], { clamp: true });
  const r = useTransform(sv, [-2600, 0, 2600], [rotate, 0, -rotate], { clamp: true });

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div className={className} style={{ y, rotate: r, willChange: "transform", ...style }}>
      {children}
    </motion.div>
  );
}

// ── SpotlightCard ───────────────────────────────────────────────
// Pointer-reactive 3D tilt + a cyan spotlight that follows the
// cursor (Deta floating-tilt + Lusion cursor + blue-tinted glow).
export function SpotlightCard({
  children,
  className,
  max = 7,
  lift = 0,
  liftScale = 1,
  glow = true,
  glowColor = "rgba(34,211,238,0.16)",
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  lift?: number; // px the card rises on hover
  liftScale?: number; // scale on hover (1 = none)
  glow?: boolean;
  glowColor?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const interactive = useInteractive();

  const mx = useMotionValue(0); // -0.5..0.5
  const my = useMotionValue(0);
  const px = useMotionValue(50); // glow position %
  const py = useMotionValue(50);
  const liftMV = useMotionValue(0);
  const scaleMV = useMotionValue(1);
  const glowMV = useMotionValue(0);

  const tilt = { stiffness: 150, damping: 17, mass: 0.5 };
  const soft = { stiffness: 200, damping: 22, mass: 0.5 };
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), tilt);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), tilt);
  const y = useSpring(liftMV, soft);
  const scale = useSpring(scaleMV, soft);
  const glowOpacity = useSpring(glowMV, { stiffness: 200, damping: 25 });
  const glowBg = useMotionTemplate`radial-gradient(240px circle at ${px}% ${py}%, ${glowColor}, transparent 62%)`;

  const onEnter = useCallback(() => {
    if (!interactive) return;
    liftMV.set(-lift);
    scaleMV.set(liftScale);
    glowMV.set(1);
  }, [interactive, lift, liftScale, liftMV, scaleMV, glowMV]);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      mx.set(fx - 0.5);
      my.set(fy - 0.5);
      px.set(fx * 100);
      py.set(fy * 100);
    },
    [interactive, mx, my, px, py]
  );

  const onLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
    liftMV.set(0);
    scaleMV.set(1);
    glowMV.set(0);
  }, [mx, my, liftMV, scaleMV, glowMV]);

  if (!interactive) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        rotateX,
        rotateY,
        y,
        scale,
        transformPerspective: 900,
        transformStyle: "preserve-3d",
        willChange: "transform",
        ...style,
      }}
    >
      {children}
      {glow && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glowBg, opacity: glowOpacity }}
        />
      )}
    </motion.div>
  );
}

// Optional child layer that floats above a TiltCard surface for depth.
export function TiltLayer({
  children,
  depth = 40,
  className,
  style,
}: {
  children: ReactNode;
  depth?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={{ transform: `translateZ(${depth}px)`, ...style }}>
      {children}
    </div>
  );
}

// ── ScrollDrawLine ──────────────────────────────────────────────
// A dashed "blueprint" connector that draws itself as you scroll
// through its container (OFF+BRAND linework). Place absolutely.
export function ScrollDrawLine({
  orientation = "vertical",
  className,
  color = "#0891B2",
  dashed = true,
  width = 2,
  targetRef,
}: {
  orientation?: "vertical" | "horizontal";
  className?: string;
  color?: string;
  dashed?: boolean;
  width?: number;
  targetRef?: React.RefObject<HTMLElement | null>;
}) {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = (targetRef ?? ownRef) as React.RefObject<HTMLElement>;
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });
  const full = useMotionValue(1);
  const pathLength = useSpring(reduce ? full : scrollYProgress, {
    stiffness: 110,
    damping: 30,
  });

  const isV = orientation === "vertical";
  return (
    <div ref={targetRef ? undefined : ownRef} className={className} aria-hidden>
      <svg
        className="h-full w-full overflow-visible"
        viewBox={isV ? "0 0 2 100" : "0 0 100 2"}
        preserveAspectRatio="none"
      >
        <motion.line
          x1={isV ? 1 : 0}
          y1={isV ? 0 : 1}
          x2={isV ? 1 : 100}
          y2={isV ? 100 : 1}
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={dashed ? "0.5 3" : undefined}
          style={{ pathLength }}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

// ── TideProgress ────────────────────────────────────────────────
// Slim cyan "tide" on the left edge that fills with scroll depth.
export function TideProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <motion.div
      aria-hidden
      className="fixed left-0 top-0 z-[60] hidden h-screen w-[3px] origin-top bg-gradient-to-b from-[#22D3EE] via-[#0891B2] to-[#0B1B3A] md:block"
      style={{ scaleY: reduce ? 1 : scaleY, opacity: 0.65 }}
    />
  );
}

// ── Parallax ────────────────────────────────────────────────────
// Depth layer: children move opposite to scroll across their pass through
// the viewport. `speed` is the px travel (positive = drifts up as you scroll
// down). With Lenis smoothing this reads as real depth, not jitter.
export function Parallax({
  children,
  speed = 60,
  className,
  style,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div ref={ref} className={className} style={{ y, willChange: "transform", ...style }}>
      {children}
    </motion.div>
  );
}

// ── MagneticLink ────────────────────────────────────────────────
// Lightweight magnetic pull for text links / icon buttons.
export function Magnetic({
  children,
  className,
  strength = 0.35,
  style,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const interactive = useInteractive();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      x.set((e.clientX - (r.left + r.width / 2)) * strength);
      y.set((e.clientY - (r.top + r.height / 2)) * strength);
    },
    [interactive, strength, x, y]
  );
  const reset = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  if (!interactive) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ x, y, willChange: "transform", ...style }}
    >
      {children}
    </motion.div>
  );
}

// ── Buoyant ─────────────────────────────────────────────────────
// Continuous gentle vertical bob (sine) at rest — the element floats
// on the water surface. With `drift`, it ALSO lags with scroll
// velocity (like CurrentDrift) so it sloshes with the current.
// Give cards in a row different `delay`s so they bob out-of-sync.
export function Buoyant({
  children,
  className,
  amplitude = 8,
  duration = 6,
  delay = 0,
  drift = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number; // px of vertical bob
  duration?: number; // seconds for one full bob cycle
  delay?: number; // seconds — offset so siblings desync
  drift?: boolean; // add scroll-velocity slosh
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const v = useVelocity(scrollY);
  const sv = useSpring(v, { stiffness: 90, damping: 30, mass: 0.7 });
  const driftY = useTransform(sv, [-2600, 0, 2600], [amplitude * 1.6, 0, -amplitude * 1.6], {
    clamp: true,
  });

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  // Inner element handles scroll-velocity slosh (motion value), outer
  // handles the continuous sine bob (keyframes) — kept on separate
  // elements so the two transforms compose without fighting.
  return (
    <motion.div
      className={className}
      style={{ y: drift ? driftY : 0, willChange: "transform", ...style }}
    >
      <motion.div
        animate={{ y: [0, -amplitude, 0] }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ willChange: "transform" }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── CausticText ─────────────────────────────────────────────────
// Soft cyan caustic light sweeping across text (background-clip:text
// animated gradient) once on reveal, optionally looping slowly. Use
// on a section's MAIN headline only. Reduced-motion → solid navy.
export function CausticText({
  children,
  className,
  as = "span",
  sweep = true,
  loop = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  sweep?: boolean; // run the caustic sweep at all
  loop?: boolean; // keep sweeping slowly after the first pass
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: !loop, amount: 0.5 });
  const pos = useMotionValue(0);

  useEffect(() => {
    if (reduce || !sweep || !inView) return;
    const controls = animate(pos, 100, {
      duration: loop ? 6 : 1.6,
      ease: loop ? "linear" : "easeInOut",
      repeat: loop ? Infinity : 0,
    });
    return () => controls.stop();
  }, [reduce, sweep, inView, loop, pos]);

  const backgroundPosition = useTransform(pos, (p) => `${p}% 50%`);

  if (reduce || !sweep) {
    return createElement(as, { className, style: { color: "#0B1B3A", ...style } }, children);
  }

  // background-clip:text with a navy→cyan→navy gradient that slides.
  const MotionTag = motion(as);
  return (
    <MotionTag
      ref={ref}
      className={className}
      style={{
        backgroundImage:
          "linear-gradient(100deg, #0B1B3A 0%, #0B1B3A 30%, #22D3EE 50%, #0B1B3A 70%, #0B1B3A 100%)",
        backgroundSize: "300% 100%",
        backgroundPosition,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        willChange: "background-position",
        ...style,
      }}
    >
      {children}
    </MotionTag>
  );
}

// ── LiquidCounter ───────────────────────────────────────────────
// On scroll-into-view, fills a number from 0 → value (comma
// formatted) with optional prefix/suffix. With `fill`, a cyan liquid
// mask rises behind the digits as it counts. Reduced-motion → final.
export function LiquidCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  durationMs = 1400,
  fill = false,
  style,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  durationMs?: number;
  fill?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const format = useCallback(
    (n: number) =>
      `${prefix}${n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`,
    [prefix, suffix, decimals]
  );

  const [display, setDisplay] = useState(() => format(reduce ? value : 0));
  const fillPct = useMotionValue(reduce ? 100 : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(format(value));
      return;
    }
    if (!inView) return;
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        setDisplay(format(latest));
        fillPct.set((latest / (value || 1)) * 100);
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, durationMs, format, fillPct]);

  const clipPath = useTransform(fillPct, (p) => `inset(${100 - p}% 0% 0% 0%)`);

  return (
    <span
      ref={ref}
      className={className}
      style={{ position: fill ? "relative" : undefined, display: "inline-block", ...style }}
    >
      {fill ? (
        <>
          {/* base digits in navy */}
          <span style={{ color: "#0B1B3A" }} aria-hidden>
            {display}
          </span>
          {/* cyan liquid layer rising behind/over the digits */}
          <motion.span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              color: "#22D3EE",
              clipPath: reduce ? "inset(0% 0% 0% 0%)" : clipPath,
              willChange: "clip-path",
            }}
          >
            {display}
          </motion.span>
        </>
      ) : (
        display
      )}
    </span>
  );
}

// ── CurrentBand ─────────────────────────────────────────────────
// Thin full-width marquee strip of repeating phrases that auto-
// scrolls and subtly speeds/skews with scroll velocity — a "current"
// running through the page. Use sparingly as a between-section divider.
export function CurrentBand({
  items,
  className,
  speed = 40,
  separator = "·",
  style,
}: {
  items: string[];
  className?: string;
  speed?: number; // seconds for one full loop (lower = faster)
  separator?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const v = useVelocity(scrollY);
  const sv = useSpring(v, { stiffness: 80, damping: 32, mass: 0.8 });
  const skew = useTransform(sv, [-3000, 0, 3000], [-4, 0, 4], { clamp: true });
  const speedMul = useTransform(sv, [-3000, 0, 3000], [1.8, 1, 1.8], { clamp: true });

  const x = useMotionValue(0);
  const lastSpeed = useRef(speed);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      // base px/sec so a -50% loop wraps roughly every `speed` seconds
      const base = 50 / Math.max(speed, 1);
      const cur = x.get() - dt * 100 * base * speedMul.get();
      // wrap at -50% (two copies side by side make this seamless)
      x.set(cur <= -50 ? cur + 50 : cur);
      lastSpeed.current = speed;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, speed, speedMul, x]);

  const xPct = useTransform(x, (val) => `${val}%`);

  const row = (
    <span className="flex shrink-0 items-center whitespace-nowrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center">
          <span>{item}</span>
          <span aria-hidden className="px-4 opacity-50">
            {separator}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      aria-hidden
      className={className}
      style={{
        overflow: "hidden",
        width: "100%",
        color: "#0891B2",
        background: "rgba(8,145,178,0.04)",
        ...style,
      }}
    >
      <motion.div
        className="flex w-max"
        style={{
          x: reduce ? 0 : xPct,
          skewX: reduce ? 0 : skew,
          willChange: "transform",
        }}
      >
        {row}
        {row}
      </motion.div>
    </div>
  );
}

// ── WaterEdge ───────────────────────────────────────────────────
// A subtle SVG meniscus/wave divider for the top or bottom edge of a
// section, so stacked sections read like layers of water. Lightweight,
// decorative only: pointer-events-none, aria-hidden, no scroll work.
// At rest it has a faint breathing drift; gated off under reduced-motion.
export function WaterEdge({
  position = "bottom",
  className,
  flip = false,
  tone = "cyan",
  style,
}: {
  position?: "top" | "bottom";
  className?: string;
  flip?: boolean;
  tone?: "cyan" | "navy";
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const stroke = tone === "navy" ? "#0B1B3A" : "#0891B2";
  const fillTop = tone === "navy" ? "rgba(11,27,58,0.10)" : "rgba(8,145,178,0.10)";
  const fillBottom = tone === "navy" ? "rgba(11,27,58,0)" : "rgba(8,145,178,0)";
  const gradId = `wateredge-${tone}-${position}`;

  // Flip vertically for top edges (so the wave hangs from the top), plus
  // optional horizontal flip for variety between adjacent dividers.
  const scaleY = position === "top" ? -1 : 1;
  const scaleX = flip ? -1 : 1;

  const wave = (
    <svg
      className="block h-full w-full"
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      style={{ transform: `scale(${scaleX}, ${scaleY})` }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillTop} />
          <stop offset="100%" stopColor={fillBottom} />
        </linearGradient>
      </defs>
      <path
        d="M0,28 C240,52 480,4 720,24 C960,44 1200,8 1440,30 L1440,64 L0,64 Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M0,28 C240,52 480,4 720,24 C960,44 1200,8 1440,30"
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeOpacity={0.35}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );

  const baseStyle: CSSProperties = {
    pointerEvents: "none",
    width: "100%",
    height: 64,
    ...style,
  };

  if (reduce) {
    return (
      <div aria-hidden className={className} style={baseStyle}>
        {wave}
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden
      className={className}
      style={{ ...baseStyle, willChange: "transform" }}
      animate={{ x: [0, -12, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
    >
      {wave}
    </motion.div>
  );
}

// ── Throwable ───────────────────────────────────────────────────
// Grab, drag and flick an element with momentum; it springs back to
// where it floats so nothing gets lost. Tactile — "I can touch it".
export function Throwable({
  children,
  className,
  elastic = 0.5,
  style,
}: {
  children: ReactNode;
  className?: string;
  elastic?: number;
  style?: CSSProperties;
}) {
  const interactive = useInteractive();
  if (!interactive) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragElastic={elastic}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      whileHover={{ scale: 1.03 }}
      whileDrag={{ scale: 1.07, zIndex: 60 }}
      data-cursor="grab"
      className={className}
      style={{ touchAction: "none", cursor: "grab", willChange: "transform", ...style }}
    >
      {children}
    </motion.div>
  );
}

// ── HoverReveal ─────────────────────────────────────────────────
// Pointing at the surface lifts it and fades in a layer of depth (a
// label, glow, or detail) under the cursor. "Hover reveals depth."
export function HoverReveal({
  children,
  reveal,
  className,
  style,
  lift = 6,
}: {
  children: ReactNode;
  reveal: ReactNode;
  className?: string;
  style?: CSSProperties;
  lift?: number;
}) {
  const interactive = useInteractive();
  const [hovered, setHovered] = useState(false);
  if (!interactive) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={`relative ${className ?? ""}`}
      style={{ willChange: "transform", ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ y: hovered ? -lift : 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      data-cursor="grow"
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        initial={false}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.25 }}
      >
        {reveal}
      </motion.div>
    </motion.div>
  );
}
