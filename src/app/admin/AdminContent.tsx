'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';
import { GradientText } from './_components/motion';

interface AdminContentProps {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function AdminContent({
  title,
  description,
  children,
  actions,
}: AdminContentProps) {
  const reduce = useReducedMotion();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-start justify-between gap-4 mb-8"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-[#22D3EE] via-[#0891B2] to-[#0B1B3A] shadow-[0_0_14px_rgba(8,145,178,0.55)]" />
            <h2 className="text-3xl font-bold tracking-tight truncate">
              <GradientText from="#0B1B3A" to="#0891B2">{title}</GradientText>
            </h2>
          </div>
          <p className="text-text-muted pl-4">{description}</p>
        </div>
        {actions && (
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0"
          >
            {actions}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </main>
  );
}
