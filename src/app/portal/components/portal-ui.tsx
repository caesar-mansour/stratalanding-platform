'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SpotlightCard, Pressable, GradientText } from '@/app/admin/_components/motion';
import type { SpotlightCardProps, PressableProps } from '@/app/admin/_components/motion';

/**
 * Portal motion kit — reuses the admin motion primitives so the client portal
 * shares one design language with the studio admin, but with SOFTER, calmer
 * client-facing defaults (gentle glow, no tilt, no ripple, weaker magnetism).
 *
 * Primitives that read fine as-is are re-exported unchanged.
 */
export {
  Reveal,
  RevealGroup,
  RevealItem,
  NumberTicker,
  AnimatedRing,
  Donut,
  Sparkline,
  AreaChart,
  BarMini,
  MeterBar,
  LiveDot,
  Pulse,
  SuccessCheck,
  GradientText,
  CopyButton,
} from '@/app/admin/_components/motion';

/** Soft glassmorphic card for the portal — gentle cursor glow, no 3D tilt. */
export function PortalCard(props: SpotlightCardProps) {
  return <SpotlightCard glowColor="rgba(8,145,178,0.10)" radius={170} tilt={false} {...props} />;
}

/** Calm interactive button for the portal — subtle magnetism, no ripple. */
export function PortalButton(props: PressableProps) {
  return <Pressable ripple={false} strength={0.15} {...props} />;
}

interface PortalPageHeaderProps {
  /** Main heading text (rendered through the brand gradient). */
  title: ReactNode;
  /** Optional supporting line under the title. */
  subtitle?: ReactNode;
  /** Optional small uppercase kicker above the title. */
  eyebrow?: ReactNode;
  /** Optional leading icon, shown in a glass chip. */
  icon?: ReactNode;
  /** Optional right-aligned slot (button / link / status). */
  action?: ReactNode;
  /** Gradient stops for the title. Defaults to navy → cyan. */
  gradient?: [string, string];
  className?: string;
}

/**
 * The portal's single signature page header — one consistent title treatment
 * across every page (gradient title, optional eyebrow/icon/subtitle/action, and
 * a sweeping accent hairline). Gives the whole portal a "designed by one hand"
 * feel. Reduced-motion safe.
 */
export function PortalPageHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  action,
  gradient = ['#0B1B3A', '#0891B2'],
  className = '',
}: PortalPageHeaderProps) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      className={`mb-8 ${className}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/90">
              <span className="h-1 w-1 rounded-full bg-accent" />
              {eyebrow}
            </div>
          )}
          <div className="flex items-center gap-3">
            {icon && (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/60 bg-white/70 text-accent shadow-[0_6px_20px_-10px_rgba(11,27,58,0.25)] backdrop-blur-md">
                {icon}
              </span>
            )}
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
              <GradientText from={gradient[0]} to={gradient[1]}>
                {title}
              </GradientText>
            </h1>
          </div>
          {subtitle && <p className="mt-2 text-text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <motion.div
        className="mt-4 h-px w-full bg-gradient-to-r from-[#0891B2]/40 via-[#0891B2]/10 to-transparent"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        style={{ transformOrigin: '0% 50%' }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      />
    </motion.header>
  );
}
