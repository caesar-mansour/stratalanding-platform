import { NextRequest } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';
import type { BriefSubmission } from '@/lib/types';
import { packagePricing, type PackageType } from '@/lib/types';
import { sendProposalToClient } from '@/lib/email';
import { proposalPublicUrl } from '@/lib/proposal-token';
import {
  getOrCreateSession,
  saveOnboardingMessage,
  advanceQuestion,
  completeSession,
  generateOnboardingSummary,
  generateAllQuestions,
} from '@/lib/onboarding-ai';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';

// GET — Fetch onboarding status + messages (includes pre-generated questions)
export async function GET() {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [client] = await sql`SELECT id FROM clients WHERE email = ${user.email} LIMIT 1`;
    if (!client) return Response.json({ session: null, messages: [] });

    const [project] = await sql`SELECT id FROM projects WHERE client_id = ${client.id} ORDER BY created_at DESC LIMIT 1`;
    if (!project) return Response.json({ session: null, messages: [] });

    const [session] = await sql`
      SELECT * FROM onboarding_sessions WHERE project_id = ${project.id} LIMIT 1
    `;

    if (!session) {
      return Response.json({ session: null, messages: [], projectId: project.id });
    }

    const messages = await sql`
      SELECT * FROM onboarding_messages WHERE session_id = ${session.id}
      ORDER BY created_at ASC
    `;

    // Extract pre-generated questions from AI messages
    const questions = messages
      .filter((m: Record<string, unknown>) => m.role === 'ai' && m.question_number !== null)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.question_number as number) - (b.question_number as number))
      .map((m: Record<string, unknown>) => m.message as string);

    return Response.json({ session, messages, questions, projectId: project.id });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Two modes:
// 1. startSession: true → generate all 10 questions at once, return them
// 2. message: "text" → save client answer, advance question, check completion
export async function POST(request: NextRequest) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // AUDIT 2026-08-12 (P2): startSession generates ten questions via OpenAI and had NO rate
    // limit, so an authenticated client could regenerate them in a loop and bill the studio for
    // it. Keyed on the account rather than the IP — the spend follows the account, not the network.
    const { allowed: onboardingAllowed } = await rateLimitDurable(`onboarding:${user.email}`, {
      max: 40,
      windowSeconds: 3600,
    });
    if (!onboardingAllowed) {
      return Response.json(
        { error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { message, startSession } = body;

    const [client] = await sql`SELECT id FROM clients WHERE email = ${user.email} LIMIT 1`;
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const [project] = await sql`SELECT id FROM projects WHERE client_id = ${client.id} ORDER BY created_at DESC LIMIT 1`;
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const [brief] = await sql`
      SELECT * FROM brief_submissions WHERE project_id = ${project.id} LIMIT 1
    ` as unknown as [BriefSubmission | undefined];

    if (!brief) {
      return Response.json({ error: 'Brief not found. Please submit a brief first.' }, { status: 400 });
    }

    const session = await getOrCreateSession(project.id);

    if (session.status === 'completed') {
      return Response.json({ error: 'Onboarding already completed', completed: true }, { status: 400 });
    }

    // ─── MODE 1: Generate all 10 questions at once ───
    if (startSession) {
      const questions = await generateAllQuestions(brief);

      // Save all 10 AI messages to DB
      for (let i = 0; i < questions.length; i++) {
        await saveOnboardingMessage(session.id, 'ai', questions[i], i + 1);
      }

      return Response.json({ questions, sessionId: session.id });
    }

    // ─── MODE 2: Save client answer ───
    if (message?.trim()) {
      const trimmed = message.trim();

      // Save client answer
      await saveOnboardingMessage(session.id, 'client', trimmed, session.current_question);

      if (session.current_question >= 10) {
        // Mark as completed immediately (so OnboardingGate unlocks)
        await completeSession(session.id, 'Generating summary...');

        // Schedule or send draft proposal depending on how long ago the brief was submitted
        try {
          const [draftProposal] = await sql`
            SELECT p.*, pr.package FROM proposals p
            JOIN projects pr ON pr.id = p.project_id
            WHERE p.project_id = ${project.id} AND p.status = 'draft'
            LIMIT 1
          `;

          if (draftProposal) {
            const proposalAge = Date.now() - new Date(draftProposal.created_at).getTime();
            const threeHoursMs = 3 * 60 * 60 * 1000;

            if (proposalAge >= threeHoursMs) {
              // 3+ hours since brief — send immediately
              const newValidUntil = new Date();
              newValidUntil.setDate(newValidUntil.getDate() + 7);

              await sql`
                UPDATE proposals SET status = 'sent', valid_until = ${newValidUntil.toISOString()}
                WHERE id = ${draftProposal.id}
              `;
              await sql`
                UPDATE projects SET status = 'proposal_sent'
                WHERE id = ${project.id} AND status = 'new'
              `;

              const totalPrice = packagePricing[draftProposal.package as PackageType] / 100;
              await sendProposalToClient({
                clientName: draftProposal.client_name,
                clientEmail: draftProposal.client_email,
                companyName: draftProposal.company_name,
                packageType: draftProposal.package,
                totalPrice,
                depositAmount: totalPrice / 2,
                proposalId: draftProposal.id,
                validUntil: newValidUntil.toISOString(),
                notes: draftProposal.notes,
                depositPaymentUrl: proposalPublicUrl(draftProposal.id),
              });

              console.log(`Auto-sent proposal after onboarding completion (project: ${project.id})`); // audit F65: no PII
            } else {
              // Less than 3 hours — schedule for remaining time (3-5hr random from brief creation)
              const delayHours = 3 + Math.random() * 2;
              const sendAt = new Date(new Date(draftProposal.created_at).getTime() + delayHours * 60 * 60 * 1000);

              await sql`
                INSERT INTO scheduled_proposals (project_id, client_name, client_email, company_name, package, notes, send_at, status)
                VALUES (
                  ${project.id}, ${draftProposal.client_name}, ${draftProposal.client_email},
                  ${draftProposal.company_name}, ${draftProposal.package}, ${draftProposal.notes},
                  ${sendAt.toISOString()}, 'pending'
                )
              `;

              console.log(`Scheduled proposal at ${sendAt.toISOString()} (3-5hr from brief)`); // audit F65: no PII
            }
          }
        } catch (proposalErr) {
          console.error('Failed to handle proposal after onboarding:', proposalErr);
        }

        // Generate summary (may take a few seconds, but session is already completed)
        try {
          const summary = await generateOnboardingSummary(session.id);
          await sql`UPDATE onboarding_sessions SET summary = ${summary} WHERE id = ${session.id}`;
        } catch (err) {
          console.error('Summary generation error:', err);
        }

        return Response.json({ completed: true });
      } else {
        await advanceQuestion(session.id, session.current_question + 1);
        return Response.json({ success: true, nextQuestion: session.current_question + 1 });
      }
    }

    return Response.json({ error: 'Message is required' }, { status: 400 });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
