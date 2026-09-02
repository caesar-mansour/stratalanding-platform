'use client';

/**
 * Smaller masthead used at the top of every sub-page (Inbox, Prospects, etc).
 * Reads as a "section" of the same paper — same brass rules, same Fraunces
 * type, just one tier smaller than the main Masthead. Animates in: kicker
 * fades, title staggers word-by-word with a tight blur reveal, brass rules
 * draw left-to-right and right-to-left, deck slides up.
 */
import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { AnimatedHeadline } from './AnimatedHeadline';

interface SectionMastheadProps {
  /** "FRONT PAGE", "LETTERS DESK", etc. — section ribbon, small caps brass */
  kicker: string;
  /** Display title — Fraunces big serif, e.g. "The Rolodex" */
  title: string;
  /** Italic deck — short editorial line under the title */
  description?: string;
  /** Right-side action slot (refresh, filters, etc) */
  action?: ReactNode;
}

export function SectionMasthead({ kicker, title, description, action }: SectionMastheadProps) {
  return (
    <header className="w-full">
      <motion.div
        className="brass-rule-thin origin-left"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="px-1 pt-3 pb-2 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <motion.div
            className="smallcaps text-[10px] brass-text"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
          >
            {kicker}
          </motion.div>
          <AnimatedHeadline
            text={title}
            as="h2"
            delay={0.15}
            className="font-display ink-text leading-none mt-1"
            style={{
              fontWeight: 900,
              fontSize: 'clamp(28px, 3.4vw, 44px)',
              letterSpacing: '-0.01em',
            }}
          />
          {description && (
            <motion.p
              className="font-display ink-soft text-[14px] mt-2"
              style={{ fontStyle: 'italic' }}
              initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {description}
            </motion.p>
          )}
        </div>
        {action && (
          <motion.div
            className="text-[11px] shrink-0"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {action}
          </motion.div>
        )}
      </div>
      <motion.div
        className="brass-rule origin-right"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      />
    </header>
  );
}
