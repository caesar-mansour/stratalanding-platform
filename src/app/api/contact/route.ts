import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-transport';
import { escapeHtml, escapeHtmlWithLineBreaks } from '@/lib/html-utils';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimitDurable } from '@/lib/security/rate-limit-durable';
import { looksLikeSpam, isValidEmail } from '@/lib/form-guards';

export async function POST(request: Request) {
  try {
    // Rate limit: 3 per IP per hour
    const ip = getClientIp(request);
    const { allowed } = await rateLimitDurable(`contact:ip:${ip}`, { max: 3, windowSeconds: 3600 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const { name, email, message } = body;

    // AUDIT 2026-08-12 (P2): silent spam drop. Respond like a success so a bot operator gets no
    // signal to tune against; nothing is sent and nothing is stored.
    if (looksLikeSpam(body)) {
      return NextResponse.json({ success: true });
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Input length validation
    if (typeof name !== 'string' || name.length > 200) {
      return NextResponse.json({ error: 'Name is too long (max 200 characters)' }, { status: 400 });
    }
    if (typeof email !== 'string' || email.length > 320) {
      return NextResponse.json({ error: 'Email is too long' }, { status: 400 });
    }
    if (typeof message !== 'string' || message.length > 5000) {
      return NextResponse.json({ error: 'Message is too long (max 5,000 characters)' }, { status: 400 });
    }

    // AUDIT 2026-08-12 (P2): contact had length caps but NO email format check, unlike /brief —
    // so a submission with an unreachable address was accepted and the lead was unreplyable.
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // AUDIT 2026-08-12 (P1 E-05): this was hardcoded to a literal address while every other lead
    // notification goes to ADMIN_EMAIL, so contact submissions could land in a different inbox
    // than briefs and quotes and quietly go unread.
    const result = await sendEmail({
      to: process.env.ADMIN_EMAIL || 'stratalanding@gmail.com',
      context: 'contact-form',
      subject: `Contact Form: ${escapeHtml(name)}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtmlWithLineBreaks(message)}</p>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
