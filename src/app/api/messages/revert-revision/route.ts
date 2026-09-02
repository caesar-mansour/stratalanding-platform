import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import { revertLastRevisionRound } from '@/lib/ai-chat';

// POST — Revert (undo) the most recent revision round for a project
export async function POST(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Verify client owns this project
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${user.email} LIMIT 1
    `;
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [project] = await sql`
      SELECT id FROM projects WHERE id = ${projectId} AND client_id = ${client.id} LIMIT 1
    `;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const reverted = await revertLastRevisionRound(projectId);
    if (!reverted) {
      return NextResponse.json({ error: 'No revision round to revert' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revert revision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
