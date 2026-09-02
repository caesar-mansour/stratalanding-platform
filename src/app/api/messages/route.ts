import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import { getClientFacingStatus } from '@/lib/admin-status';
import {
  classifyMessage,
  getRevisionStatus,
  checkUnlimitedExpiry,
  autoCreateRevisionRound,
  createTaskFromMessage,
  createMistakeFromMessage,
  isFollowUpToRevision,
  isFollowUpToMistake,
} from '@/lib/ai-chat';
import type { Project } from '@/lib/types';
import { isChatUnlocked } from '@/lib/chat-access';

// Auto-reply messages based on admin status
const AUTO_REPLY_MESSAGES = {
  busy: "Hey! 👋 Our team is currently busy working on other projects, but we've received your message and will get back to you as soon as we're free. Thanks for your patience!",
  offline: "Thanks for reaching out! 🌙 Our team is currently offline. We'll review your message and respond as soon as we're back online. Hang tight!",
};

// GET - Fetch messages for a project (client side)
export async function GET() {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = user.email;

    // Get client first
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${userEmail} LIMIT 1
    `;

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get latest project for this client
    const [project] = await sql`
      SELECT id, status, source, preview_approved_at FROM projects
      WHERE client_id = ${client.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if chat is unlocked (paid status OR approved phone-outreach lead)
    const chatUnlocked = isChatUnlocked(project as { status?: string; source?: string | null; preview_approved_at?: string | null });

    // Get messages
    const messages = await sql`
      SELECT * FROM revision_messages
      WHERE project_id = ${project.id}
      ORDER BY created_at ASC
    `;

    // Normalize attachments (may be string if column type is TEXT)
    const normalized = (messages || []).map((m: Record<string, unknown>) => {
      let parsed = null;
      if (typeof m.attachments === 'string') {
        try { parsed = JSON.parse(m.attachments); } catch { /* ignore malformed */ }
      } else {
        parsed = m.attachments ?? null;
      }
      return { ...m, attachments: parsed };
    });

    return NextResponse.json({
      messages: normalized,
      chatUnlocked,
      projectId: project.id,
      projectStatus: project.status,
    });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a new message (client side)
export async function POST(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = user.email;

    const body = await request.json();
    const { message, projectId, attachments, aiEnabled } = body;

    if (!message?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 });
    }

    // Input length validation
    if (typeof message === 'string' && message.length > 10000) {
      return NextResponse.json({ error: 'Message is too long (max 10,000 characters)' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Validate attachments if provided
    if (attachments) {
      if (!Array.isArray(attachments) || attachments.length > 10) {
        return NextResponse.json({ error: 'Max 10 attachments allowed' }, { status: 400 });
      }
      for (const att of attachments) {
        if (!att || typeof att.url !== 'string' || typeof att.name !== 'string') {
          return NextResponse.json({ error: 'Invalid attachment format' }, { status: 400 });
        }
        if (att.name.length > 255) {
          return NextResponse.json({ error: 'Attachment name too long' }, { status: 400 });
        }
        // SECURITY (audit F31/F64): only relative or http(s) attachment URLs — a stored
        // "javascript:" URL would execute as an <a href> in the client AND admin chat views.
        if (att.url.length > 2048 || !(att.url.startsWith('/') || /^https?:\/\//i.test(att.url))) {
          return NextResponse.json({ error: 'Invalid attachment URL' }, { status: 400 });
        }
      }
    }

    // Get client
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${userEmail} LIMIT 1
    `;

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get project (need package + launched_at for revision tracking)
    const [project] = await sql`
      SELECT * FROM projects WHERE id = ${projectId} LIMIT 1
    ` as unknown as [Project | undefined];

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.client_id !== client.id) {
      return NextResponse.json({ error: 'Project access denied' }, { status: 403 });
    }

    // Check if chat is unlocked (paid status OR approved phone-outreach lead)
    if (!isChatUnlocked(project)) {
      return NextResponse.json({ error: 'Chat not unlocked yet' }, { status: 403 });
    }

    // Insert message
    const attachmentsValue = attachments && attachments.length > 0
      ? JSON.stringify(attachments)
      : null;

    const [newMessage] = attachmentsValue
      ? await sql`
          INSERT INTO revision_messages (project_id, sender_type, message, attachments)
          VALUES (${projectId}, ${'client'}, ${message?.trim() || ''}, ${attachmentsValue}::jsonb)
          RETURNING *
        `
      : await sql`
          INSERT INTO revision_messages (project_id, sender_type, message)
          VALUES (${projectId}, ${'client'}, ${message?.trim() || ''})
          RETURNING *
        `;

    if (!newMessage) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Normalize attachments in returned message
    if (typeof newMessage.attachments === 'string') {
      try { newMessage.attachments = JSON.parse(newMessage.attachments); } catch { newMessage.attachments = null; }
    }

    // Classify message for revision tracking (runs on every client message)
    let revisionRound = null;
    let isMistakeReport = false;
    let mistakeDetailsCaptured = false;
    if (message?.trim()) {
      // Check if client is providing mistake details after AI asked
      const mistakeFollowUp = await isFollowUpToMistake(projectId);

      if (mistakeFollowUp) {
        // Client provided specific mistake details — NOW create the mistake entry
        mistakeDetailsCaptured = true;
        await createMistakeFromMessage(projectId, message.trim(), newMessage.id);
      } else {
        // Check if this is a follow-up to a recent change request
        const isFollowUp = await isFollowUpToRevision(projectId);

        if (!isFollowUp) {
          const classification = await classifyMessage(message.trim());

          if (classification === 'change') {
            const revisionStatus = await getRevisionStatus(projectId, project.package);
            const unlimitedExpiry = checkUnlimitedExpiry(project);

            if (revisionStatus.isUnlimited && unlimitedExpiry.expired) {
              // Unlimited window expired — don't create revision, AI will inform
            } else if (revisionStatus.hasRevisionsLeft) {
              // Auto-create revision round marker
              revisionRound = await autoCreateRevisionRound(projectId, revisionStatus.used + 1);
            }
            // If no revisions left (starter plan), AI will inform client

            // Create task for admin regardless of revision status
            await createTaskFromMessage(projectId, message.trim(), newMessage.id);
          } else if (classification === 'mistake') {
            // Client mentioned a mistake vaguely — DON'T create entry yet, AI will ask for details
            isMistakeReport = true;
          }
        }
      }
    }

    // Check if we should send an auto-reply (team busy or offline)
    // Skip auto-reply when AI is enabled — AI handles responses instead
    let autoReply = null;
    const teamStatus = getClientFacingStatus();

    if (!aiEnabled && (teamStatus === 'busy' || teamStatus === 'offline')) {
      // Only auto-reply if the last admin message wasn't already an auto-reply
      // This prevents spamming — one auto-reply until admin manually responds
      const [lastAdminMsg] = await sql`
        SELECT message FROM revision_messages
        WHERE project_id = ${projectId} AND sender_type = 'admin'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const isLastMsgAutoReply = lastAdminMsg && (
        lastAdminMsg.message === AUTO_REPLY_MESSAGES.busy ||
        lastAdminMsg.message === AUTO_REPLY_MESSAGES.offline
      );

      if (!isLastMsgAutoReply) {
        const replyText = AUTO_REPLY_MESSAGES[teamStatus];
        const [replyMsg] = await sql`
          INSERT INTO revision_messages (project_id, sender_type, message)
          VALUES (${projectId}, ${'admin'}, ${replyText})
          RETURNING *
        `;
        autoReply = replyMsg || null;
      }
    }

    return NextResponse.json({ message: newMessage, autoReply, revisionRound, isMistakeReport, mistakeDetailsCaptured });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Edit a message (client can only edit their own)
export async function PUT(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = user.email;

    const { messageId, message } = await request.json();

    if (!messageId || !message?.trim()) {
      return NextResponse.json({ error: 'Message ID and content required' }, { status: 400 });
    }

    // Get client
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${userEmail} LIMIT 1
    `;

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get message and verify ownership via JOIN
    const [existingMessage] = await sql`
      SELECT rm.*, p.client_id
      FROM revision_messages rm
      INNER JOIN projects p ON p.id = rm.project_id
      WHERE rm.id = ${messageId}
    `;

    if (!existingMessage || existingMessage.client_id !== client.id) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Client can only edit their own messages
    if (existingMessage.sender_type !== 'client') {
      return NextResponse.json({ error: 'Cannot edit this message' }, { status: 403 });
    }

    // Update message
    const [updated] = await sql`
      UPDATE revision_messages
      SET message = ${message.trim()}
      WHERE id = ${messageId}
      RETURNING *
    `;

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('Messages PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a message (client can only delete their own)
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = user.email;

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Get client
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${userEmail} LIMIT 1
    `;

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get message and verify ownership via JOIN
    const [existingMessage] = await sql`
      SELECT rm.*, p.client_id
      FROM revision_messages rm
      INNER JOIN projects p ON p.id = rm.project_id
      WHERE rm.id = ${messageId}
    `;

    if (!existingMessage || existingMessage.client_id !== client.id) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Client can only delete their own messages
    if (existingMessage.sender_type !== 'client') {
      return NextResponse.json({ error: 'Cannot delete this message' }, { status: 403 });
    }

    // Delete message
    await sql`
      DELETE FROM revision_messages WHERE id = ${messageId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Messages DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
