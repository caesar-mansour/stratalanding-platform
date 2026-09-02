import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { getServerUser } from '@/lib/auth-server';

// Update the logged-in client's own account details (currently: display name).
export async function POST(request: Request) {
  try {
    const { user } = await getServerUser();
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      return NextResponse.json({ error: 'Name must be 1–120 characters.' }, { status: 400 });
    }

    const [updated] = await sql`
      UPDATE clients SET name = ${name.trim()} WHERE email = ${user.email} RETURNING id, name
    `;
    if (!updated) return NextResponse.json({ error: 'No client account found.' }, { status: 404 });

    return NextResponse.json({ success: true, name: updated.name });
  } catch (error) {
    console.error('account update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
