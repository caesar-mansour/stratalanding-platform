import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth-server';
import sql from '@/lib/db';

// GET - Load saved package customizations for the client's project
export async function GET() {
  try {
    // SECURITY (audit H1): getServerUser validates the session row (revocation), expiry, and the
    // authoritative AAL — enforcing MFA step-up on this data route, not just the page middleware.
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;

    const [client] = await sql`SELECT id FROM clients WHERE email = ${email} LIMIT 1`;
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [project] = await sql`
      SELECT id, package, package_customizations
      FROM projects
      WHERE client_id = ${client.id}
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ customizations: null, package: null });
    }

    return NextResponse.json({
      customizations: project.package_customizations,
      package: project.package,
    });
  } catch (error) {
    console.error('Portal package-customizations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save package customizations
export async function POST(request: NextRequest) {
  try {
    // SECURITY (audit H1): getServerUser validates the session row (revocation), expiry, and the
    // authoritative AAL — enforcing MFA step-up on this data route, not just the page middleware.
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;

    const [client] = await sql`SELECT id FROM clients WHERE email = ${email} LIMIT 1`;
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [project] = await sql`
      SELECT id, status FROM projects
      WHERE client_id = ${client.id}
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'No project found' }, { status: 404 });
    }

    // AUDIT 2026-08-12 (P0-6): scope is LOCKED once money has changed hands. This route had
    // ownership checks but no status guard, and the Package tab auto-saves on every toggle — so a
    // client could remove a paid-for add-on at deposit_paid / in_production /
    // ready_for_final_payment. create-order then recomputes the final payment from the NEW total
    // (total/2 rather than total − deposit_paid), so dropping a $750 add-on after the deposit
    // silently cut $375 that was never billed, and the already-paid receipt changed value.
    const EDITABLE_STATUSES = ['new', 'proposal_sent'];
    if (!EDITABLE_STATUSES.includes(String(project.status))) {
      return NextResponse.json(
        {
          error: 'Your package is locked while your project is in progress. Message us in the portal chat to change scope.',
          status: project.status,
        },
        { status: 409 },
      );
    }

    const body = await request.json();
    const { addOns, extraRounds, extendedSupport, totalEstimate } = body;

    // Validate inputs
    const validAddOns = ['copy', 'rush', 'photos', 'seo'];
    const validExtraRounds = ['none', 'rev-1', 'rev-5'];
    const validExtended = ['none', 'ext-1mo', 'ext-3mo', 'ext-6mo', 'ext-1yr'];

    if (!Array.isArray(addOns) || addOns.some((a: string) => !validAddOns.includes(a))) {
      return NextResponse.json({ error: 'Invalid add-ons' }, { status: 400 });
    }
    if (!validExtraRounds.includes(extraRounds)) {
      return NextResponse.json({ error: 'Invalid extra rounds selection' }, { status: 400 });
    }
    if (!validExtended.includes(extendedSupport)) {
      return NextResponse.json({ error: 'Invalid extended support selection' }, { status: 400 });
    }
    if (typeof totalEstimate !== 'number' || totalEstimate < 0) {
      return NextResponse.json({ error: 'Invalid total estimate' }, { status: 400 });
    }

    const customizations = {
      addOns,
      extraRounds,
      extendedSupport,
      totalEstimate,
      updatedAt: new Date().toISOString(),
    };

    await sql`
      UPDATE projects
      SET package_customizations = ${JSON.stringify(customizations)}::jsonb
      WHERE id = ${project.id}
    `;

    return NextResponse.json({ success: true, customizations });
  } catch (error) {
    console.error('Portal package-customizations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
