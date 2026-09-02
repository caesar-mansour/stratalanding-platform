'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Brass progress bar that fills from left, with a faint shimmer that
 * sweeps the filled portion every few seconds. Color flips to crimson
 * if `over` is set (e.g. domain over its hard ceiling).
 */
export function AnimatedBar({
  pct,
  over = false,
  height = 2,
  delay = 0,
}: {
  pct: number;
  over?: boolean;
  height?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, pct));
  const color = over ? 'var(--color-crimson)' : 'var(--color-brass)';
  const glow = over ? 'rgba(211,45,64,0.5)' : 'rgba(201,166,97,0.5)';

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height, backgroundColor: 'rgba(242,235,218,0.10)' }}
    >
      <motion.div
        className="h-full relative"
        style={{
          backgroundColor: color,
          boxShadow: clamped > 0 ? `0 0 8px ${glow}` : 'none',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{
          delay,
          duration: 1.1,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {clamped > 0 && !reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-[40%]"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,240,200,0.85) 50%, transparent 100%)',
              mixBlendMode: 'screen',
            }}
            initial={{ x: '-110%' }}
            animate={{ x: '300%' }}
            transition={{
              delay: delay + 0.6,
              duration: 2.4,
              repeat: Infinity,
              repeatDelay: 4,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
