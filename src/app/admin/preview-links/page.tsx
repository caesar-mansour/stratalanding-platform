import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import PreviewLinksDashboard from './PreviewLinksDashboard';
import companies from '@/data/outreach-companies.json';
import { requireAdminPage } from '@/lib/admin-page-guard';

export interface OutreachCompany { slug: string; name: string; city: string; umbrellaUrl: string }

export interface PreviewLinkRow {
  id: string;
  practice_name: string;
  slug: string;
  preview_url: string;
  current_url: string | null;
  package: string;
  contact_email: string | null;
  status: string;
  project_id: string | null;
  measured: boolean;
  expires_at: string;
  created_at: string;
  // Engagement (migration 049) — how the lead interacted with the link they were sent.
  first_opened_at: string | null;
  last_seen_at: string | null;
  open_count: number;
  viewed_site_at: string | null;
  site_reached_at: string | null;
  gate_scroll_pct: number;
  site_scroll_pct: number;
  gate_seconds: number;
  site_seconds: number;
  last_stage: string | null;
  click_count: number;
  liked_at: string | null;
  followed_up_at: string | null;
  followup_count: number;
}

export default async function AdminPreviewLinksPage() {
  await requireAdminPage();
  let links: PreviewLinkRow[] = [];
  let needsMigration = false;
  try {
    const rows = await sql`
      SELECT id, practice_name, slug, preview_url, current_url, package, contact_email, status, project_id,
             (comparison IS NOT NULL) AS measured, expires_at, created_at,
             first_opened_at, last_seen_at, open_count, viewed_site_at, site_reached_at,
             gate_scroll_pct, site_scroll_pct, gate_seconds, site_seconds, last_stage,
             click_count, liked_at, followed_up_at, followup_count
      FROM preview_links
      ORDER BY created_at DESC
      LIMIT 300
    `;
    links = rows as unknown as PreviewLinkRow[];
  } catch (err) {
    const m = String(err);
    if (m.includes('does not exist') || m.includes('relation')) needsMigration = true;
    else console.error('Failed to fetch preview links:', err);
  }

  return (
    <AdminContent
      title="Phone Leads"
      description="Practices you called — mint their 'your preview' link, then track who viewed, approved, or passed."
    >
      {needsMigration ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-200">
          <p className="font-semibold mb-2">Database table not found</p>
          <p className="text-sm text-amber-200/70">
            Run migrations <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">041-phone-preview.sql</code> and{' '}
            <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">049-preview-tracking.sql</code> to create the <code>preview_links</code> table and its engagement tracking columns.
          </p>
        </div>
      ) : (
        <PreviewLinksDashboard initialLinks={links} companies={companies as OutreachCompany[]} />
      )}
    </AdminContent>
  );
}
