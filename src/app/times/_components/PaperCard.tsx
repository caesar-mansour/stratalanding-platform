'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Newsroom card. Rises from below with a soft blur-clear on entry.
 * (No cursor-tracked glow — kept clean per Caesar.)
 */
export function PaperCard({
  children,
  className = '',
  padding = 'md',
  as = 'div',
  motionProps,
}: {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article';
  motionProps?: HTMLMotionProps<'div'>;
}) {
  const pad = padding === 'none' ? '' : padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-8' : 'p-6';
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      {...motionProps}
      className={`${pad} ${className}`}
    >
      {children}
    </Tag>
  );
}
