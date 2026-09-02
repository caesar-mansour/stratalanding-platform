import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';

// Mapping of client quick replies to automated admin responses
const autoReplies: Record<string, string> = {
  "Hi! I'm excited to get started \u{1F44B}": "Hey there! \u{1F44B} Welcome aboard! I'm excited to work on your project too. I've received your brief and will start reviewing it shortly. Feel free to ask any questions!",
  "I have some feedback on the design": "Great! I'd love to hear your feedback. Please share your thoughts and I'll make sure to incorporate your suggestions in the next revision.",
  "When can I expect the first draft?": "You can expect the first draft within 3-5 business days. I'll keep you updated on the progress and let you know as soon as it's ready for review!",
  "What files do you need from me?": "For your landing page, I'll need your logo (preferably SVG or PNG), brand colors, any product images or screenshots, and copy/text content. You can upload everything in the Uploads section of your portal. If you have a brand guide, that's helpful too!",
};

// POST - Send automated reply after client quick reply
export async function POST(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientMessage, projectId } = await request.json();

    if (!clientMessage || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if this client message has an auto-reply
    const autoReply = autoReplies[clientMessage];
    if (!autoReply) {
      return NextResponse.json({ message: null }); // No auto-reply for this message
    }

    // SECURITY (audit F42): the caller must OWN the project — otherwise any logged-in
    // client could inject a fake "admin" message into another client's chat.
    const [client] = await sql`SELECT id FROM clients WHERE email = ${user.email} LIMIT 1`;
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [project] = await sql`
      SELECT id, status, client_id FROM projects WHERE id = ${projectId} LIMIT 1
    `;

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.client_id !== client.id) {
      return NextResponse.json({ error: 'Project access denied' }, { status: 403 });
    }

    const unlockedStatuses = ['deposit_paid', 'in_production', 'ready_for_final_payment', 'paid_in_full', 'launched'];
    if (!unlockedStatuses.includes(project.status)) {
      return NextResponse.json({ error: 'Chat not unlocked' }, { status: 403 });
    }

    // Insert automated admin reply (with small delay to appear after client message)
    const [newMessage] = await sql`
      INSERT INTO revision_messages (project_id, sender_type, message)
      VALUES (${projectId}, ${'admin'}, ${autoReply})
      RETURNING *
    `;

    if (!newMessage) {
      return NextResponse.json({ error: 'Failed to send auto-reply' }, { status: 500 });
    }

    return NextResponse.json({ message: newMessage });
  } catch (error) {
    console.error('Auto-reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
