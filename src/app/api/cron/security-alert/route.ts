import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { timingSafeCompare } from '@/lib/security/sanitize';
import { sendEmail } from '@/lib/email-transport';

// SECURITY (audit F27): alert on security_audit_log spikes (brute force / lockout storms) so an
// attack in progress is noticed instead of sitting silently in a log. Gated by CRON_SECRET,
// timing-safe, fail-closed. Schedule hourly in Netlify with: Authorization: Bearer $CRON_SECRET.
const LOGIN_FAILURE_THRESHOLD = 20; // failures/hour across the app
const LOCKOUT_THRESHOLD = 5;        // account lockouts/hour

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [row] = await sql`
      SELECT
        count(*) FILTER (WHERE event_type = 'login_failure')  AS login_failures,
        count(*) FILTER (WHERE event_type = 'account_lockout') AS lockouts,
        count(DISTINCT ip_address) FILTER (WHERE event_type = 'login_failure') AS distinct_ips
      FROM security_audit_log
      WHERE created_at > now() - interval '1 hour'
    `;

    const loginFailures = Number(row?.login_failures || 0);
    const lockouts = Number(row?.lockouts || 0);
    const distinctIps = Number(row?.distinct_ips || 0);
    const spike = loginFailures >= LOGIN_FAILURE_THRESHOLD || lockouts >= LOCKOUT_THRESHOLD;

    if (spike) {
      const adminEmail = process.env.ADMIN_EMAIL || 'stratalanding@gmail.com';
      await sendEmail({
        to: adminEmail,
        subject: `⚠️ StrataLanding security alert: ${loginFailures} login failures in the last hour`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background:#0B1B3A; color:#F8FAFC; border-radius:12px;">
            <h2 style="color:#F43F5E; margin:0 0 16px;">Possible brute-force / abuse</h2>
            <p style="color:#CBD5E1;">In the last hour:</p>
            <ul style="color:#CBD5E1; line-height:1.8;">
              <li><strong>${loginFailures}</strong> login failures (from <strong>${distinctIps}</strong> distinct IPs)</li>
              <li><strong>${lockouts}</strong> account lockouts</li>
            </ul>
            <p style="color:#94A3B8; font-size:13px;">Review <code>security_audit_log</code> and consider an IP block at the Netlify edge if this continues. Rate limits are durable (migration 047), so this should be self-limiting.</p>
          </div>
        `,
      }).catch((e) => console.error('[cron/security-alert] email failed', e));
    }

    return NextResponse.json({ ok: true, loginFailures, lockouts, distinctIps, alerted: spike });
  } catch (error) {
    console.error('[cron/security-alert] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
