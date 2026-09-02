'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Living aurora background for the admin shell. Large, heavily-blurred color
 * blobs drift and breathe behind the (glassmorphic) content, mixing into a
 * soft, premium "command-center" wash on the light #F8FAFC base. Pointer-events
 * off, sits behind all content (content uses z-10). Static when reduced-motion.
 */

type Blob = {
  color: string;
  size: number;
  left: string;
  top: string;
  dur: number;
  delay: number;
  x: number[];
  y: number[];
};

const BLOBS: Blob[] = [
  { color: 'rgba(34,211,238,0.55)', size: 660, left: '-10%', top: '-14%', dur: 26, delay: 0, x: [0, 90, -40, 0], y: [0, 60, 100, 0] },
  { color: 'rgba(8,145,178,0.45)', size: 540, left: '60%', top: '4%', dur: 30, delay: 1.4, x: [0, -70, 50, 0], y: [0, 70, -30, 0] },
  { color: 'rgba(139,92,246,0.40)', size: 600, left: '18%', top: '52%', dur: 28, delay: 0.8, x: [0, 60, -60, 0], y: [0, -50, 40, 0] },
  { color: 'rgba(45,212,191,0.36)', size: 480, left: '68%', top: '58%', dur: 33, delay: 2.1, x: [0, -80, 40, 0], y: [0, -40, -70, 0] },
  { color: 'rgba(56,189,248,0.32)', size: 420, left: '38%', top: '20%', dur: 24, delay: 1.0, x: [0, 50, -50, 0], y: [0, 60, 20, 0] },
];

export default function AuroraBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* base wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F6FAFD] via-[#EEF5FB] to-[#F3F0FC]" />

      {/* drifting color blobs */}
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute rounded-full mix-blend-multiply"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            top: b.top,
            filter: 'blur(90px)',
            background: `radial-gradient(circle at 32% 30%, ${b.color}, transparent 70%)`,
          }}
          animate={reduce ? undefined : { x: b.x, y: b.y, scale: [1, 1.16, 0.92, 1] }}
          transition={reduce ? undefined : { duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* faint engineering grid for depth */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(8,145,178,1) 1px, transparent 1px), linear-gradient(90deg, rgba(8,145,178,1) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />

      {/* slow sweeping sheen */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-1/2"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
          initial={{ x: '-60%' }}
          animate={{ x: '220%' }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', repeatDelay: 6 }}
        />
      )}

      {/* top + bottom light falloff so content reads cleanly */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/40 to-transparent" />
    </div>
  );
}
