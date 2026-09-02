import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { generateToken, hashToken, hmacToken } from '@/lib/auth/tokens';
import { sendMagicLinkEmail } from '@/lib/auth/emails';
import { sendBriefNotificationToAdmin } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { MAGIC_LINK_EXPIRY_MINUTES } from '@/lib/auth/constants';
import { packageLabels, type PackageType } from '@/lib/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const PORTAL_REDIRECT = '/portal/revisions';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Issue a one-tap login for `email`. INSTANT (return verifyUrl) only when allowInstant
// (email ownership already proven by the OTP code); otherwise EMAIL the link.
async function issueLogin(email: string, allowInstant: boolean): Promise<{ verifyUrl?: string; emailed?: boolean }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
  await sql`INSERT INTO auth_magic_links (email, token_hash, redirect_to, expires_at)
            VALUES (${email}, ${tokenHash}, ${PORTAL_REDIRECT}, ${expiresAt.toISOString()})`;
  if (allowInstant) {
    return { verifyUrl: `${SITE_URL}/api/auth/verify-magic-link?token=${token}&redirectTo=${encodeURIComponent(PORTAL_REDIRECT)}` };
  }
  await sendMagicLinkEmail(email, token, PORTAL_REDIRECT).catch((e) => console.error('magic email failed', e));
  return { emailed: true };
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const tokenHash = hashToken(token);

    const ip = getClientIp(request);
    if (!rateLimit(`preview-approve-ip:${ip}`, { max: 12, windowSeconds: 3600 }).allowed
      || !rateLimit(`preview-approve-tok:${tokenHash.slice(0, 24)}`, { max: 6, windowSeconds: 3600 }).allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').toLowerCase().trim();
    const message = body.message ? String(body.message).slice(0, 2000) : '';
    const code = String(body.code || '').trim();

    // All state changes happen under a row lock on the token, so concurrent
    // double-approves serialize and only one project is ever created.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = await sql.begin(async (tx: any) => {
      const [link] = await tx`SELECT * FROM preview_links WHERE token_hash = ${tokenHash} FOR UPDATE`;
      if (!link) return { kind: 'error', code: 404, msg: 'This preview link is invalid.' };
      if (new Date(link.expires_at) < new Date()) return { kind: 'error', code: 410, msg: 'This preview link has expired.' };

      // Already approved → idempotent: reuse the existing project, never create a second one
      if (link.status === 'approved' && link.project_id) {
        const [existing] = await tx`
          SELECT c.email FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = ${link.project_id} LIMIT 1`;
        return { kind: 'idempotent', email: (existing?.email as string) || (link.contact_email as string) || '' };
      }

      // Create path — validate email. Any address is accepted (pass-along: the office
      // forwards the link to the doctor) — the OTP below proves inbox ownership, and a
      // mismatch with the address on file is flagged in the admin notification.
      if (!EMAIL_RE.test(email)) return { kind: 'error', code: 400, msg: 'A valid email is required.' };
      const [banned] = await tx`SELECT id FROM banned_emails WHERE email = ${email} LIMIT 1`;
      if (banned) return { kind: 'error', code: 400, msg: 'Unable to process this request.' };

      // Confirm email ownership via the one-time code (proven on-site, no link/leaving).
      const [otp] = await tx`SELECT code_hash, expires_at, attempts FROM preview_otps WHERE email = ${email} LIMIT 1`;
      if (!otp) return { kind: 'error', code: 400, msg: 'Enter the code we emailed you.' };
      if (new Date(otp.expires_at) < new Date()) return { kind: 'error', code: 400, msg: 'That code expired — request a new one.' };
      if (otp.attempts >= 5) return { kind: 'error', code: 429, msg: 'Too many tries — request a new code.' };
      if (otp.code_hash !== hmacToken(`${token}:${code}`)) {
        await tx`UPDATE preview_otps SET attempts = attempts + 1 WHERE email = ${email}`;
        return { kind: 'error', code: 400, msg: 'That code is incorrect. Try again.' };
      }
      await tx`DELETE FROM preview_otps WHERE email = ${email}`; // single-use

      const pkg = (['starter', 'growth', 'scale'].includes(link.package) ? link.package : 'growth') as PackageType;
      const practiceName = link.practice_name as string;

      const [existingClient] = await tx`SELECT * FROM clients WHERE email = ${email} LIMIT 1`;
      const wasExistingClient = !!existingClient;
      let client = existingClient;
      if (!client) {
        const [newClient] = await tx`INSERT INTO clients (email, name) VALUES (${email}, ${practiceName}) RETURNING *`;
        if (!newClient) throw new Error('Client creation failed');
        client = newClient;
      }

      const siteId = 'proj_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const [project] = await tx`
        INSERT INTO projects (client_id, package, timeline, status, site_id, source, preview_approved_at)
        VALUES (${client.id}, ${pkg}, ${'no_rush'}, ${'new'}, ${siteId}, ${'phone'}, ${new Date().toISOString()})
        RETURNING *`;
      if (!project) throw new Error('Project creation failed');

      const briefNotes = `Phone-outreach lead — approved their spec preview and asked for a proposal.${message ? `\n\nWhat they want changed: ${message}` : ''}`;
      await tx`
        INSERT INTO brief_submissions (project_id, company_name, industry, primary_goal, audience, notes)
        VALUES (${project.id}, ${practiceName}, ${'Dental'}, ${'More new-patient bookings'}, ${'Local patients searching on mobile'}, ${briefNotes})`;

      await tx`INSERT INTO onboarding_sessions (project_id, status, current_question, completed_at)
               VALUES (${project.id}, ${'completed'}, ${10}, ${new Date().toISOString()})`;

      const welcome = `Hey ${practiceName} 👋 it's Caesar — so glad you liked it. I'll get your proposal over to your email shortly. In the meantime, drop your logo and a few photos in the Uploads tab and tell me anything you'd want changed — it all goes straight into your build. Talk soon!`;
      await tx`INSERT INTO revision_messages (project_id, sender_type, message) VALUES (${project.id}, ${'admin'}, ${welcome})`;

      await tx`UPDATE preview_links SET status = ${'approved'}, project_id = ${project.id}, contact_email = ${email},
               decision_email = ${email}, yes_at = COALESCE(yes_at, now()) WHERE id = ${link.id}`;

      const sentTo = (link.contact_email as string | null)?.toLowerCase() || '';
      return { kind: 'created', projectId: project.id, wasExistingClient, email, practiceName, pkg, sentTo };
    });

    if (r.kind === 'error') return NextResponse.json({ error: r.msg }, { status: r.code });

    if (r.kind === 'idempotent') {
      if (!r.email) return NextResponse.json({ success: true });
      const login = await issueLogin(r.email, false); // replay never instant-logs-in
      return NextResponse.json({ success: true, ...login });
    }

    // Created — milestones (non-blocking)
    try {
      const milestones = [
        { type: 'brief_received', requires_approval: false, done: true },
        { type: 'research_complete', requires_approval: false, done: false },
        { type: 'wireframe_sent', requires_approval: false, done: false },
        { type: 'wireframe_approved', requires_approval: true, done: false },
        { type: 'build_complete', requires_approval: false, done: false },
        { type: 'final_review_sent', requires_approval: false, done: false },
        { type: 'final_review_approved', requires_approval: true, done: false },
        { type: 'launched', requires_approval: false, done: false },
      ];
      for (const m of milestones) {
        await sql`INSERT INTO project_milestones (project_id, milestone_type, requires_approval, status, completed_at)
                  VALUES (${r.projectId}, ${m.type}, ${m.requires_approval}, ${m.done ? 'completed' : 'pending'}, ${m.done ? new Date().toISOString() : null})`;
      }
    } catch (e) { console.error('milestone seed failed (non-blocking)', e); }

    sendBriefNotificationToAdmin({
      clientName: r.practiceName,
      clientEmail: r.email,
      companyName: r.practiceName,
      industry: 'Dental (phone outreach)',
      packageType: r.pkg,
      notes: `✅ APPROVED their spec preview and wants a proposal (${packageLabels[r.pkg as PackageType]}). Craft + send it.${message ? `\nThey want changed: ${message}` : ''}${r.sentTo && r.sentTo !== r.email ? `\n⚠ Approved from a DIFFERENT address than the link was sent to (sent to: ${r.sentTo}).` : ''}`,
      projectId: r.projectId,
    }).catch((e) => console.error('admin notify failed', e));

    // Email ownership was just proven by the one-time code, so instant login is safe.
    const login = await issueLogin(r.email, true);
    return NextResponse.json({ success: true, ...login });
  } catch (error) {
    console.error('preview approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
