'use client';

/*
 * Persistent conversion rail.
 * Mobile: safe-area-aware bottom action bar that appears once you've scrolled
 * past the first viewport and morphs with the funnel — "View your new website"
 * (same href + view_site beacon as the main CTA) → after they've clicked
 * through, "I love it — let's do it" (fires the exact `like` label via the
 * orchestrator's onLike).
 * Desktop: the same morphing CTA as a bottom-right pill, plus a 2px
 * scroll-progress hairline along the top. `pulseKey` increments when the
 * prospect returns from the spec-site tab → one attention pulse on the pill.
 * Both variants slide away while the CompactGate decision card
 * ([data-act="decision"]) is on screen so the page never shows two competing
 * CTAs at once. Transform/opacity only.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { CYAN, BRIGHT, UI, IconArrow, IconHeart } from './bits';

interface Props {
  siteHref: string;
  onViewSite: () => void;
  siteViewed: boolean;
  onLike: () => void;
  pulseKey?: number;
}

const barStyle: React.CSSProperties = {
  fontFamily: UI,
  background: 'linear-gradient(180deg, #22D3EE, #0891B2)',
  color: '#04121F',
  boxShadow: '0 14px 34px -12px rgba(8,145,178,0.65), inset 0 1px 0 rgba(255,255,255,0.35)',
};

export default function StickyBar({ siteHref, onViewSite, siteViewed, onLike, pulseKey = 0 }: Props) {
  const { scrollY, scrollYProgress } = useScroll();
  const [show, setShow] = useState(false);
  const [decisionInView, setDecisionInView] = useState(false);
  const reduce = useReducedMotion();

  useMotionValueEvent(scrollY, 'change', (v) => {
    setShow(v > (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.7);
  });

  // Slide away while the Act 4 decision card is on screen — its buttons are the
  // same actions, and two stacked CTAs read as competing asks.
  useEffect(() => {
    const el = document.querySelector('[data-act="decision"]');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setDecisionInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const visible = show && !decisionInView;

  return (
    <>
      {/* Desktop scroll-progress hairline */}
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-50 hidden h-[2.5px] origin-left lg:block"
        style={{ scaleX: scrollYProgress, background: `linear-gradient(90deg, ${CYAN}, ${BRIGHT})` }}
      />

      {/* Desktop floating pill (bottom-right) — same morph + handlers as the mobile bar */}
      <motion.div
        className="fixed bottom-6 right-6 z-40 hidden lg:block"
        initial={false}
        animate={{ y: visible ? 0 : 130, opacity: visible ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          key={pulseKey}
          initial={false}
          animate={pulseKey > 0 && !reduce ? { scale: [1, 1.06, 1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {siteViewed ? (
              <motion.button
                key="love"
                type="button"
                onClick={onLike}
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-[15px] font-bold active:scale-[0.985] motion-reduce:active:scale-100"
                style={barStyle}
              >
                <IconHeart /> I love it — let&apos;s do it
              </motion.button>
            ) : (
              <motion.a
                key="view"
                href={siteHref}
                onClick={onViewSite}
                target="_blank"
                rel="noopener noreferrer"
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-[15px] font-bold active:scale-[0.985] motion-reduce:active:scale-100"
                style={barStyle}
              >
                View your new website <IconArrow />
              </motion.a>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Mobile action bar */}
      <motion.div
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        initial={false}
        animate={{ y: visible ? 0 : 130 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <AnimatePresence mode="wait" initial={false}>
            {siteViewed ? (
              <motion.button
                key="love"
                type="button"
                onClick={onLike}
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-bold active:scale-[0.985] motion-reduce:active:scale-100"
                style={barStyle}
              >
                <IconHeart /> I love it — let&apos;s do it
              </motion.button>
            ) : (
              <motion.a
                key="view"
                href={siteHref}
                onClick={onViewSite}
                target="_blank"
                rel="noopener noreferrer"
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: reduce ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[16px] font-bold active:scale-[0.985] motion-reduce:active:scale-100"
                style={barStyle}
              >
                View your new website <IconArrow />
              </motion.a>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
