import sql from '@/lib/db';
import { cookies } from 'next/headers';
import Link from 'next/link';
import AdminContent from '../AdminContent';
import { requireAdminPage } from '@/lib/admin-page-guard';

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Awaiting proposal', cls: 'bg-amber-100 text-amber-700' },
  proposal_sent: { label: 'Proposal sent', cls: 'bg-sky-100 text-sky-700' },
  deposit_paid: { label: 'Deposit paid', cls: 'bg-emerald-100 text-emerald-700' },
  in_production: { label: 'In production', cls: 'bg-emerald-100 text-emerald-700' },
  ready_for_final_payment: { label: 'Final review', cls: 'bg-emerald-100 text-emerald-700' },
  paid_in_full: { label: 'Paid in full', cls: 'bg-emerald-100 text-emerald-700' },
  launched: { label: 'Launched', cls: 'bg-emerald-100 text-emerald-700' },
  not_interested: { label: 'Passed', cls: 'bg-rose-100 text-rose-700' },
};
const PKG: Record<string, string> = { starter: 'Presence Page', growth: 'Lead Page', scale: 'Purchase Page' };

interface Row {
  id: string; status: string; package: string; preview_approved_at: string | null; created_at: string;
  client_name: string | null; client_email: string; company_name: string | null;
}

export default async function OutreachClientsPage() {
  const cookieStore = await cookies();
  await requireAdminPage();

  let rows: Row[] = [];
  let needsMigration = false;
  try {
    rows = (await sql`
      SELECT p.id, p.status, p.package, p.preview_approved_at, p.created_at,
             c.name AS client_name, c.email AS client_email, bs.company_name
      FROM projects p
      JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = p.id
      WHERE p.source = 'phone'
      ORDER BY p.created_at DESC
    `) as unknown as Row[];
  } catch (err) {
    const m = String(err);
    if (m.includes('does not exist') || m.includes('column')) needsMigration = true;
    else console.error('outreach-clients query error:', err);
  }

  const active = rows.filter((r) => r.status !== 'not_interested');

  return (
    <AdminContent
      title="Outreach Clients"
      description="Companies from cold-call outreach that approved their preview — your converted leads, in one place."
    >
      {needsMigration ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-700">
          Run migration <code className="bg-amber-500/20 px-1.5 py-0.5 rounded">041-phone-preview.sql</code> first (adds the <code>phone</code> source).
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-[var(--radius-lg)] p-10 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[hsl(var(--text-primary))] font-medium">No converted outreach clients yet.</p>
          <p className="text-sm text-[hsl(var(--text-muted))] mt-1">When a company approves their preview, they&apos;ll appear here automatically.</p>
          <Link href="/admin/preview-links" className="inline-block mt-4 text-sm font-semibold text-[hsl(var(--accent))] hover:opacity-80">Go to Phone Leads → generate a link</Link>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-[hsl(var(--text-muted))]">
            <span className="font-semibold text-[hsl(var(--text-primary))]">{active.length}</span> active client{active.length !== 1 ? 's' : ''} from cold outreach
          </div>
          <div className="bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[hsl(var(--border))] text-sm">
                <thead className="bg-[hsl(var(--background))]">
                  <tr className="text-left text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 font-medium">Practice</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Package</th>
                    <th className="px-5 py-3 font-medium">Approved</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {rows.map((r) => {
                    const st = STATUS[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={r.id} className="hover:bg-[hsl(var(--accent))]/[0.04] transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap font-medium text-[hsl(var(--text-primary))]">{r.company_name || r.client_name || '—'}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-[hsl(var(--text-muted))]">{r.client_email}</td>
                        <td className="px-5 py-4 whitespace-nowrap"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span></td>
                        <td className="px-5 py-4 whitespace-nowrap text-[hsl(var(--text-primary))]">{PKG[r.package] || r.package}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-[hsl(var(--text-muted))] text-xs">{r.preview_approved_at ? new Date(r.preview_approved_at).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <Link href={`/admin/projects/${r.id}`} className="text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] text-xs font-semibold">Open project →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminContent>
  );
}
