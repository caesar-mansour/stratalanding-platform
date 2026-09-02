import sql from '@/lib/db';
import Link from 'next/link';
import ProposalList from './ProposalList';
import AdminContent from '../AdminContent';
import type { Proposal } from '@/lib/types';
import { requireAdminPage } from '@/lib/admin-page-guard';

export default async function AdminProposalsPage() {
  // Verify admin access
  await requireAdminPage();
  let proposals: Proposal[] = [];
  let fetchError: Error | null = null;

  try {
    const rows = await sql`
      SELECT * FROM proposals ORDER BY created_at DESC
    `;
    proposals = rows as unknown as Proposal[];
  } catch (err) {
    console.error('Failed to fetch proposals:', err);
    const errMsg = String(err);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      proposals = [];
    } else {
      fetchError = err instanceof Error ? err : new Error('Failed to fetch proposals');
    }
  }

  return (
    <AdminContent
      title="Proposals"
      description="Create and manage client proposals."
      actions={
        <Link
          href="/admin/proposals/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Proposal
        </Link>
      }
    >
      {fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load proposals. Please refresh the page.
        </div>
      ) : (
        <ProposalList proposals={proposals} />
      )}
    </AdminContent>
  );
}
