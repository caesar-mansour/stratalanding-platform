import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';
import { logAudit } from '@/lib/audit';
import { isChatUnlocked } from '@/lib/chat-access';

// GET - Fetch all projects with messages (admin side)
// AUDIT 2026-08-12 (Phase 6): these were `Record<string, any>`, which the updated eslint config
// now (correctly) rejects. Typed narrowly instead of suppressing the rule — `id` is what the
// query below interpolates, and `attachments` is what the normalisation touches.
interface ProjectRow { id: string; [key: string]: unknown }
interface MessageRow { attachments?: unknown; [key: string]: unknown }

export async function GET() {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusArray = ['deposit_paid', 'in_production', 'ready_for_final_payment', 'paid_in_full', 'launched'];

    // Get all projects that have chat unlocked (after first deposit payment)
    const projects = await sql<ProjectRow[]>`
      SELECT p.id, p.status, p.package, p.launched_at, p.updated_at, p.source, p.preview_approved_at,
             row_to_json(c.*) as clients,
             COALESCE(json_agg(bs.*) FILTER (WHERE bs.id IS NOT NULL), '[]') as brief_submissions
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = p.id
      WHERE p.status = ANY(${statusArray})
         OR (p.source = 'phone' AND p.preview_approved_at IS NOT NULL)
      GROUP BY p.id, c.id
      ORDER BY p.updated_at DESC
    `;

    // Get messages for each project
    const projectsWithMessages = await Promise.all(
      (projects || []).map(async (project: ProjectRow) => {
        const messages = await sql`
          SELECT * FROM revision_messages
          WHERE project_id = ${project.id}
          ORDER BY created_at ASC
        `;

        // Normalize attachments (may be string if column type is TEXT)
        const messageList: MessageRow[] = (messages || []).map((m: MessageRow) => ({
          ...m,
          attachments: typeof m.attachments === 'string'
            ? (() => { try { return JSON.parse(m.attachments); } catch { return null; } })()
            : m.attachments ?? null,
        }));
        let hasUnread = false;
        if (messageList.length > 0) {
          const lastMessage = messageList[messageList.length - 1];
          hasUnread = lastMessage.sender_type === 'client';
        }

        return {
          ...project,
          messages: messageList,
          hasUnread,
          messageCount: messageList.length,
        };
      })
    );

    return NextResponse.json({ projects: projectsWithMessages });
  } catch (error) {
    console.error('Admin messages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a message as admin
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, projectId, attachments } = await request.json();

    if ((!message?.trim() && (!attachments || attachments.length === 0)) || !projectId) {
      return NextResponse.json({ error: 'Message or attachment and projectId are required' }, { status: 400 });
    }

    // Verify project exists and chat is unlocked (paid status OR approved phone-outreach lead)
    const [project] = await sql`
      SELECT id, status, source, preview_approved_at FROM projects WHERE id = ${projectId} LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!isChatUnlocked(project as { status?: string; source?: string | null; preview_approved_at?: string | null })) {
      return NextResponse.json({ error: 'Chat not available for this project' }, { status: 403 });
    }

    // Insert message
    const attachmentsValue = attachments && attachments.length > 0
      ? JSON.stringify(attachments)
      : null;

    const [newMessage] = attachmentsValue
      ? await sql`
          INSERT INTO revision_messages (project_id, sender_type, message, attachments)
          VALUES (${projectId}, ${'admin'}, ${message?.trim() || ''}, ${attachmentsValue}::jsonb)
          RETURNING *
        `
      : await sql`
          INSERT INTO revision_messages (project_id, sender_type, message)
          VALUES (${projectId}, ${'admin'}, ${message?.trim() || ''})
          RETURNING *
        `;

    if (!newMessage) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Normalize attachments
    if (typeof newMessage.attachments === 'string') {
      try { newMessage.attachments = JSON.parse(newMessage.attachments); } catch { newMessage.attachments = null; }
    }

    logAudit({ action: 'message.send', entityType: 'message', entityId: newMessage.id, details: { projectId } });

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('Admin messages POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Edit any message (admin)
export async function PUT(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, message } = await request.json();

    if (!messageId || !message?.trim()) {
      return NextResponse.json({ error: 'Message ID and content required' }, { status: 400 });
    }

    // Update message (admin can edit any message)
    const [updated] = await sql`
      UPDATE revision_messages
      SET message = ${message.trim()}
      WHERE id = ${messageId}
      RETURNING *
    `;

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    logAudit({ action: 'message.edit', entityType: 'message', entityId: messageId, details: { message: message.trim().slice(0, 100) } });

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('Admin messages PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete any message (admin)
export async function DELETE(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Delete message (admin can delete any message)
    await sql`
      DELETE FROM revision_messages WHERE id = ${messageId}
    `;

    logAudit({ action: 'message.delete', entityType: 'message', entityId: messageId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin messages DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
