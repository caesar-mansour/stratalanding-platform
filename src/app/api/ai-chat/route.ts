import { NextRequest } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import {
  getOpenAI,
  buildSystemPrompt,
  buildMessageHistory,
  shouldEscalate,
  ESCALATION_MESSAGE,
  checkDailyLimit,
  incrementUsage,
  saveAiMessage,
  getRevisionStatus,
  checkUnlimitedExpiry,
} from '@/lib/ai-chat';
import type { RevisionContext } from '@/lib/ai-chat';
import type { BriefSubmission, Project, Proposal } from '@/lib/types';
import { isChatUnlocked } from '@/lib/chat-access';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const { user } = await getServerUser();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, projectId, isChangeRequest, isMistakeReport, mistakeDetailsCaptured } = body;

    if (!message?.trim() || !projectId) {
      return Response.json({ error: 'Message and projectId are required' }, { status: 400 });
    }

    // 2. Verify client owns project
    const [client] = await sql`
      SELECT id FROM clients WHERE email = ${user.email} LIMIT 1
    `;
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    const [project] = await sql`
      SELECT * FROM projects WHERE id = ${projectId} AND client_id = ${client.id} LIMIT 1
    ` as unknown as [Project | undefined];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // 3. Check chat is unlocked (paid status OR approved phone-outreach lead)
    if (!isChatUnlocked(project)) {
      return Response.json({ error: 'Chat not unlocked' }, { status: 403 });
    }

    // 4. Rate limit check
    const { exceeded } = await checkDailyLimit(projectId);
    if (exceeded) {
      return Response.json({
        error: 'Daily AI chat limit reached. The team will respond to your messages directly.',
      }, { status: 429 });
    }

    // 5. Check for escalation
    if (shouldEscalate(message)) {
      const saved = await saveAiMessage(projectId, ESCALATION_MESSAGE);
      return Response.json({ message: saved, escalated: true });
    }

    // 6. Get revision status for AI context (classification + marker creation already handled in /api/messages)
    const revisionStatus = await getRevisionStatus(projectId, project.package);
    const unlimitedExpiry = checkUnlimitedExpiry(project);

    const revisionCtx: RevisionContext = {
      ...revisionStatus,
      unlimitedExpired: unlimitedExpiry.expired,
      daysRemaining: unlimitedExpiry.daysRemaining,
      isChangeRequest: !!isChangeRequest,
      revisionAutoCreated: !!isChangeRequest,
      isMistakeReport: !!isMistakeReport,
      mistakeDetailsCaptured: !!mistakeDetailsCaptured,
    };

    // 7. Load project context
    const [brief] = await sql`
      SELECT * FROM brief_submissions WHERE project_id = ${projectId} LIMIT 1
    ` as unknown as [BriefSubmission | undefined];

    // SECURITY (audit F76): scope to THIS project — not all of the client's proposals —
    // so a multi-project client's other projects' pricing/notes don't leak into the prompt.
    const proposals = await sql`
      SELECT * FROM proposals WHERE project_id = ${projectId}
      ORDER BY created_at DESC LIMIT 3
    ` as unknown as Proposal[];

    // 8. Build system prompt and message history
    const systemPrompt = buildSystemPrompt(project, brief || null, proposals, revisionCtx);

    const recentMessages = await sql`
      SELECT sender_type, message FROM revision_messages
      WHERE project_id = ${projectId}
      ORDER BY created_at ASC
    `;
    const history = buildMessageHistory(
      recentMessages as unknown as { sender_type: 'client' | 'admin' | 'ai'; message: string }[]
    );

    // 9. Stream response from OpenAI
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const maxTokens = 4096; // GPT-5 mini is a reasoning model — needs headroom for internal thinking + output

    const stream = await getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      max_completion_tokens: maxTokens,
      stream: true,
    });

    // 10. Create SSE stream
    let fullText = '';
    let totalTokens = 0;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`)
              );
            }
            if (chunk.usage) {
              totalTokens = chunk.usage.total_tokens;
            }
          }

          // Save completed AI message to DB
          const saved = await saveAiMessage(projectId, fullText);

          // Update usage tracking
          await incrementUsage(projectId, totalTokens || Math.ceil(fullText.length / 4));

          // Send final event with message ID
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: '', done: true, messageId: saved.id, created_at: saved.created_at })}\n\n`)
          );
          controller.close();
        } catch (err) {
          console.error('AI stream error:', err);
          // If streaming fails mid-way, save what we have
          if (fullText) {
            await saveAiMessage(projectId, fullText + '\n\n_(Response was interrupted)_');
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted', done: true })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
