import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth-server';

// All authenticated users go to /portal — the portal handles routing internally
export async function GET() {
  const { user } = await getServerUser();
  if (!user) {
    return NextResponse.json({ redirectTo: '/login' });
  }
  return NextResponse.json({ redirectTo: '/portal' });
}
