import { LiveDot } from './portal-ui';

export function PortalFooter() {
  return (
    <footer className="relative border-t border-white/60 bg-gradient-to-r from-white/70 to-[var(--color-accent)]/5 backdrop-blur-md mt-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent" />
      <div className="container py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            Need help? Contact us at{' '}
            <a
              href="mailto:stratalanding@gmail.com"
              className="text-[var(--color-accent)] font-medium hover:underline"
            >
              stratalanding@gmail.com
            </a>
          </p>
          <LiveDot
            color="#0891B2"
            label="StrataLanding Client Portal"
            className="text-xs text-text-muted"
          />
        </div>
      </div>
    </footer>
  );
}
