'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function ExitIntentPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const handleCloseRef = useRef<() => void>(() => {});
  const [hasShown, setHasShown] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [mounted, setMounted] = useState(false);

  // Don't show on admin, client portal, or demo pages
  const isExcludedRoute = pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.startsWith('/demos');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const alreadySubmitted = localStorage.getItem('exitIntentSubmitted');
      if (alreadySubmitted) {
        setSubmitted(true);
      }
    }
  }, []);

  const handleExitIntent = useCallback((e: MouseEvent) => {
    if (e.clientY <= 0 && !hasShown && !submitted) {
      if (typeof window !== 'undefined') {
        const shown = sessionStorage.getItem('exitIntentShown');
        if (!shown) {
          setIsOpen(true);
          setHasShown(true);
          sessionStorage.setItem('exitIntentShown', 'true');
        }
      }
    }
  }, [hasShown, submitted]);

  useEffect(() => {
    if (!mounted || submitted || isExcludedRoute) return;

    document.addEventListener('mouseout', handleExitIntent);

    return () => {
      document.removeEventListener('mouseout', handleExitIntent);
    };
  }, [mounted, handleExitIntent, submitted, isExcludedRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
      localStorage.setItem('exitIntentSubmitted', 'true');

      // Don't auto-close — let user read the checklist
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // AUDIT 2026-08-12 (P2): the modal had no dialog role, no aria-modal, no Escape handler and no
  // focus management — a keyboard or screen-reader user could neither be told a dialog had opened
  // nor dismiss it without hunting for the close button. Escape closes it, focus moves to the
  // close button on open, and focus returns to wherever it was when it closes.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };
  // Keep the Escape listener pointing at the current closer without re-binding it every render.
  handleCloseRef.current = handleClose;

  if (!mounted || isExcludedRoute) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-intent-title"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-[#3A6A8A] to-[#9ABCD8] p-6 text-white relative">
              <button
                onClick={handleClose}
                ref={closeButtonRef}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                aria-label="Close popup"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-4xl mb-3">Wait!</div>
              <h2 id="exit-intent-title" className="text-xl font-bold mb-2">
                Before you go...
              </h2>
              <p className="text-white/90">
                Get the free landing page checklist we build every StrataLanding page against.
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {!submitted ? (
                <>
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      10-point conversion checklist
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Real examples from top-performing pages
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Instant download, no spam
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="Enter your email"
                        disabled={isLoading}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3A6A8A]/20 focus:border-[#3A6A8A] transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          error
                            ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                            : 'border-[var(--border)]'
                        }`}
                      />
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm mt-1.5"
                        >
                          {error}
                        </motion.p>
                      )}
                    </div>
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-gradient-to-r from-[#3A6A8A] to-[#5A8AAA] text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                      whileHover={isLoading ? {} : { scale: 1.02 }}
                      whileTap={isLoading ? {} : { scale: 0.98 }}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        'Get the Free Checklist'
                      )}
                    </motion.button>
                  </form>

                  <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                    We respect your privacy. Unsubscribe anytime.
                  </p>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      Here&apos;s your checklist!
                    </h3>
                  </div>

                  <ol className="space-y-2.5 text-sm text-[var(--text-muted)]">
                    {[
                      ['Clear, benefit-driven headline', 'Speak to your visitor\'s #1 pain point'],
                      ['Single, focused CTA', 'One action per page, no distractions'],
                      ['Social proof above the fold', 'Logos, testimonials, or stats visible immediately'],
                      ['Fast load time (<3s)', 'Every second of delay kills 7% of conversions'],
                      ['Mobile-first design', '60%+ of traffic is mobile, design for it'],
                      ['Visual hierarchy', 'Guide the eye from headline to CTA naturally'],
                      ['Objection handling', 'Address doubts with FAQs, guarantees, or trust badges'],
                      ['Urgency or scarcity', 'Give visitors a reason to act now'],
                      ['Minimal form fields', 'Only ask for what you truly need'],
                      ['Thank-you page with next step', 'Keep momentum after conversion'],
                    ].map(([title, desc], i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#3A6A8A] text-white text-xs flex items-center justify-center font-medium mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-medium text-[var(--text-primary)]">{title}</span>
                          <span className="text-[var(--text-muted)]"> — {desc}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}

              {/* Alternative CTA */}
              <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
                <p className="text-sm text-[var(--text-muted)] mb-2">
                  Or ready to get started?
                </p>
                <Link
                  href="/brief"
                  onClick={handleClose}
                  className="text-[#3A6A8A] font-medium hover:underline inline-flex items-center gap-1"
                >
                  Start your project
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
