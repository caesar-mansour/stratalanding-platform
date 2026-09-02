import sql from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Proposal } from '@/lib/types';
import { verifyProposalToken } from '@/lib/proposal-token';
import { verifyAdmin } from '@/lib/admin-auth';
import { getServerUser } from '@/lib/auth-server';
import ProposalView from './ProposalView';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

// COST (Neon) + CORRECTNESS: `proposals.id` is a uuid column, so a crawler hitting /proposal/<junk>
// sent the garbage straight to Postgres — a database wake-up AND an "invalid input syntax for uuid"
// throw, i.e. a 500 where a 404 belongs. Nothing that fails this test can match a row, so reject it
// before opening a connection.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProposalPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t } = await searchParams;

  if (!UUID_RE.test(id)) notFound();

  // Fetch proposal
  const [proposal] = await sql`
    SELECT * FROM proposals WHERE id = ${id} LIMIT 1
  `;

  if (!proposal) {
    notFound();
  }

  // SECURITY (audit F53): this page used to render PII + pricing to anyone who had/guessed the
  // UUID, with no auth. Now it requires ONE of: a valid signed token from the proposal email,
  // an authenticated admin, or the logged-in client who owns it. Otherwise 404 (don't even
  // confirm the id exists).
  const tokenOk = verifyProposalToken(id, t);
  let allowed = tokenOk;
  if (!allowed && (await verifyAdmin())) allowed = true;
  if (!allowed) {
    const { user } = await getServerUser();
    if (user?.email && String(proposal.client_email || '').toLowerCase() === user.email.toLowerCase()) {
      allowed = true;
    }
  }
  if (!allowed) {
    notFound();
  }

  // Mark as viewed only on a legitimately-tokened prospect view (not admin/owner previews) so the
  // "viewed" signal can't be forged by guessing the id.
  if (!proposal.viewed_at && tokenOk) {
    await sql`
      UPDATE proposals
      SET viewed_at = ${new Date().toISOString()},
          status = ${proposal.status === 'sent' ? 'viewed' : proposal.status}
      WHERE id = ${id}
    `;
  }

  return <ProposalView proposal={proposal as unknown as Proposal} />;
}
