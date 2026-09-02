import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import OnboardingList from './OnboardingList';
import { requireAdminPage } from '@/lib/admin-page-guard';

export interface OnboardingSessionWithContext {
  id: string;
  project_id: string;
  status: 'in_progress' | 'completed';
  current_question: number;
  summary: string | null;
  started_at: string;
  completed_at: string | null;
  project_package: string;
  project_status: string;
  client_name: string | null;
  client_email: string;
  company_name: string | null;
  answers_count: number;
  messages: {
    id: string;
    role: 'ai' | 'client';
    message: string;
    question_number: number | null;
    created_at: string;
  }[];
}

export default async function AdminOnboardingPage() {
  await requireAdminPage();
  let sessions: OnboardingSessionWithContext[] = [];
  let fetchError: Error | null = null;

  try {
    const rows = await sql`
      SELECT
        os.*,
        p.package as project_package,
        p.status as project_status,
        c.name as client_name,
        c.email as client_email,
        (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
      FROM onboarding_sessions os
      INNER JOIN projects p ON p.id = os.project_id
      INNER JOIN clients c ON c.id = p.client_id
      ORDER BY
        CASE os.status WHEN 'in_progress' THEN 0 WHEN 'completed' THEN 1 END,
        os.started_at DESC
    `;

    // Fetch messages for each session
    sessions = await Promise.all(
      rows.map(async (row: Record<string, unknown>) => {
        const messages = await sql`
          SELECT id, role, message, question_number, created_at FROM onboarding_messages
          WHERE session_id = ${row.id as string}
          ORDER BY created_at ASC
        `;
        const answersCount = messages.filter((m: Record<string, unknown>) => m.role === 'client').length;
        return { ...row, messages, answers_count: answersCount } as unknown as OnboardingSessionWithContext;
      })
    );
  } catch (err) {
    console.error('Failed to fetch onboarding sessions:', err);
    const errMsg = String(err);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      sessions = [];
    } else {
      fetchError = err instanceof Error ? err : new Error('Failed to fetch sessions');
    }
  }

  return (
    <AdminContent
      title="Onboarding"
      description="AI-guided business interviews with clients."
    >
      {fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load onboarding sessions. Please refresh the page.
        </div>
      ) : (
        <OnboardingList initialSessions={sessions} />
      )}
    </AdminContent>
  );
}
