'use client';

import { motion } from 'framer-motion';

/**
 * Branded loading skeleton for the Decision Room. Matches the masthead +
 * three-column grid the real page uses, with shimmering brass placeholders.
 * Replaces the plain "Loading…" text so the ~1s API wait feels intentional
 * and on-brand, not like a stall.
 */
export function RoomSkeleton() {
  return (
    <div className="relative">
      {/* Masthead skeleton */}
      <div>
        <ShimmerLine className="h-[2px]" delay={0} />
        <div className="px-1 pt-3 pb-2">
          <ShimmerBlock className="h-[14px] w-[110px] mt-1" delay={0.05} />
          <div className="mt-2 mb-1 flex items-end gap-3">
            <ShimmerBlock
              className="h-[44px] md:h-[68px] w-full max-w-[640px] rounded-sm"
              delay={0.1}
              variant="title"
            />
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap mt-2">
            <ShimmerBlock className="h-[12px] w-[180px]" delay={0.15} />
            <ShimmerBlock className="h-[12px] w-[80px]" delay={0.18} />
          </div>
        </div>
        <ShimmerLine className="h-[2px]" delay={0.2} />
        <ShimmerLine className="h-[1px] mt-[3px] opacity-50" delay={0.25} />
      </div>

      {/* Editorial deck */}
      <ShimmerBlock className="h-[20px] w-[80%] max-w-[680px] mt-6" delay={0.3} />

      {/* Three-column desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 mt-8">
        <SkeletonColumn span="lg:col-span-5 lg:pr-8" delay={0.35} rows={5} />
        <SkeletonColumn span="lg:col-span-4 lg:px-8" delay={0.45} rows={4} />
        <SkeletonColumn span="lg:col-span-3 lg:pl-8" delay={0.55} rows={3} />
      </div>

      {/* Status caption — subtle */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 text-center font-display ink-soft text-[12px]"
        style={{ fontStyle: 'italic' }}
        animate={{ opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        ✦ Setting today&apos;s edition…
      </motion.div>
    </div>
  );
}

function SkeletonColumn({
  span,
  delay,
  rows,
}: {
  span: string;
  delay: number;
  rows: number;
}) {
  return (
    <section className={span}>
      <div className="flex items-center gap-2 mb-3">
        <ShimmerBlock className="h-[12px] w-[14px]" delay={delay} />
        <ShimmerBlock className="h-[12px] w-[120px]" delay={delay + 0.04} />
      </div>
      <ShimmerLine className="h-[1px] mb-4 opacity-50" delay={delay + 0.08} />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <ShimmerBlock
              className="h-[14px] w-full max-w-[260px]"
              delay={delay + 0.1 + i * 0.06}
            />
            <ShimmerBlock
              className="h-[10px] w-[60%] mt-1.5"
              delay={delay + 0.13 + i * 0.06}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ShimmerLine({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`relative w-full overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(201,166,97,0.45) 22%, rgba(201,166,97,0.45) 78%, transparent 100%)',
        }}
      />
      <motion.div
        className="absolute inset-y-0 w-[28%]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,235,180,0.95) 50%, transparent 100%)',
          mixBlendMode: 'screen',
        }}
        initial={{ x: '-30%' }}
        animate={{ x: '420%' }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 0.6,
          delay,
        }}
      />
    </motion.div>
  );
}

function ShimmerBlock({
  className = '',
  delay = 0,
  variant = 'plain',
}: {
  className?: string;
  delay?: number;
  variant?: 'plain' | 'title';
}) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-[2px] ${className}`}
      style={{
        backgroundColor:
          variant === 'title' ? 'rgba(242,235,218,0.06)' : 'rgba(242,235,218,0.045)',
      }}
      initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="absolute inset-y-0 w-[40%]"
        style={{
          background:
            variant === 'title'
              ? 'linear-gradient(90deg, transparent 0%, rgba(201,166,97,0.28) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(242,235,218,0.18) 50%, transparent 100%)',
        }}
        initial={{ x: '-110%' }}
        animate={{ x: '260%' }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: 'easeInOut',
          repeatDelay: 0.4,
          delay,
        }}
      />
    </motion.div>
  );
}
