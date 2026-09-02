import Link from 'next/link';

// ROLLOUT 2026-08-12 (GATE 7): overrides the root layout's `index: true`. robots.txt already
// disallows /banned; this is the WAF's block page and has no search value.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Access Denied
        </h1>
        <p className="text-[var(--text-muted)] mb-8">
          Your account has been suspended. If you believe this is an error, please contact support.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--text-primary)] text-[var(--surface)] rounded-full hover:opacity-90 transition-opacity"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
