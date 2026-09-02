import 'server-only';

import { verifyProposalToken } from '@/lib/proposal-token';
import { verifyAdmin } from '@/lib/admin-auth';
import { getServerUser } from '@/lib/auth-server';

/**
 * SERVER-ONLY half of the proposal payment helpers.
 *
 * Kept apart from `proposal-payment.ts` deliberately: that module is imported by the client
 * component that drives the capture (CaptureAndConfirm), and this one reaches node `crypto`,
 * `next/headers` and the Postgres pool. Merging them drags `postgres` into the browser bundle and
 * the build fails.
 */

/**
 * The same three-way gate the proposal page itself uses (audit F53): a valid signed token from the
 * proposal email, an authenticated admin, or the logged-in client who owns the proposal.
 *
 * The prospect paying a deposit arrives from an emailed link and is NOT logged in, so a
 * session-only check would lock out the primary revenue path — hence the token branch.
 */
export async function isProposalCallerAuthorized(
  proposalId: string,
  clientEmail: string | null | undefined,
  token: string | null | undefined,
): Promise<boolean> {
  if (verifyProposalToken(proposalId, token)) return true;
  if (await verifyAdmin()) return true;
  const { user } = await getServerUser();
  return !!(
    user?.email && String(clientEmail || '').toLowerCase() === user.email.toLowerCase()
  );
}
