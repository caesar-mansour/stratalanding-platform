'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { ModalPortal } from './ModalPortal';

/**
 * Editorial modal. The backdrop dims warm — walnut over the page, just a
 * touch of blur. The panel scales in from 96% with a tight physical spring,
 * so it feels weighed rather than animated. A brass hairline draws across
 * the top edge as it settles, like an editor's pen marking the page. Esc
 * and click-outside both close.
 */
export function AnimatedModal({
  open,
  onClose,
  children,
  className = '',
  panelClassName = '',
  panelStyle,
  align = 'center',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
  panelStyle?: React.CSSProperties;
  align?: 'center' | 'top';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <ModalPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className={`fixed inset-0 z-50 flex justify-center p-4 sm:p-6 ${
              align === 'top' ? 'items-start pt-[10vh]' : 'items-center'
            } ${className}`}
            style={{
              backgroundColor: 'rgba(10, 6, 2, 0.55)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          >
            <motion.div
              key="panel"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{
                opacity: { duration: 0.2, ease: 'easeOut' },
                scale: { type: 'spring', stiffness: 380, damping: 30, mass: 0.7 },
                y: { type: 'spring', stiffness: 380, damping: 30, mass: 0.7 },
              }}
              className={`relative ${panelClassName}`}
              style={{
                ...panelStyle,
                boxShadow:
                  '0 30px 60px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,166,97,0.10), 0 0 60px -10px rgba(201,166,97,0.18)',
              }}
            >
              {/* Brass hairline drawing across the top edge — editor's mark */}
              <motion.span
                aria-hidden
                className="absolute top-0 left-0 right-0 h-[1px] origin-left pointer-events-none"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  scaleX: { delay: 0.16, duration: 0.55, ease: [0.16, 1, 0.3, 1] },
                  opacity: { delay: 0.16, duration: 0.3 },
                }}
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(201,166,97,0.95) 50%, transparent 100%)',
                  boxShadow: '0 0 10px rgba(201,166,97,0.55)',
                }}
              />

              {/* Soft warm wash from the top, like a desk lamp catching the page */}
              <motion.span
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-[inherit]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{
                  background:
                    'radial-gradient(600px 320px at 50% -10%, rgba(201,166,97,0.10), transparent 60%)',
                }}
              />

              <div className="relative">{children}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
