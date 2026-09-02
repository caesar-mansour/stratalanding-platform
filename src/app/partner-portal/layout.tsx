import "./partner-portal.css";
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';
import sql from '@/lib/db';
import Image from 'next/image';
import Link from 'next/link';
import PartnerNav from './PartnerNav';
import { PortalSwitcher, type PortalRole } from '@/components/layout/PortalSwitcher';
import { safeJsonForScript } from '@/lib/html-utils';
import PortalBackground from '@/app/portal/components/PortalBackground';
import PortalConstellation from '@/app/portal/components/PortalConstellation';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  referral_code: string;
  status: string;
  paypal_email: string | null;
  total_clicks: number;
  total_conversions: number;
  total_earned_cents: number;
  total_paid_cents: number;
  commission_rate: number;
  created_at: string;
}

// ROLLOUT 2026-08-12 (GATE 7): overrides the root layout's `index: true`. See admin/layout.tsx.
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getServerUser();
  if (!user) redirect('/login?redirectTo=/partner-portal');

  const [affiliate] = await sql`
    SELECT * FROM affiliates WHERE auth_user_id = ${user.id} LIMIT 1
  `;

  if (!affiliate) redirect('/partners');
  const a = affiliate as unknown as Affiliate;

  // Rejected gate
  if (a.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F8FAFC]">
        <PortalBackground />
        <div className="relative z-10 rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)] p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0B1B3A] mb-2">Application Not Approved</h2>
          <p className="text-sm text-text-muted leading-relaxed">Your partner application was not approved at this time. If you believe this is an error, please contact us at stratalanding@gmail.com.</p>
        </div>
      </div>
    );
  }

  const isPending = a.status === 'pending';

  // Compute the set of portals this user actually has access to
  const [clientRecord] = await sql`SELECT id FROM clients WHERE email = ${a.email} LIMIT 1`.catch(() => [null]);
  const [templateRecord] = await sql`SELECT id FROM template_purchases WHERE buyer_email = ${a.email} LIMIT 1`.catch(() => [null]);
  const roles: PortalRole[] = [];
  if (clientRecord) roles.push('client');
  if (templateRecord) roles.push('templates');
  roles.push('partner');
  const showSwitcher = roles.length >= 2;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#F8FAFC]">

      {/* Header — mirrors PortalHeader (cyan-tinted gradient + glowing cyan edge + glass email pill) */}
      <header className="relative overflow-hidden bg-gradient-to-r from-[#E9F6FB] via-[#8FCFE0] to-[#155E7A] border-b border-white/20">
        {/* glowing cyan bottom edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22D3EE]/70 to-transparent" />
        <div className="container relative flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/partner-portal" className="group font-bold text-lg text-[#1A3A5A] flex items-center gap-2 sm:gap-3 min-w-0">
              <Image
                src="/brand/stratalanding.png"
                alt="StrataLanding"
                width={31}
                height={36}
                className="w-auto h-8 sm:h-9 shrink-0 transition-transform duration-300 group-hover:scale-[1.07] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]"
                unoptimized
              />
              <span className="leading-tight hidden sm:inline">Partner Portal</span>
              <span className="leading-tight sm:hidden text-base">Partners</span>
            </Link>
            {showSwitcher && (
              <>
                <div className="w-px h-7 bg-[#1A3A5A]/15" />
                <PortalSwitcher roles={roles} />
              </>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {isPending && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100/80 backdrop-blur-sm rounded-lg border border-amber-200/60">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-amber-700">Pending Review</span>
              </div>
            )}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/25 ring-1 ring-white/40 rounded-lg backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm text-[#1A3A5A]/80 truncate max-w-[180px]">{a.email}</span>
            </div>
            <form action="/api/auth/signout" method="post">
              <button type="submit" aria-label="Sign out" className="text-sm text-[#1A3A5A]/70 hover:text-[#1A3A5A] flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-[#1A3A5A]/10 transition-colors">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Nav */}
      <PartnerNav />

      {/* Pending banner */}
      {isPending && (
        <div className="border-b border-amber-200/40 bg-gradient-to-r from-amber-50 to-amber-100/50 backdrop-blur-sm">
          <div className="container py-3 flex items-center gap-3 text-sm text-amber-800">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Your application is being reviewed. Your referral link is reserved but commissions won&apos;t track until approved.
          </div>
        </div>
      )}

      {/* Content — soft animated portal background + constellation behind the page */}
      <div className="relative flex-1 isolate">
        <PortalBackground />
        <PortalConstellation />
        <main className="container py-6 sm:py-8 relative z-10">
          <script
            id="affiliate-data"
            type="application/json"
            dangerouslySetInnerHTML={{ __html: safeJsonForScript({
              id: a.id, name: a.name, email: a.email, company: a.company, website: a.website,
              referralCode: a.referral_code, status: a.status, paypalEmail: a.paypal_email,
              totalClicks: a.total_clicks, totalConversions: a.total_conversions,
              totalEarnedCents: a.total_earned_cents, totalPaidCents: a.total_paid_cents,
              commissionRate: a.commission_rate, createdAt: a.created_at,
            }) }}
          />
          {children}
        </main>
      </div>

      {/* Footer — mirrors PortalFooter */}
      <footer className="relative border-t border-white/60 bg-gradient-to-r from-white/70 to-[var(--color-accent)]/5 backdrop-blur-md mt-auto">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent" />
        <div className="container py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              Need help?{' '}
              <a href="mailto:stratalanding@gmail.com" className="text-[var(--color-accent)] font-medium hover:underline">stratalanding@gmail.com</a>
            </p>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#0891B2] opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0891B2]" />
              </span>
              <span>StrataLanding Partner Portal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
