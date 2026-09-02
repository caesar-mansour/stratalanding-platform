import sql from '@/lib/db';
import BannedEmailsList from './BannedEmailsList';
import AdminContent from '../AdminContent';
import { requireAdminPage } from '@/lib/admin-page-guard';

interface BannedEmail {
  id: string;
  email: string;
  reason: string | null;
  created_at: string;
}

export default async function AdminSettingsPage() {
  // Verify admin access
  await requireAdminPage();
  let bannedEmails: BannedEmail[] = [];
  let fetchError: Error | null = null;

  try {
    const rows = await sql`
      SELECT * FROM banned_emails ORDER BY created_at DESC
    `;
    bannedEmails = rows as unknown as BannedEmail[];
  } catch (err) {
    console.error('Failed to fetch banned emails:', err);
    // Treat missing table as recoverable - show empty list
    const errMsg = String(err);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      bannedEmails = [];
    } else {
      fetchError = err instanceof Error ? err : new Error('Failed to fetch banned emails');
    }
  }

  return (
    <AdminContent
      title="Settings"
      description="Manage system settings and banned emails."
    >
      {/* Banned Emails Section */}
      <div className="bg-surface rounded-[var(--radius-lg)] border border-border overflow-hidden shadow-[var(--shadow-sm)]">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Banned Emails</h3>
          <p className="text-sm text-text-muted mt-1">
            Emails that are blocked from receiving system notifications.
          </p>
        </div>

        {fetchError ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-[var(--radius-md)] p-4 text-red-700">
              Failed to load banned emails. Please refresh the page.
            </div>
          </div>
        ) : (
          <BannedEmailsList emails={bannedEmails} />
        )}
      </div>
    </AdminContent>
  );
}
