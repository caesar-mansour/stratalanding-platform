import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { getSpamSignalSummary } from '@/lib/outreach/spam-signals';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const signals = await getSpamSignalSummary();
    return NextResponse.json({ signals });
  } catch (err) {
    console.error('signals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
