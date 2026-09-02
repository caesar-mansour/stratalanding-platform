import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { sendChecklistEmail } from '@/lib/email';
import { withProtection } from '@/lib/security/with-protection';

async function handler(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email is banned
    const [bannedEmail] = await sql`
      SELECT id FROM banned_emails WHERE email = ${normalizedEmail} LIMIT 1
    `;

    if (bannedEmail) {
      return NextResponse.json(
        { error: 'This email address is not allowed.' },
        { status: 403 }
      );
    }

    // Store the subscriber in a checklist_subscribers table
    try {
      await sql`
        INSERT INTO checklist_subscribers (email, subscribed_at)
        VALUES (${normalizedEmail}, ${new Date().toISOString()})
        ON CONFLICT (email) DO UPDATE SET subscribed_at = ${new Date().toISOString()}
      `;
    } catch (insertError) {
      console.error('Checklist subscriber insert error:', insertError);
      // Don't block the user -- still send the email even if DB insert fails
    }

    // Send the checklist email (non-blocking -- don't fail the request if email fails)
    let emailSent = false;
    try {
      const emailResult = await sendChecklistEmail({ email: normalizedEmail });
      emailSent = emailResult.success;
      if (!emailResult.success) {
        console.error('Checklist email send failed:', emailResult.error);
      }
    } catch (emailErr) {
      console.error('Checklist email threw:', emailErr);
    }

    // Notify admin in the background -- don't await or block
    sendChecklistEmail({ email: normalizedEmail, notifyAdmin: true }).catch((err) =>
      console.log('Admin checklist notification failed:', err)
    );

    return NextResponse.json({ success: true, emailSent });
  } catch (error) {
    console.error('Checklist API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// SECURITY (audit M7): this unauthenticated endpoint emails an attacker-supplied address (and
// notifies the admin) with NO throttle — an outbound-email/spam-amplification vector. Wrap it in
// the standard protection (durable per-IP rate limit + CSRF/Origin guard), matching /contact etc.
export const POST = withProtection(handler, {
  name: 'checklist',
  rateLimit: { max: 3, windowSeconds: 3600 },
});
