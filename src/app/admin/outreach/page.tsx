import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import OutreachDashboard from './OutreachDashboard';
import { requireAdminPage } from '@/lib/admin-page-guard';

export interface OutreachCampaign {
  id: string;
  location: string;
  niche: string;
  platform: string;
  leads_extracted: number;
  emails_sent: number;
  replies: number;
  booked_calls: number;
  closed_deals: number;
  status: 'extracted' | 'sending' | 'sent' | 'follow_up' | 'completed';
  notes: string | null;
  extracted_at: string;
  first_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export default async function AdminOutreachPage() {
  await requireAdminPage();
  let campaigns: OutreachCampaign[] = [];
  let needsMigration = false;

  try {
    const rows = await sql`
      SELECT * FROM outreach_campaigns
      ORDER BY
        CASE status
          WHEN 'sending' THEN 0
          WHEN 'extracted' THEN 1
          WHEN 'follow_up' THEN 2
          WHEN 'sent' THEN 3
          WHEN 'completed' THEN 4
        END,
        created_at DESC
    `;
    campaigns = rows as unknown as OutreachCampaign[];
  } catch (err) {
    const errMsg = String(err);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      needsMigration = true;
    } else {
      console.error('Failed to fetch outreach campaigns:', err);
    }
  }

  return (
    <AdminContent
      title="Outreach Tracker"
      description="Track cold outreach campaigns by location and niche."
    >
      {needsMigration ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-200">
          <p className="font-semibold mb-2">Database table not found</p>
          <p className="text-sm text-amber-200/70">
            Run the migration file <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">outreach-campaigns-migration.sql</code> against your database to create the outreach_campaigns table.
          </p>
        </div>
      ) : (
        <OutreachDashboard initialCampaigns={campaigns} />
      )}
    </AdminContent>
  );
}
