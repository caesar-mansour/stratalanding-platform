import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import sql from '@/lib/db';
import { addSuppression } from '@/lib/suppressions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const reason = url.searchParams.get('reason');
  const search = url.searchParams.get('q');

  try {
    const reasonClause = reason ? sql`AND reason = ${reason}` : sql``;
    const searchClause = search
      ? sql`AND LOWER(email) LIKE ${'%' + search.toLowerCase() + '%'}`
      : sql``;
    const rows = await sql`
      SELECT id, email, reason, source, notes, unsubscribed_at, created_at
      FROM email_suppressions
      WHERE 1=1 ${reasonClause} ${searchClause}
      ORDER BY unsubscribed_at DESC
      LIMIT 500
    `;
    const [{ total }] = await sql<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS total FROM email_suppressions
      WHERE 1=1 ${reasonClause} ${searchClause}
    `;
    const byReason = await sql`
      SELECT reason, COUNT(*)::int AS n FROM email_suppressions GROUP BY reason ORDER BY n DESC
    `;
    return NextResponse.json({ suppressions: rows, total, by_reason: byReason });
  } catch (err) {
    console.error('suppressions list error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    await addSuppression({
      email,
      reason: 'admin_suppressed',
      source: 'admin_ui',
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('suppression add error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await sql`DELETE FROM email_suppressions WHERE id = ${id}::uuid`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('suppression delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
