import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminLastSeen,
  setAdminLastSeen,
  getAdminStatus,
  setAdminStatus,
  getClientFacingStatus,
} from '@/lib/admin-status';
import { verifyAdmin } from '@/lib/admin-auth';

// GET - Check admin online status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStatus = searchParams.get('includeStatus') === 'true';

    const clientStatus = getClientFacingStatus();

    return NextResponse.json({
      isOnline: clientStatus === 'online',
      isBusy: clientStatus === 'busy',
      status: clientStatus,
      lastSeen: getAdminLastSeen(),
      ...(includeStatus && { adminStatus: getAdminStatus() }),
    });
  } catch (error) {
    console.error('Admin status GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update admin status (heartbeat)
export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a status change
    const body = await request.json().catch(() => ({}));

    if (body.status && ['visible', 'busy', 'hidden'].includes(body.status)) {
      setAdminStatus(body.status);
      return NextResponse.json({ success: true, adminStatus: getAdminStatus() });
    }

    // Regular heartbeat
    setAdminLastSeen(Date.now());

    return NextResponse.json({ success: true, lastSeen: getAdminLastSeen(), adminStatus: getAdminStatus() });
  } catch (error) {
    console.error('Admin status POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
