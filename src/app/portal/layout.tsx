import "./portal.css";
import { redirect } from 'next/navigation';
import { getServerUser, getClientWithProjects } from '@/lib/auth-server';
import sql from '@/lib/db';
import { getApprovedOverride } from '@/lib/price-override';
import PortalNav from './PortalNav';
import { PortalHeader } from './components/PortalHeader';
import { PortalFooter } from './components/PortalFooter';
import { PortalDataProvider, type PortalClient, type PortalProject, type PortalProposal, type PortalBrief } from './PortalDataContext';
import OnboardingGate from './OnboardingGate';
import AutoRefresh from '@/components/AutoRefresh';
import CredentialsModal from './components/CredentialsModal';
import PortalBackground from './components/PortalBackground';
import PortalConstellation from './components/PortalConstellation';
import { hashPassword, generatePassword } from '@/lib/auth/password';

// ROLLOUT 2026-08-12 (GATE 7): overrides the root layout's `index: true`. See admin/layout.tsx —
// netlify.toml's X-Robots-Tag rules do not reach Next.js-rendered routes.
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getServerUser();
  if (!user) {
    redirect('/login?redirectTo=/portal');
  }
  const userEmail = user.email || '';

  // First get client data (needed for brief query)
  const clientResult = await getClientWithProjects(userEmail);
  const { client, projects } = clientResult;

  // Phone-outreach leads are created passwordless (magic-link only). On their FIRST
  // portal entry, mint a password and surface it ONCE so they have durable credentials
  // to log back in (email + password), in addition to magic links.
  let issuedCredentials: { email: string; password: string } | null = null;
  const isPhoneLead = projects.some((p) => (p as { source?: string }).source === 'phone');
  if (isPhoneLead) {
    const [au] = await sql`SELECT id, password_hash, credentials_shown_at FROM auth_users WHERE id = ${user.id} LIMIT 1`;
    if (au && !au.password_hash && !au.credentials_shown_at) {
      const password = generatePassword();
      const password_hash = await hashPassword(password);
      await sql`UPDATE auth_users SET password_hash = ${password_hash}, email_verified = ${true}, credentials_shown_at = ${new Date().toISOString()} WHERE id = ${au.id}`;
      issuedCredentials = { email: userEmail, password };
    }
  }

  // Then fetch proposals, brief, onboarding status, template purchases, price override, and affiliate check in parallel
  const [proposals, brief, onboardingSession, templatePurchases, overrideCents, affiliateCheck] = await Promise.all([
    // AUDIT 2026-08-12 (P1 U-05): exclude DRAFT proposals. This fetched every proposal for the
    // client's email regardless of status, so a client could see an unreviewed draft - with full
    // pricing - hours before the studio intended to send it. A draft is internal until sent.
    sql`
      SELECT * FROM proposals
      WHERE client_email = ${userEmail} AND status <> 'draft'
      ORDER BY created_at DESC
    `,
    projects[0]
      ? sql`
          SELECT * FROM brief_submissions WHERE project_id = ${projects[0].id} LIMIT 1
        `.then(rows => rows[0] || null)
      : Promise.resolve(null),
    projects[0]
      ? sql`
          SELECT id, status, current_question FROM onboarding_sessions WHERE project_id = ${projects[0].id} LIMIT 1
        `.then(rows => rows[0] || null)
      : Promise.resolve(null),
    sql`SELECT id FROM template_purchases WHERE buyer_email = ${userEmail} LIMIT 1`.catch(() => []),
    projects[0] ? getApprovedOverride(projects[0].id) : Promise.resolve(null),
    sql`SELECT id FROM affiliates WHERE auth_user_id = ${user.id} LIMIT 1`.catch(() => []),
  ]);

  // Compute the set of portals this user actually has access to
  const roles: ('client' | 'templates' | 'partner')[] = [];
  if (client) roles.push('client');
  if (templatePurchases.length > 0) roles.push('templates');
  if ((Array.isArray(affiliateCheck) ? affiliateCheck.length : 0) > 0) roles.push('partner');

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#F8FAFC]">
      {/* AUDIT 2026-08-12 (P2 PF-02): was interval={2} — a full portal re-render (getServerUser +
          getClientWithProjects + a 6-way Promise.all of SQL) every 2 seconds, ~30x/min per logged-in
          client. AutoRefresh does gate on document.hidden and 120s idle, so this was bounded to
          active use, but 2s is far tighter than anything here needs: project status, milestones and
          messages change on human timescales. 30s keeps the portal feeling live at 1/15th the
          database load. Admin already uses 60. */}
      <AutoRefresh interval={30} />
      {/* Always mounted so the portal's AutoRefresh can't unmount it; it captures the
          one-time credentials on mount and shows them until the client dismisses. */}
      <CredentialsModal fresh={issuedCredentials} />
      {/* Header */}
      <PortalHeader email={userEmail} roles={roles} />

      {/* Main content with data context */}
      <PortalDataProvider data={{
        client: client as PortalClient | null,
        projects: projects as PortalProject[],
        userEmail,
        proposals: [...proposals] as PortalProposal[],
        brief: brief as PortalBrief | null,
        onboardingStatus: onboardingSession as { id: string; status: string; current_question: number } | null,
        hasTemplatePurchases: templatePurchases.length > 0,
        overrideCents,
      }}>
        {/* Navigation (inside provider so it can access onboarding status) */}
        <PortalNav />

        <OnboardingGate
          onboardingComplete={onboardingSession?.status === 'completed' || isPhoneLead}
          hasBrief={!!brief}
        >
          <div className="relative flex-1 isolate">
            <PortalBackground />
            <PortalConstellation />
            <main className="container py-8 relative z-10">
              {children}
            </main>
          </div>
        </OnboardingGate>
      </PortalDataProvider>

      {/* Footer */}
      <PortalFooter />
    </div>
  );
}
