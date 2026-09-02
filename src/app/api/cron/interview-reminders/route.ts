import { NextRequest, NextResponse } from 'next/server';
import { checkAndSendInterviewReminders } from '@/lib/interview-reminders';
import { timingSafeCompare } from '@/lib/security/sanitize';

// Manual cron endpoint (optional — reminders also run automatically on login/verify)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }

  if (!authHeader || !timingSafeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sent = await checkAndSendInterviewReminders();
  return NextResponse.json({ sent });
}
