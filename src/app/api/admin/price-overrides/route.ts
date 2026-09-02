import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';
import { createOverrideRequest, decideOverride } from '@/lib/price-override';
import type { PackageType, PackageCustomizations } from '@/lib/types';

// GET — list all overrides (optionally filtered by projectId or status)
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get('projectId');
  const status = request.nextUrl.searchParams.get('status');

  let rows;
  if (projectId) {
    rows = await sql`
      SELECT po.*, p.package, bs.company_name as project_name, c.name as client_name
      FROM price_overrides po
      LEFT JOIN projects p ON p.id = po.project_id
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = po.project_id
      WHERE po.project_id = ${projectId}
      ORDER BY po.created_at DESC
    `;
  } else if (status) {
    rows = await sql`
      SELECT po.*, p.package, bs.company_name as project_name, c.name as client_name
      FROM price_overrides po
      LEFT JOIN projects p ON p.id = po.project_id
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = po.project_id
      WHERE po.status = ${status}
      ORDER BY po.created_at DESC
    `;
  } else {
    rows = await sql`
      SELECT po.*, p.package, bs.company_name as project_name, c.name as client_name
      FROM price_overrides po
      LEFT JOIN projects p ON p.id = po.project_id
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = po.project_id
      ORDER BY po.created_at DESC
      LIMIT 100
    `;
  }

  return NextResponse.json({ overrides: [...rows] });
}

// POST — create a new price override
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId, overrideCents, reason, requestedBy } = await request.json();

    if (!projectId || !overrideCents || !requestedBy) {
      return NextResponse.json({ error: 'Missing projectId, overrideCents, or requestedBy' }, { status: 400 });
    }

    if (typeof overrideCents !== 'number' || overrideCents <= 0) {
      return NextResponse.json({ error: 'overrideCents must be a positive number' }, { status: 400 });
    }

    // Get project info for context
    const [project] = await sql`
      SELECT p.*, c.name as client_name, bs.company_name as project_name
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = p.id
      WHERE p.id = ${projectId}
      LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // SECURITY (audit F61): do NOT let the request body decide auto-approval. Auto-approval
    // previously fired when body `requestedBy === CEO_EMAIL`, so any admin-token holder could
    // self-approve an arbitrary price. Force a server-side, non-CEO label so every override
    // goes to 'pending' and must be approved via the CEO email link (or the admin PATCH).
    void requestedBy; // retained only for the presence check above
    const result = await createOverrideRequest(
      projectId,
      'admin-panel',
      overrideCents,
      reason || null,
      project.project_name || 'Unnamed Project',
      project.client_name || 'Unknown Client',
      project.package as PackageType,
      project.package_customizations as PackageCustomizations | null,
    );

    return NextResponse.json({
      success: true,
      overrideId: result.id,
      autoApproved: result.autoApproved,
      message: result.autoApproved
        ? 'Price override approved (CEO).'
        : 'Price override submitted. Approval email sent to CEO.',
    });
  } catch (error) {
    console.error('Create price override error:', error);
    return NextResponse.json({ error: 'Failed to create price override' }, { status: 500 });
  }
}

// PATCH — approve or reject an override (admin UI)
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { overrideId, action } = await request.json();

    if (!overrideId || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json({ error: 'Missing overrideId or invalid action' }, { status: 400 });
    }

    const success = await decideOverride(overrideId, action, 'admin');
    if (!success) {
      return NextResponse.json({ error: 'Override not found or already decided' }, { status: 404 });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Decide price override error:', error);
    return NextResponse.json({ error: 'Failed to process decision' }, { status: 500 });
  }
}
