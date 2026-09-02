'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { brand } from '@/lib/brand';

/**
 * Root error boundary.
 *
 * AUDIT 2026-08-12 (P1): the portal had `error.tsx` but the MARKETING site had none. A transient
 * Neon hiccup on the homepage, /pricing, /brief or a cold-outreach preview link therefore rendered
 * Next's raw unstyled error screen — to a prospect who had just clicked a link from an email.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled page error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Something went wrong
        </p>
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
          That page didn&apos;t load
        </h1>
        <p className="text-[var(--text-muted)]">
          This is on us, not you. Try again — and if it keeps happening, email{' '}
          <a href={`mailto:${brand.email}`} className="underline">
            {brand.email}
          </a>{' '}
          and we&apos;ll sort it out.
        </p>
        {error.digest && (
          <p className="text-xs text-[var(--text-muted)]">
            Reference: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold bg-[var(--accent)] text-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold border border-[var(--accent)]/30 text-[var(--text-primary)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
