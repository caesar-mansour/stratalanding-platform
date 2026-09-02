import { redirect } from 'next/navigation';
import Sidebar from './_components/Sidebar';
import { AmbientBackdrop } from './_components/AmbientBackdrop';
import { PageTransition } from './_components/PageTransition';
import './times.css';
import { verifyAdmin } from '@/lib/admin-auth';

export const metadata = {
  title: 'Outreach · The Strata Times',
  // ROLLOUT 2026-08-12 (GATE 7): overrides the root layout's `index: true`. See admin/layout.tsx.
  robots: { index: false, follow: false },
};

const AUTH_BYPASSED =
  process.env.NODE_ENV !== 'production' && process.env.SKIP_ADMIN_AUTH === 'true';

export default async function OutreachLayout({ children }: { children: React.ReactNode }) {
  if (!AUTH_BYPASSED) {
    // AUDIT 2026-08-12 (P1 A-01): was a direct timing-safe compare against ADMIN_ACCESS_TOKEN,
    // which bypassed session revocation and expiry. verifyAdmin() validates a real server-side
    // session row and also applies the IP allowlist.
    if (!(await verifyAdmin())) {
      redirect('/admin/login?next=/times/outreach');
    }
  }

  return (
    <div
      className="times-shell min-h-screen w-full antialiased relative"
      style={{
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        colorScheme: 'dark',
        zIndex: 1,
        backgroundColor: '#1A130C',
      }}
    >
      <AmbientBackdrop />
      <div className="flex min-h-screen relative" style={{ zIndex: 1 }}>
        <Sidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-8 lg:py-10">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
