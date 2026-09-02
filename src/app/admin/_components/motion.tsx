'use client';

/**
 * Admin Motion Hub
 * -------------------------------------------------------------
 * The single import surface for every admin motion primitive.
 * Light-premium tuned (white cards on #F8FAFC, navy #0B1B3A +
 * cyan #0891B2 / bright cyan #22D3EE glows).
 *
 * Rules honored throughout:
 *  - Every primitive respects useReducedMotion() (static fallback).
 *  - Cursor / tilt effects disable on touch devices.
 *  - Motion is COMPOSITOR-ONLY (transform / opacity) — the lone
 *    exception is MeterBar, which animates width by design.
 *
 * Color tokens: className uses the MAPPED utilities (bg-surface,
 * border-border, text-text-muted ...). Inline style with
 * hsl(var(--token)) is valid CSS and used where needed.
 */

import {
  motion,
  animate,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import {
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type ElementType,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useIsTouchDevice } from '@/lib/animation-perf';
import { useThrottledMouse } from '@/lib/useThrottledMouse';

// ── Re-exports (single import hub) ───────────────────────────────
export { TiltCard } from '@/components/motion/MagneticButton';
export { SpotlightCard as MarketingSpotlight } from '@/components/motion/liquid';

// ── Shared constants ─────────────────────────────────────────────
const ADMIN_EASE = [0.16, 1, 0.3, 1] as const;
const NAVY = '#0B1B3A';
const CYAN = '#0891B2';

// ── Shared helpers ───────────────────────────────────────────────

/** True when rich cursor interaction (tilt / spotlight) should run. */
function useInteractive(): boolean {
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice();
  return !reduce && !touch;
}

// =================================================================
// SpotlightCard — white card with a cursor-following radial glow
// =================================================================

import { TiltCard as TiltCardImpl } from '@/components/motion/MagneticButton';

export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** rgba glow color following the cursor. */
  glowColor?: string;
  /** radius (px) of the radial glow. */
  radius?: number;
  /** delegate to the 3D TiltCard. */
  tilt?: boolean;
  /** enable the cursor-following spotlight. */
  spotlight?: boolean;
  /** subtle hover lift + shadow. */
  hover?: boolean;
  /** apply default internal padding. */
  padded?: boolean;
  /** animated light-beam border. */
  beam?: boolean;
  onClick?: () => void;
}

/**
 * Animated gradient border-beam — a light traveling around the card edge.
 * Masked to a thin ring so only the border glows. Drop inside any
 * `relative overflow-hidden rounded-*` element.
 */
export function BorderBeam({
  duration = 7,
  colorFrom = '#22D3EE',
  colorTo = '#8B5CF6',
  thickness = 1.5,
  className = '',
}: {
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  thickness?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{
        padding: thickness,
        WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      }}
    >
      <motion.span
        className="absolute left-1/2 top-1/2 aspect-square w-[170%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${colorFrom} 40deg, ${colorTo} 95deg, transparent 150deg)`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      />
    </span>
  );
}

export function SpotlightCard({
  children,
  className = '',
  as = 'div',
  glowColor = 'rgba(34,211,238,0.22)',
  radius = 280,
  tilt = false,
  spotlight = true,
  hover = true,
  padded = false,
  beam = false,
  onClick,
}: SpotlightCardProps) {
  const interactive = useInteractive();

  const px = useMotionValue(50);
  const py = useMotionValue(50);
  const glow = useMotionValue(0);
  const glowOpacity = useSpring(glow, { stiffness: 220, damping: 26 });
  const glowBg = useMotionTemplate`radial-gradient(${radius}px circle at ${px}% ${py}%, ${glowColor}, transparent 65%)`;

  const onMove = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      px.set(((clientX - rect.left) / rect.width) * 100);
      py.set(((clientY - rect.top) / rect.height) * 100);
    },
    [px, py]
  );
  const onLeave = useCallback(() => {
    glow.set(0);
  }, [glow]);
  const throttled = useThrottledMouse(onMove, onLeave);
  const onEnter = useCallback(
    (e: React.MouseEvent) => {
      throttled.onMouseEnter(e);
      glow.set(1);
    },
    [throttled, glow]
  );

  const base =
    'relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md shadow-[0_10px_40px_-14px_rgba(11,27,58,0.22)]';
  const pad = padded ? ' p-6' : '';
  const hoverPlain = hover
    ? ' transition-shadow duration-200 hover:shadow-[0_18px_50px_-12px_rgba(8,145,178,0.30)]'
    : '';

  // Delegate the 3D tilt to the existing TiltCard, keep the spotlight inside.
  if (tilt && interactive) {
    return (
      <TiltCardImpl className={`${base}${pad} ${className}`} glareEnabled={spotlight}>
        {beam && <BorderBeam />}
        <div
          onClick={onClick}
          className="relative z-10 h-full w-full"
          style={onClick ? { cursor: 'pointer' } : undefined}
        >
          {children}
        </div>
      </TiltCardImpl>
    );
  }

  // Non-interactive (touch / reduced motion): plain styled card.
  if (!interactive || !spotlight) {
    const Comp = motion[as as 'div'] ?? motion.div;
    return (
      <Comp
        onClick={onClick}
        className={`${base}${pad}${hoverPlain} ${className}`}
        whileHover={hover && interactive ? { y: -2 } : undefined}
        transition={{ duration: 0.2, ease: ADMIN_EASE }}
        style={onClick ? { cursor: 'pointer' } : undefined}
      >
        {beam && <BorderBeam />}
        {children}
      </Comp>
    );
  }

  const Comp = motion[as as 'div'] ?? motion.div;
  return (
    <Comp
      onMouseEnter={onEnter}
      onMouseMove={throttled.onMouseMove}
      onMouseLeave={throttled.onMouseLeave}
      onClick={onClick}
      className={`${base}${pad}${hoverPlain} ${className}`}
      whileHover={hover ? { y: -6, scale: 1.012 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={onClick ? { cursor: 'pointer', willChange: 'transform' } : { willChange: 'transform' }}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: glowBg, opacity: glowOpacity }}
      />
      {beam && <BorderBeam />}
      <span className="relative z-10 block h-full">{children}</span>
    </Comp>
  );
}

// =================================================================
// Reveal / RevealGroup / RevealItem — in-view entrances
// =================================================================

export interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  y?: number;
  once?: boolean;
  amount?: number;
}

export function Reveal({
  children,
  className,
  as = 'div',
  delay = 0,
  y = 12,
  once = true,
  amount = 0.2,
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as as 'div'] ?? motion.div;

  return (
    <MotionTag
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: reduce ? 0.2 : 0.5, ease: ADMIN_EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

const revealGroupParent: Variants = {
  hidden: { opacity: 0 },
  visible: (custom: { stagger: number; delay: number }) => ({
    opacity: 1,
    transition: { staggerChildren: custom.stagger, delayChildren: custom.delay },
  }),
};

export interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  once?: boolean;
}

export function RevealGroup({
  children,
  className,
  stagger = 0.05,
  delay = 0,
  once = true,
}: RevealGroupProps) {
  return (
    <motion.div
      className={className}
      variants={revealGroupParent}
      custom={{ stagger, delay }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export interface RevealItemProps {
  children: ReactNode;
  className?: string;
  y?: number;
}

export function RevealItem({ children, className, y = 10 }: RevealItemProps) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduce
        ? { duration: 0.2 }
        : { type: 'spring', stiffness: 260, damping: 22, mass: 0.7 },
    },
  };
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

// =================================================================
// NumberTicker — animated count-up (number / currency / percent / compact)
// =================================================================

export type NumberFormat = 'number' | 'currency' | 'percent' | 'compact';

export interface NumberTickerProps {
  value: number;
  format?: NumberFormat;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function formatNumber(n: number, format: NumberFormat, decimals: number): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n);
    case 'percent':
      return `${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n)}%`;
    case 'compact':
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: decimals > 0 ? decimals : 1,
      }).format(n);
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n);
  }
}

export function NumberTicker({
  value,
  format = 'number',
  duration = 1.2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: NumberTickerProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: ADMIN_EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatNumber(display, format, decimals)}
      {suffix}
    </span>
  );
}

// =================================================================
// AnimatedRing — SVG progress ring with navy→cyan gradient stroke
// =================================================================

export interface AnimatedRingProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: ReactNode;
  duration?: number;
  className?: string;
}

export function AnimatedRing({
  value,
  max = 100,
  size = 96,
  stroke = 8,
  color = CYAN,
  trackColor = 'rgba(2,132,199,0.12)',
  label,
  duration = 1.1,
  className = '',
}: AnimatedRingProps) {
  const reduce = useReducedMotion();
  const gradId = useId();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const targetOffset = circumference * (1 - pct);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(pct * 100)}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={NAVY} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? targetOffset : circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: reduce ? 0 : duration, ease: ADMIN_EASE }}
        />
      </svg>
      {label != null && (
        <div className="absolute inset-0 flex items-center justify-center text-text-primary">
          {label}
        </div>
      )}
    </div>
  );
}

// =================================================================
// Donut — multi-segment ring
// =================================================================

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

export interface DonutProps {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  gap?: number;
  center?: ReactNode;
  className?: string;
}

export function Donut({
  segments,
  size = 120,
  stroke = 14,
  gap = 2,
  center,
  className = '',
}: DonutProps) {
  const reduce = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + Math.max(s.value, 0), 0) || 1;

  let cumulative = 0;
  const arcs = segments.map((seg, i) => {
    const frac = Math.max(seg.value, 0) / total;
    const len = Math.max(frac * circumference - gap, 0);
    const offset = -cumulative * circumference;
    cumulative += frac;
    return { i, color: seg.color, len, offset };
  });

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Donut chart"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          opacity={0.4}
        />
        {arcs.map((arc) => (
          <motion.circle
            key={arc.i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${arc.len} ${circumference - arc.len}`}
            strokeDashoffset={arc.offset}
            initial={{ opacity: reduce ? 1 : 0, pathLength: reduce ? 1 : 0 }}
            whileInView={{ opacity: 1, pathLength: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: reduce ? 0 : 0.9, ease: ADMIN_EASE }}
          />
        ))}
      </svg>
      {center != null && (
        <div className="absolute inset-0 flex items-center justify-center text-text-primary">
          {center}
        </div>
      )}
    </div>
  );
}

// =================================================================
// Sparkline — normalized polyline with optional area fill
// =================================================================

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  animate?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 36,
  color = CYAN,
  fill = true,
  strokeWidth = 2,
  animate: doAnimate = true,
  className = '',
}: SparklineProps) {
  const reduce = useReducedMotion();
  const gradId = useId();

  const pad = strokeWidth;
  const min = data.length ? Math.min(...data) : 0;
  const max = data.length ? Math.max(...data) : 1;
  const span = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * (width - pad * 2) + pad : width / 2;
    const y = height - pad - ((d - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`
      : '';

  const animated = doAnimate && !reduce;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="Sparkline"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && areaPath && (
        <motion.path
          d={areaPath}
          fill={`url(#${gradId})`}
          initial={{ opacity: animated ? 0 : 0.12 }}
          whileInView={{ opacity: 0.12 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: animated ? 0.6 : 0, ease: ADMIN_EASE, delay: animated ? 0.3 : 0 }}
        />
      )}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: animated ? 0 : 1 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: animated ? 1.2 : 0, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  );
}

// =================================================================
// AreaChart — responsive area chart with gradient fill + crosshair
// =================================================================

export interface AreaPoint {
  x: string | number;
  y: number;
}

export interface AreaChartProps {
  data: AreaPoint[];
  height?: number;
  color?: string;
  showTooltip?: boolean;
  yMax?: number;
  formatY?: (y: number) => string;
  formatX?: (x: string | number) => string;
  className?: string;
}

const VB_W = 600; // internal viewBox width (responsive via preserveAspectRatio)

export function AreaChart({
  data,
  height = 180,
  color = CYAN,
  showTooltip = true,
  yMax,
  formatY,
  formatX,
  className = '',
}: AreaChartProps) {
  const reduce = useReducedMotion();
  const fillId = useId();
  const maskId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ i: number; left: number } | null>(null);

  const pad = 6;
  const maxY = yMax ?? (data.length ? Math.max(...data.map((d) => d.y)) : 1);
  const safeMax = maxY || 1;

  const coords = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * (VB_W - pad * 2) + pad : VB_W / 2;
    const y = height - pad - (d.y / safeMax) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1][0]},${height} L${coords[0][0]},${height} Z`
      : '';

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!showTooltip || data.length === 0) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      const i = Math.round(ratio * (data.length - 1));
      setHover({ i, left: rect.width * (data.length > 1 ? i / (data.length - 1) : 0.5) });
    },
    [showTooltip, data.length]
  );

  const hovered = hover && data[hover.i] ? data[hover.i] : null;
  const crossX = hover && coords[hover.i] ? coords[hover.i][0] : 0;
  const crossY = hover && coords[hover.i] ? coords[hover.i][1] : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{ height }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label="Area chart"
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VB_W} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <mask id={maskId}>
            <motion.rect
              x="0"
              y="0"
              height={height}
              fill="white"
              initial={{ width: reduce ? VB_W : 0 }}
              whileInView={{ width: VB_W }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reduce ? 0 : 1, ease: ADMIN_EASE }}
            />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          {areaPath && <path d={areaPath} fill={`url(#${fillId})`} />}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
        {showTooltip && hover && (
          <g>
            <line
              x1={crossX}
              y1={pad}
              x2={crossX}
              y2={height}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={crossX} cy={crossY} r={4} fill={color} stroke="white" strokeWidth={2} />
          </g>
        )}
      </svg>
      {showTooltip && hovered && hover && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface px-2.5 py-1.5 text-xs shadow-[var(--shadow-lg)] border border-border"
          style={{ left: hover.left }}
        >
          <div className="font-semibold text-text-primary tabular-nums">
            {formatY ? formatY(hovered.y) : hovered.y.toLocaleString()}
          </div>
          <div className="text-text-muted">{formatX ? formatX(hovered.x) : String(hovered.x)}</div>
        </div>
      )}
    </div>
  );
}

// =================================================================
// BarMini — crisp SVG bars that grow in-view
// =================================================================

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface BarMiniProps {
  data: BarDatum[];
  height?: number;
  gap?: number;
  rounded?: number;
  color?: string;
  showTooltip?: boolean;
  className?: string;
}

export function BarMini({
  data,
  height = 120,
  gap = 4,
  rounded = 4,
  color = CYAN,
  showTooltip = true,
  className = '',
}: BarMiniProps) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const max = data.length ? Math.max(...data.map((d) => d.value)) : 1;
  const safeMax = max || 1;
  const n = data.length || 1;
  const totalGap = gap * (n - 1);
  const barW = (VB_W - totalGap) / n;

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VB_W} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Bar chart"
      >
        {data.map((d, i) => {
          const barH = (d.value / safeMax) * height;
          const x = i * (barW + gap);
          const y = height - barH;
          return (
            <motion.rect
              key={i}
              x={x}
              width={barW}
              rx={rounded}
              fill={d.color ?? color}
              initial={{ height: reduce ? barH : 0, y: reduce ? y : height }}
              whileInView={{ height: barH, y }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: reduce ? 0 : 0.7,
                ease: ADMIN_EASE,
                delay: reduce ? 0 : i * 0.04,
              }}
              opacity={hover == null || hover === i ? 1 : 0.5}
              onMouseEnter={() => showTooltip && setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      {showTooltip && hover != null && data[hover] && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-surface px-2.5 py-1.5 text-xs shadow-[var(--shadow-lg)] border border-border"
          style={{ left: `${((hover + 0.5) / n) * 100}%` }}
        >
          <span className="font-semibold text-text-primary tabular-nums">
            {data[hover].value.toLocaleString()}
          </span>{' '}
          <span className="text-text-muted">{data[hover].label}</span>
        </div>
      )}
    </div>
  );
}

// =================================================================
// MeterBar — the ONLY width-animated primitive (navy→cyan)
// =================================================================

export interface MeterBarProps {
  percentage: number;
  color?: string;
  trackClassName?: string;
  height?: number;
  delay?: number;
  shimmer?: boolean;
  rounded?: boolean;
  className?: string;
}

export function MeterBar({
  percentage,
  color = CYAN,
  trackClassName = '',
  height = 8,
  delay = 0,
  shimmer = false,
  rounded = true,
  className = '',
}: MeterBarProps) {
  const reduce = useReducedMotion();
  const pct = Math.min(Math.max(percentage, 0), 100);
  const radius = rounded ? height / 2 : 0;

  return (
    <div
      className={`relative w-full overflow-hidden bg-background border border-border ${trackClassName} ${className}`}
      style={{ height, borderRadius: radius }}
    >
      <motion.div
        className="relative h-full"
        style={{
          borderRadius: radius,
          background: `linear-gradient(90deg, ${NAVY}, ${color})`,
        }}
        initial={{ width: reduce ? `${pct}%` : '0%' }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: reduce ? 0 : 0.9, ease: ADMIN_EASE, delay }}
      >
        {shimmer && !reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.5 }}
          />
        )}
      </motion.div>
    </div>
  );
}

// =================================================================
// LiveDot — dot with animated ping ring
// =================================================================

export interface LiveDotProps {
  color?: string;
  size?: number;
  label?: ReactNode;
  className?: string;
}

export function LiveDot({ color = '#10b981', size = 8, label, className = '' }: LiveDotProps) {
  const reduce = useReducedMotion();
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative inline-flex" style={{ width: size, height: size }}>
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ background: color }}
            animate={{ scale: [1, 2.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span
          className="relative inline-block rounded-full"
          style={{ width: size, height: size, background: color }}
        />
      </span>
      {label != null && <span className="text-text-muted">{label}</span>}
    </span>
  );
}

// =================================================================
// Pulse — subtle pulse wrapper
// =================================================================

export interface PulseProps {
  children: ReactNode;
  active?: boolean;
  color?: string;
  className?: string;
}

export function Pulse({ children, active = true, color = CYAN, className = '' }: PulseProps) {
  const reduce = useReducedMotion();
  if (!active || reduce) {
    return <span className={className}>{children}</span>;
  }
  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ willChange: 'opacity', color }}
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.span>
  );
}

// =================================================================
// GradientText — navy→cyan clipped text
// =================================================================

export interface GradientTextProps {
  children: ReactNode;
  className?: string;
  from?: string;
  to?: string;
  /** slow traveling shimmer (default true; auto-disabled under reduced motion). */
  shimmer?: boolean;
}

export function GradientText({
  children,
  className = '',
  from = NAVY,
  to = CYAN,
  shimmer = true,
}: GradientTextProps) {
  return (
    <span
      className={`bg-clip-text text-transparent ${shimmer ? 'admin-gradient-pan' : ''} ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${from}, ${to} 45%, #22D3EE 55%, ${to} 70%, ${from})`,
      }}
    >
      {children}
    </span>
  );
}

// =================================================================
// Pressable — tap-scale + ripple element (button / a / div)
// =================================================================

export interface PressableProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  as?: 'button' | 'a' | 'div';
  href?: string;
  ripple?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  ariaLabel?: string;
  /** lean toward the cursor on hover (default true). */
  magnetic?: boolean;
  /** magnetic pull strength 0..1 (default 0.3). */
  strength?: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export function Pressable({
  children,
  onClick,
  className = '',
  as = 'button',
  href,
  ripple = true,
  disabled = false,
  type = 'button',
  title,
  ariaLabel,
  magnetic = true,
  strength = 0.3,
}: PressableProps) {
  const reduce = useReducedMotion();
  const touch = useIsTouchDevice();
  const [ripples, setRipples] = useState<Ripple[]>([]);

  // Magnetic pull toward the cursor.
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 260, damping: 18, mass: 0.4 });
  const my = useSpring(myRaw, { stiffness: 260, damping: 18, mass: 0.4 });
  const magneticOn = magnetic && !reduce && !touch && !disabled;

  const onMagMove = useCallback(
    (e: React.MouseEvent) => {
      if (!magneticOn) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      mxRaw.set((e.clientX - (rect.left + rect.width / 2)) * strength);
      myRaw.set((e.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [magneticOn, strength, mxRaw, myRaw]
  );
  const onMagLeave = useCallback(() => {
    mxRaw.set(0);
    myRaw.set(0);
  }, [mxRaw, myRaw]);

  const spawnRipple = useCallback(
    (e: React.MouseEvent) => {
      if (!ripple || reduce || disabled) return;
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const id = Date.now() + Math.random();
      setRipples((prev) => [
        ...prev,
        { id, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, size },
      ]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    },
    [ripple, reduce, disabled]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      spawnRipple(e);
      onClick?.(e);
    },
    [disabled, spawnRipple, onClick]
  );

  const tapEnabled = !reduce && !touch && !disabled;
  const MotionTag = motion[as];

  const rippleLayer =
    ripple && !reduce ? (
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="absolute rounded-full"
            style={{
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              background: 'currentColor',
              opacity: 0.18,
            }}
            initial={{ scale: 0, opacity: 0.25 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </span>
    ) : null;

  const sharedProps = {
    className: `relative overflow-hidden ${className}`,
    onClick: handleClick,
    onMouseMove: onMagMove,
    onMouseLeave: onMagLeave,
    title,
    'aria-label': ariaLabel,
    style: { x: mx, y: my },
    whileHover: tapEnabled ? { scale: 1.03 } : undefined,
    whileTap: tapEnabled ? { scale: 0.96 } : undefined,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
  };

  if (as === 'a') {
    return (
      <MotionTag {...sharedProps} href={disabled ? undefined : href}>
        {children}
        {rippleLayer}
      </MotionTag>
    );
  }
  if (as === 'div') {
    return (
      <MotionTag {...sharedProps} role={onClick ? 'button' : undefined}>
        {children}
        {rippleLayer}
      </MotionTag>
    );
  }
  return (
    <MotionTag {...sharedProps} type={type} disabled={disabled}>
      {children}
      {rippleLayer}
    </MotionTag>
  );
}

// =================================================================
// SuccessCheck — SVG check drawn via pathLength
// =================================================================

export interface SuccessCheckProps {
  size?: number;
  show: boolean;
  color?: string;
  className?: string;
}

export function SuccessCheck({ size = 20, show, color = '#10b981', className = '' }: SuccessCheckProps) {
  const reduce = useReducedMotion();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <motion.path
        d="M4 12.5l5 5 11-11"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: show ? 1 : reduce ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: ADMIN_EASE }}
      />
    </svg>
  );
}

// =================================================================
// CopyButton — copy to clipboard + success swap
// =================================================================

export interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: number;
}

export function CopyButton({ value, label = 'Copy', className = '', size = 16 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : label}
      className={`inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-accent ${className}`}
    >
      {copied ? (
        <SuccessCheck show size={size} />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}
