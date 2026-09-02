'use client';

import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { ReactNode, useRef } from 'react';

/**
 * Wraps any element so it leans toward the cursor on hover. Subtle — the
 * pull never exceeds `strength` pixels. Used on brass CTAs and nav stars
 * to give them a "premium" feel.
 */
export function Magnetic({
  children,
  strength = 14,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
  as?: 'div' | 'span';
}) {
  const ref = useRef<HTMLDivElement | HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }

  const MotionTag = motion[Tag];

  return (
    <MotionTag
      ref={ref as React.Ref<HTMLDivElement & HTMLSpanElement>}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
