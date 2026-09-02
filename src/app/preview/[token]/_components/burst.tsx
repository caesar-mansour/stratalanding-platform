'use client';

/*
 * Celebration burst fired when the lead taps "I love it — let's do it".
 * Loaded via next/dynamic (ssr:false) so it costs zero bytes until the tap.
 * Brand palette only (cyan/teal family — no amber). Transform/opacity only.
 */

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#0891B2', '#06B6D4', '#22D3EE', '#67E8F9', '#0E7490'];

export default function Burst({ onDone }: { onDone: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 130 + Math.random() * 190;
        return {
          id: i,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 120, // bias upward
          rot: (Math.random() - 0.5) * 540,
          size: 6 + Math.random() * 7,
          color: COLORS[i % COLORS.length],
          round: i % 3 === 0,
          delay: Math.random() * 0.08,
        };
      }),
    []
  );

  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute left-1/2 top-[58%]">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="absolute block"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.color,
              borderRadius: p.round ? '50%' : 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: p.dx, y: p.dy + 160, opacity: [1, 1, 0], rotate: p.rot, scale: 1 }}
            transition={{ duration: 1.05, delay: p.delay, ease: [0.16, 0.8, 0.4, 1] }}
          />
        ))}
      </div>
    </div>
  );
}
