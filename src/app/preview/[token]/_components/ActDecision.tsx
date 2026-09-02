'use client';

/*
 * Act 4 — "The Decision". The verbatim decision card: "I love it — let's do it"
 * (label `like` — the liked_at latch) vs "Not for me" (label fired by the
 * orchestrator). The confetti module is warmed via a one-shot observer so the
 * burst is instant on tap without costing the initial load anything.
 */

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Magnetic } from '@/components/motion/liquid';
import { INK, MUTE, LINE, PANE, SERIF, IconHeart, Primary, Secondary } from './bits';

interface Props {
  onLike: () => void;
  onNotForMe: () => void;
}

export default function ActDecision({ onLike, onNotForMe }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const rise: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] } },
  };

  // Warm the confetti chunk right before the lead can tap the button.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        import('./burst').catch(() => {});
      },
      { rootMargin: '80% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} data-act="decision" className="px-5 pb-6 pt-2 sm:px-10" style={{ background: PANE }}>
      <motion.div
        variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }}
        className="mx-auto max-w-[620px] rounded-[28px] p-7 text-center sm:p-10"
        style={{ background: '#fff', border: `1px solid ${LINE}`, boxShadow: '0 1px 2px rgba(11,27,58,0.04), 0 30px 70px -30px rgba(11,27,58,0.22)' }}
      >
        <p className="text-[24px] font-semibold leading-tight sm:text-[28px]" style={{ fontFamily: SERIF, color: INK }}>
          Had a look? What did you think?
        </p>
        <p className="mt-2 text-[14px]" style={{ color: MUTE }}>Be honest — it&apos;s just me on the other end.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Magnetic className="flex-1" strength={0.22}>
            <Primary onClick={onLike} className="w-full"><IconHeart /> I love it — let&apos;s do it</Primary>
          </Magnetic>
          <Secondary onClick={onNotForMe}>Not for me</Secondary>
        </div>
      </motion.div>
    </section>
  );
}
