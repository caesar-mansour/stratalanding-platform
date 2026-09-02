import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';

export async function PATCH(request: Request) {
  // AUDIT 2026-08-12 (P3): this route had NO try/catch, so any thrown error — a Neon
  // hiccup, a malformed body — became an opaque 500 with nothing logged to diagnose it.
  try {
    // SECURITY (audit H1): validate the session against the DB (revocation/expiry/AAL).
    const { user } = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [affiliate] = await sql`SELECT id FROM affiliates WHERE auth_user_id = ${user.id} LIMIT 1`;
    if (!affiliate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { name, company, website, paypalEmail } = body;

    // Validate
    if (name && (typeof name !== 'string' || name.length > 100)) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    if (paypalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paypalEmail)) {
        return NextResponse.json({ error: 'Invalid PayPal email' }, { status: 400 });
      }
    }

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name.trim();
    if (company !== undefined) updates.company = company?.trim() || null;
    if (website !== undefined) updates.website = website?.trim() || null;
    if (paypalEmail !== undefined) updates.paypal_email = paypalEmail.toLowerCase().trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const cols = Object.keys(updates);
    await sql`UPDATE affiliates SET ${sql(updates, cols)} WHERE id = ${affiliate.id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('profile PATCH error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
