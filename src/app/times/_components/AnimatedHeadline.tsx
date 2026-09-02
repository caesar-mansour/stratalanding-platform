'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Word-by-word stagger reveal for serif headlines. Each word slides up from
 * below the baseline with a tight, blur-to-clear transition. Reads like the
 * masthead is being set in lead type a moment before you arrive.
 */
export function AnimatedHeadline({
  text,
  className = '',
  delay = 0,
  as: Tag = 'h2',
  style,
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3';
  style?: React.CSSProperties;
}) {
  const words = text.split(' ');

  const container = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: 0.03,
      },
    },
  };

  const word = {
    hidden: {
      opacity: 0,
      y: '0.35em',
      filter: 'blur(6px)',
      rotateX: -18,
    },
    show: {
      opacity: 1,
      y: '0em',
      filter: 'blur(0px)',
      rotateX: 0,
      transition: {
        type: 'spring' as const,
        damping: 22,
        stiffness: 220,
        mass: 0.6,
      },
    },
  };

  const MotionTag = motion[Tag];

  return (
    <MotionTag
      className={className}
      style={{ ...style, perspective: 800, display: 'inline-block' }}
      variants={container}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'baseline' }}
          aria-hidden
        >
          <motion.span
            variants={word}
            style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/**
 * Brass underline that draws itself from left → right on mount.
 */
export function BrassDrawRule({
  delay = 0,
  duration = 0.9,
  className = '',
  thin = false,
}: {
  delay?: number;
  duration?: number;
  className?: string;
  thin?: boolean;
}) {
  return (
    <motion.div
      className={`${thin ? 'brass-rule-thin' : 'brass-rule'} origin-left ${className}`}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}

/**
 * Sweeps a soft brass shimmer along a horizontal line. Used as an ambient
 * cue that the page is "live" — the press is running.
 */
export function BrassShimmerRule({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-[1px] overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--color-brass) 22%, var(--color-brass) 78%, transparent 100%)',
          opacity: 0.55,
        }}
      />
      <motion.div
        className="absolute top-0 h-full w-[24%]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,235,180,0.85) 50%, transparent 100%)',
          mixBlendMode: 'screen' as const,
        }}
        initial={{ x: '-30%' }}
        animate={{ x: '420%' }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
      />
    </div>
  );
}
