import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Access Not Available
        </h1>

        <p className="text-[var(--text-muted)] mb-6">
          The portal is only available to clients who have submitted a project brief.
          If you&apos;ve submitted a brief and are seeing this message, please contact us.
        </p>

        <div className="space-y-3">
          <Link
            href="/brief"
            className="block w-full bg-[var(--primary)] text-white py-3 px-6 rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-opacity"
          >
            Submit a Project Brief
          </Link>

          <a
            href="mailto:stratalanding@gmail.com"
            className="block w-full border border-[var(--border)] text-[var(--text-primary)] py-3 px-6 rounded-[var(--radius-md)] font-medium hover:bg-[var(--background)] transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
