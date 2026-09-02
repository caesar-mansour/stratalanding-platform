import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth-server';
import sql from '@/lib/db';
import { approvalMilestones } from '@/lib/types';

// GET - Get milestones for the client's project
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
      SELECT id FROM projects
      WHERE client_id = ${client.id}
      ORDER BY created_at DESC LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ milestones: [] });
    }

    const milestones = await sql`
      SELECT * FROM project_milestones
      WHERE project_id = ${project.id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('Portal milestones GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Client approves a milestone (wireframe_approved or final_review_approved)
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

    const body = await request.json();
    const { milestoneId } = body;

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId is required' }, { status: 400 });
    }

    // Verify the milestone belongs to the client's project and requires approval
    const [milestone] = await sql`
      SELECT pm.* FROM project_milestones pm
      INNER JOIN projects p ON p.id = pm.project_id
      WHERE pm.id = ${milestoneId}
        AND p.client_id = ${client.id}
        AND pm.requires_approval = true
      LIMIT 1
    `;

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found or not eligible for approval' }, { status: 404 });
    }

    if (!approvalMilestones.includes(milestone.milestone_type)) {
      return NextResponse.json({ error: 'This milestone does not require client approval' }, { status: 400 });
    }

    if (milestone.client_approved_at) {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 });
    }

    // Approve the milestone
    const [updated] = await sql`
      UPDATE project_milestones
      SET status = 'completed', client_approved_at = NOW(), completed_at = NOW()
      WHERE id = ${milestoneId}
      RETURNING *
    `;

    return NextResponse.json({ milestone: updated });
  } catch (error) {
    console.error('Portal milestones POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
