'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

/**
 * Cinematic backdrop layer for the desk. Three independent things:
 *   1. Slow drifting brass haloes that breathe behind the masthead.
 *   2. Vertical "press paper" scanlines you only feel out of the corner of
 *      your eye — they crawl downward at <1px/s.
 *   3. A handful of dust motes / brass particles that float upward.
 *
 * Pinned behind everything (z-index: 0) and pointer-events:none so it never
 * intercepts clicks. Fully respects prefers-reduced-motion.
 */
export function AmbientBackdrop() {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const motes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 1.2 + Math.random() * 2.4,
        delay: Math.random() * 14,
        duration: 18 + Math.random() * 22,
        opacity: 0.18 + Math.random() * 0.32,
      })),
    [],
  );

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* 1. Slow brass haloes */}
      {!reduce && (
        <>
          <motion.div
            className="absolute -top-40 left-1/4 w-[1100px] h-[700px] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(201,166,97,0.18), rgba(201,166,97,0) 70%)',
              filter: 'blur(20px)',
            }}
            animate={{
              x: [0, 60, -40, 0],
              y: [0, 30, -20, 0],
              scale: [1, 1.08, 0.96, 1],
            }}
            transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/3 -right-40 w-[900px] h-[900px] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(255,220,160,0.10), rgba(0,0,0,0) 70%)',
              filter: 'blur(28px)',
            }}
            animate={{
              x: [0, -50, 30, 0],
              y: [0, 40, -30, 0],
              scale: [1, 0.94, 1.06, 1],
            }}
            transition={{ duration: 46, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 left-1/3 w-[1200px] h-[600px] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(180,145,74,0.10), rgba(0,0,0,0) 70%)',
              filter: 'blur(24px)',
            }}
            animate={{
              x: [0, 80, -60, 0],
              y: [0, -40, 20, 0],
            }}
            transition={{ duration: 52, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* 2. Vertical press lines drifting */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(242,235,218,0.018) 0px, rgba(242,235,218,0.018) 1px, transparent 1px, transparent 3px)',
          opacity: 0.6,
        }}
        animate={reduce ? undefined : { backgroundPositionY: ['0px', '120px'] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />

      {/* 3. Dust motes / brass particles */}
      {!reduce &&
        motes.map((m) => (
          <motion.span
            key={m.id}
            className="absolute rounded-full"
            style={{
              left: `${m.left}%`,
              bottom: -20,
              width: m.size,
              height: m.size,
              background: 'rgba(201,166,97,0.85)',
              boxShadow: '0 0 6px rgba(201,166,97,0.55)',
              opacity: m.opacity,
            }}
            animate={{
              y: ['0vh', '-110vh'],
              x: [0, 30, -20, 0],
              opacity: [0, m.opacity, m.opacity, 0],
            }}
            transition={{
              duration: m.duration,
              delay: m.delay,
              repeat: Infinity,
              ease: 'linear',
              times: [0, 0.1, 0.9, 1],
            }}
          />
        ))}

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1200px 800px at 50% 50%, transparent 0%, rgba(8,5,2,0.18) 70%, rgba(8,5,2,0.45) 100%)',
        }}
      />
    </div>
  );
}
