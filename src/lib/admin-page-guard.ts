import 'server-only';

import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/admin-auth';

/**
 * Gate an admin PAGE (server component). Redirects to the login screen when not authenticated.
 *
 * AUDIT 2026-08-12 (P1 A-01): 20 admin pages each hand-rolled this as
 *
 *     const adminToken = cookieStore.get('admin_token')?.value;
 *     if (!adminToken || adminToken !== process.env.ADMIN_ACCESS_TOKEN) redirect('/admin/login');
 *
 * Three problems with that shape, repeated 20 times:
 *   1. it compared the cookie directly to the master secret, so it kept working even after the
 *      session model changed — silently bypassing revocation and expiry;
 *   2. `!==` is not timing-safe, unlike the centralized helper;
 *   3. it skipped the IP allowlist that verifyAdmin() enforces.
 *
 * One call site now, so the policy lives in exactly one place.
 */
export async function requireAdminPage(): Promise<void> {
  if (!(await verifyAdmin())) {
    redirect('/admin/login');
  }
}
