import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';

async function getAffiliate() {
  // SECURITY (audit H1): getServerUser validates the session row (revocation), expiry, and AAL —
  // so a signed-out / revoked token can't read affiliate earnings.
  const { user } = await getServerUser();
  if (!user) return null;

  const [affiliate] = await sql`SELECT * FROM affiliates WHERE auth_user_id = ${user.id} LIMIT 1`;
  return affiliate || null;
}

export async function GET() {
  // AUDIT 2026-08-12 (P3): this route had NO try/catch, so any thrown error — a Neon
  // hiccup, a malformed body — became an opaque 500 with nothing logged to diagnose it.
  try {
    const affiliate = await getAffiliate();
    if (!affiliate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get conversions
    const conversions = await sql`
      SELECT rc.*,
        (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = rc.project_id LIMIT 1) as company_name,
        (SELECT p.package FROM projects p WHERE p.id = rc.project_id LIMIT 1) as package
      FROM referral_conversions rc
      WHERE rc.affiliate_id = ${affiliate.id}
      ORDER BY rc.created_at DESC
    `;

    // Get recent clicks (last 30 days count by day)
    const clicksByDay = await sql`
      SELECT DATE(created_at) as day, COUNT(*)::int as count
      FROM referral_clicks
      WHERE affiliate_id = ${affiliate.id} AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `;

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        company: affiliate.company,
        website: affiliate.website,
        referralCode: affiliate.referral_code,
        status: affiliate.status,
        paypalEmail: affiliate.paypal_email,
        totalClicks: affiliate.total_clicks,
        totalConversions: affiliate.total_conversions,
        totalEarnedCents: affiliate.total_earned_cents,
        totalPaidCents: affiliate.total_paid_cents,
        commissionRate: affiliate.commission_rate,
        createdAt: affiliate.created_at,
      },
      conversions,
      clicksByDay,
    });
  } catch (error) {
    console.error('partner-portal GET error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
