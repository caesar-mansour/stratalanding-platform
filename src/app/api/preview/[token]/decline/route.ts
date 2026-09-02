import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { hashToken } from '@/lib/auth/tokens';
import { sendBriefNotificationToAdmin } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Prospect said "not for me" (after preview) or "just exploring" (declined the proposal step).
// Soft-closes the link; if a project already exists, marks it not_interested.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const ip = getClientIp(request);
    const { allowed } = rateLimit(`preview-decline:${ip}`, { max: 20, windowSeconds: 3600 });
    if (!allowed) return NextResponse.json({ success: true }); // graceful

    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason === 'exploring' ? 'exploring' : 'not_for_me';
    const email = body.email ? String(body.email).toLowerCase().trim() : null;
    const message = body.message ? String(body.message).slice(0, 2000) : '';

    const tokenHash = hashToken(token);
    const [link] = await sql`SELECT * FROM preview_links WHERE token_hash = ${tokenHash} LIMIT 1`;
    if (!link) return NextResponse.json({ success: true }); // graceful, no enumeration

    // If the link was minted for a known contact, only that address may change its state
    // (a token holder shouldn't be able to sabotage it). Never override a real approval.
    const linkEmail = link.contact_email ? String(link.contact_email).toLowerCase() : null;
    const emailMatches = !linkEmail || !email || email === linkEmail;
    if (link.status !== 'approved' && emailMatches) {
      await sql`UPDATE preview_links SET status = ${reason === 'exploring' ? 'exploring' : 'declined'},
                contact_email = COALESCE(${email || null}, contact_email) WHERE id = ${link.id}`;
      if (link.project_id && reason !== 'exploring') {
        await sql`UPDATE projects SET status = ${'not_interested'} WHERE id = ${link.project_id}`;
      }
    }

    sendBriefNotificationToAdmin({
      clientName: link.practice_name as string,
      clientEmail: email || (link.contact_email as string) || 'unknown',
      companyName: link.practice_name as string,
      industry: 'Dental (phone outreach)',
      packageType: (link.package as 'starter' | 'growth' | 'scale') || 'growth',
      notes: reason === 'exploring'
        ? `🟡 Looked at the preview, "just exploring" for now — keep warm, follow up.${message ? `\nNote: ${message}` : ''}`
        : `🔴 Declined the preview — not for them.${message ? `\nReason: ${message}` : ''}`,
      projectId: (link.project_id as string) || 'n/a',
    }).catch((e) => console.error('admin notify failed', e));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('preview decline error:', error);
    return NextResponse.json({ success: true }); // never block the prospect
  }
}
