import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import { amountDueCents } from '@/lib/project-payment';
import type { PackageType, PackageCustomizations } from '@/lib/types';

/**
 * What the signed-in client is about to be charged, in cents.
 *
 * AUDIT 2026-08-12 (P2): the portal checkout page showed "Deposit (50%)" and "Step 1 of 2" but
 * NEVER the actual figure — the buyer clicked through to PayPal without seeing the amount anywhere
 * on our site. Asking someone to hand over $1,200-$4,800 without showing the number first is the
 * kind of thing that makes a careful buyer abandon, and it is the moment trust matters most.
 *
 * Reads the SAME amountDueCents() the order creation and capture validation use, so the number on
 * screen cannot drift from the number charged.
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId') || '';
    const paymentType = request.nextUrl.searchParams.get('type') === 'final' ? 'final' : 'deposit';

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(projectId)) {
      return NextResponse.json({ error: 'Invalid project' }, { status: 400 });
    }

    // Ownership: only the client who owns the project may read its balance.
    const [project] = await sql`
      SELECT p.id, p.package, p.package_customizations, c.email AS client_email
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      WHERE p.id = ${projectId}
      LIMIT 1
    `;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (String(project.client_email).toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { dueCents, totalCents, depositPaidCents } = await amountDueCents(
      project.id as string,
      project.package as PackageType,
      (project.package_customizations as PackageCustomizations | null) ?? null,
      paymentType,
    );

    return NextResponse.json({ dueCents, totalCents, depositPaidCents, currency: 'USD' });
  } catch (error) {
    console.error('amount-due error:', error);
    return NextResponse.json({ error: 'Could not load the amount due' }, { status: 500 });
  }
}
