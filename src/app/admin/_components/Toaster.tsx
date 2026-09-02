'use client';

/**
 * Admin Toaster
 * -------------------------------------------------------------
 * A tiny, dependency-free toast surface for the admin app.
 * Decoupled by design: any code can fire a toast without importing
 * this component by dispatching a CustomEvent:
 *
 *   window.dispatchEvent(new CustomEvent('admin:toast', {
 *     detail: { title: 'Saved', description: 'Proposal sent', variant: 'success' }
 *   }));
 *
 * or via the exported helper:
 *
 *   import { toast } from '@/app/admin/_components/Toaster';
 *   toast.success('Saved', 'Proposal sent');
 *
 * Self-hides on /admin/login. Respects reduced motion. Light-premium
 * styling (white card on #F8FAFC, navy + cyan accents).
 */

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SuccessCheck } from './motion';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms (default 4000; 0 = sticky). */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ADMIN_EASE = [0.16, 1, 0.3, 1] as const;

const VARIANT_RING: Record<ToastVariant, string> = {
  default: 'ring-border',
  success: 'ring-emerald-200',
  error: 'ring-rose-200',
  info: 'ring-cyan-200',
};

const VARIANT_BAR: Record<ToastVariant, string> = {
  default: 'from-[#0891B2] to-[#0B1B3A]',
  success: 'from-emerald-400 to-emerald-600',
  error: 'from-rose-400 to-rose-600',
  info: 'from-[#22D3EE] to-[#0891B2]',
};

/** Fire a toast from anywhere (no React import needed). */
export const toast = Object.assign(
  (input: ToastInput) => emit(input),
  {
    success: (title: string, description?: string) =>
      emit({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      emit({ title, description, variant: 'error' }),
    info: (title: string, description?: string) =>
      emit({ title, description, variant: 'info' }),
  },
);

function emit(input: ToastInput) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('admin:toast', { detail: input }));
}

let SEQ = 0;

export default function Toaster() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastInput>).detail;
      if (!detail || !detail.title) return;
      const id = ++SEQ;
      const duration = detail.duration ?? 4000;
      setItems((prev) => [...prev.slice(-3), { ...detail, id }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    };
    window.addEventListener('admin:toast', onToast as EventListener);
    return () => window.removeEventListener('admin:toast', onToast as EventListener);
  }, [dismiss]);

  if (pathname === '/admin/login') return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[90] flex w-[min(92vw,360px)] flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const variant = t.variant ?? 'default';
          return (
            <motion.div
              key={t.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.32, ease: ADMIN_EASE }}
              className={`relative overflow-hidden rounded-xl bg-surface ring-1 ${VARIANT_RING[variant]} shadow-[var(--shadow-lg)]`}
            >
              <span
                className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${VARIANT_BAR[variant]}`}
                aria-hidden
              />
              <div className="flex items-start gap-3 py-3 pl-5 pr-3">
                {variant === 'success' && (
                  <span className="mt-0.5 shrink-0">
                    <SuccessCheck show size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-text-muted">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-background hover:text-text-primary"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
