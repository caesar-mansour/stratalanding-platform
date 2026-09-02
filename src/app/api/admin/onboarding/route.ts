import sql from '@/lib/db';
import { verifyAdmin } from '@/lib/admin-auth';

// GET — Fetch all onboarding sessions with client/project info
// AUDIT 2026-08-12 (Phase 6): was `Record<string, any>`. Typed narrowly rather than suppressed.
interface SessionRow { id: string; [key: string]: unknown }

export async function GET() {
  try {
    if (!(await verifyAdmin())) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await sql<SessionRow[]>`
      SELECT
        os.*,
        p.package as project_package,
        p.status as project_status,
        c.name as client_name,
        c.email as client_email,
        (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name,
        (SELECT COUNT(*) FROM onboarding_messages om WHERE om.session_id = os.id AND om.role = 'client') as answers_count
      FROM onboarding_sessions os
      INNER JOIN projects p ON p.id = os.project_id
      INNER JOIN clients c ON c.id = p.client_id
      ORDER BY
        CASE os.status WHEN 'in_progress' THEN 0 WHEN 'completed' THEN 1 END,
        os.started_at DESC
    `;

    // For each session, get messages
    const sessionsWithMessages = await Promise.all(
      sessions.map(async (session: SessionRow) => {
        const messages = await sql`
          SELECT * FROM onboarding_messages
          WHERE session_id = ${session.id}
          ORDER BY created_at ASC
        `;
        return { ...session, messages };
      })
    );

    return Response.json({ sessions: sessionsWithMessages });
  } catch (error) {
    console.error('Admin onboarding GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
