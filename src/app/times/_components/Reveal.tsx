'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Drops a single child up from below with a soft blur-out. Used everywhere
 * for "this just got placed on the desk" entry feel. No-op under
 * prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  duration = 0.55,
  className = '',
  motionProps,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  motionProps?: HTMLMotionProps<'div'>;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wrap a list to stagger its direct children using <StaggerItem />.
 * Used on the prospect rows, recent sends, etc — they cascade in like a
 * stack of letters being fanned across the desk.
 */
export function Stagger({
  children,
  delayChildren = 0.1,
  staggerChildren = 0.05,
  className = '',
}: {
  children: ReactNode;
  delayChildren?: number;
  staggerChildren?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { delayChildren, staggerChildren } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
  y = 12,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: 'div' | 'li' | 'tr';
}) {
  const MotionTag = motion[Tag];
  return (
    <MotionTag
      variants={{
        hidden: { opacity: 0, y, filter: 'blur(4px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
