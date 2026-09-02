'use client';

/**
 * Admin Confirm Dialog
 * -------------------------------------------------------------
 * A premium, promise-based replacement for the browser's native
 * window.confirm(). Same decoupled architecture as the Toaster:
 * fire from anywhere, no React import needed.
 *
 *   import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';
 *
 *   const { confirmed } = await confirmDialog({
 *     title: 'Delete this task?',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     tone: 'danger',
 *   });
 *   if (!confirmed) return;
 *
 * Optional checkbox (collapses multi-step confirms into one):
 *
 *   const { confirmed, checked } = await confirmDialog({
 *     title: 'Delete this project?',
 *     checkbox: { label: 'Also delete the client account', defaultChecked: false },
 *   });
 *
 * Mount <ConfirmHost /> once in the admin layout. Self-hides on
 * /admin/login. Respects reduced motion. Light-premium styling.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Optional checkbox rendered above the buttons; its state is returned as `checked`. */
  checkbox?: { label: string; defaultChecked?: boolean };
}

export interface ConfirmResult {
  confirmed: boolean;
  checked: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (result: ConfirmResult) => void;
}

const ADMIN_EASE = [0.16, 1, 0.3, 1] as const;

/** Open a confirm dialog from anywhere. Resolves when the user chooses. */
export function confirmDialog(opts: ConfirmOptions): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ confirmed: false, checked: false });
      return;
    }
    window.dispatchEvent(
      new CustomEvent('admin:confirm', { detail: { ...opts, resolve } }),
    );
  });
}

export default function ConfirmHost() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const [checked, setChecked] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(
    (confirmed: boolean) => {
      setReq((current) => {
        current?.resolve({ confirmed, checked: confirmed ? checked : false });
        return null;
      });
    },
    [checked],
  );

  useEffect(() => {
    const onConfirm = (e: Event) => {
      const detail = (e as CustomEvent<ConfirmRequest>).detail;
      if (!detail || !detail.title) return;
      setReq((current) => {
        // If something is already open, decline it before replacing.
        current?.resolve({ confirmed: false, checked: false });
        return detail;
      });
      setChecked(detail.checkbox?.defaultChecked ?? false);
    };
    window.addEventListener('admin:confirm', onConfirm as EventListener);
    return () => window.removeEventListener('admin:confirm', onConfirm as EventListener);
  }, []);

  // Escape to cancel + lock body scroll while open + focus the safe action.
  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTarget = req.tone === 'danger' ? cancelBtnRef : confirmBtnRef;
    const raf = requestAnimationFrame(() => focusTarget.current?.focus());
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
  }, [req, close]);

  if (pathname === '/admin/login') return null;

  const isDanger = req?.tone === 'danger';

  return (
    <AnimatePresence>
      {req && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#0B1B3A]/45 backdrop-blur-sm"
            onClick={() => close(false)}
            aria-hidden
          />

          {/* Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.28, ease: ADMIN_EASE }}
            className="relative w-[min(92vw,420px)] overflow-hidden rounded-2xl bg-surface ring-1 ring-border shadow-[var(--shadow-lg)]"
          >
            <span
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                isDanger ? 'from-rose-400 to-rose-600' : 'from-[#22D3EE] to-[#0891B2]'
              }`}
              aria-hidden
            />

            <div className="p-6">
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    isDanger ? 'bg-rose-50 text-rose-600' : 'bg-cyan-50 text-accent'
                  }`}
                  aria-hidden
                >
                  {isDanger ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                  )}
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 id="confirm-title" className="text-base font-semibold text-text-primary">
                    {req.title}
                  </h2>
                  {req.message && (
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{req.message}</p>
                  )}
                </div>
              </div>

              {req.checkbox && (
                <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl bg-background px-3.5 py-3 ring-1 ring-border transition-colors hover:ring-[#0891B2]/40">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent accent-[#0891B2]"
                  />
                  <span className="text-sm text-text-primary">{req.checkbox.label}</span>
                </label>
              )}

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  ref={cancelBtnRef}
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-background hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]/50"
                >
                  {req.cancelLabel || 'Cancel'}
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  onClick={() => close(true)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isDanger
                      ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/60'
                      : 'bg-[#0891B2] hover:bg-[#0B7A96] focus-visible:ring-[#0891B2]/60'
                  }`}
                >
                  {req.confirmLabel || 'Confirm'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
