'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Soft, client-facing animated background for the portal. Three large, very
 * blurred brand-color blobs drift slowly over a light base — calmer and
 * gentler than the admin's aurora (no constellation/grid), so the portal feels
 * premium and welcoming rather than a busy command-center. Static when reduced
 * motion. Sits behind all content.
 */
const BLOBS = [
  { color: 'rgba(34,211,238,0.45)', size: 660, left: '-10%', top: '-12%', dur: 30, x: [0, 70, -40, 0], y: [0, 50, 90, 0] },
  { color: 'rgba(8,145,178,0.38)', size: 560, left: '64%', top: '0%', dur: 36, x: [0, -60, 40, 0], y: [0, 60, -25, 0] },
  { color: 'rgba(56,170,220,0.42)', size: 600, left: '20%', top: '52%', dur: 33, x: [0, 60, -50, 0], y: [0, -45, 40, 0] },
  { color: 'rgba(45,212,191,0.32)', size: 480, left: '72%', top: '58%', dur: 38, x: [0, -40, 30, 0], y: [0, -50, 20, 0] },
];

export default function PortalBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#EAF4FB] via-[#F4F9FC] to-[#EFF6FC]" />
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
            filter: 'blur(100px)',
            background: `radial-gradient(circle at 32% 30%, ${b.color}, transparent 70%)`,
          }}
          animate={reduce ? undefined : { x: b.x, y: b.y, scale: [1, 1.12, 0.95, 1] }}
          transition={reduce ? undefined : { duration: b.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 1.2 }}
        />
      ))}
      {/* slow light sheen sweeping across */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-2/5"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)' }}
          initial={{ x: '-70%' }}
          animate={{ x: '260%' }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', repeatDelay: 5 }}
        />
      )}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/25 to-transparent" />
    </div>
  );
}
