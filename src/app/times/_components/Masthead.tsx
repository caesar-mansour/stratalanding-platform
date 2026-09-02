'use client';

import { motion } from 'framer-motion';
import { AnimatedHeadline, BrassShimmerRule } from './AnimatedHeadline';

interface MastheadProps {
  today?: Date;
  action?: React.ReactNode;
}

const NAMEPLATE = 'The Strata Times';
const TAGLINE = 'Cold Outreach';

export function Masthead({ today = new Date(), action }: MastheadProps) {
  const dateline = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="w-full relative">
      <motion.div
        className="brass-rule origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="px-1 pt-3 pb-2">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <motion.div
            className="smallcaps text-[11px] ink-soft"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            {TAGLINE}
          </motion.div>
        </div>
        <AnimatedHeadline
          text={NAMEPLATE}
          as="h1"
          delay={0.18}
          className="font-display text-[44px] md:text-[68px] leading-none ink-text mt-1 mb-1"
          style={{ fontWeight: 900, letterSpacing: '-0.015em' }}
        />
        <motion.div
          className="flex items-center justify-between gap-4 flex-wrap"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="smallcaps text-[11px] ink-soft">{dateline}</div>
          {action && <div className="text-[11px]">{action}</div>}
        </motion.div>
      </div>
      <motion.div
        className="brass-rule origin-right"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.95, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="mt-[3px]">
        <BrassShimmerRule />
      </div>
    </header>
  );
}
