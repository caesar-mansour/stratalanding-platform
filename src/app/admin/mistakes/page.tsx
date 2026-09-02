import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import MistakesList from './MistakesList';
import { requireAdminPage } from '@/lib/admin-page-guard';

export interface MistakeWithContext {
  id: string;
  project_id: string;
  description: string;
  status: 'open' | 'investigating' | 'fixed' | 'dismissed';
  source: 'ai' | 'client' | 'admin';
  message_id: string | null;
  created_at: string;
  updated_at: string;
  project_package: string;
  project_status: string;
  client_name: string | null;
  client_email: string;
  company_name: string | null;
}

export interface ProjectOption {
  id: string;
  package: string;
  status: string;
  client_name: string | null;
  client_email: string;
  company_name: string | null;
}

export default async function AdminMistakesPage() {
  await requireAdminPage();
  let mistakes: MistakeWithContext[] = [];
  let projects: ProjectOption[] = [];
  let fetchError: Error | null = null;

  try {
    const [mistakeRows, projectRows] = await Promise.all([
      sql`
        SELECT m.*,
          p.package as project_package,
          p.status as project_status,
          c.name as client_name,
          c.email as client_email,
          (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
        FROM mistakes m
        INNER JOIN projects p ON p.id = m.project_id
        INNER JOIN clients c ON c.id = p.client_id
        ORDER BY
          CASE m.status
            WHEN 'open' THEN 0
            WHEN 'investigating' THEN 1
            WHEN 'fixed' THEN 2
            WHEN 'dismissed' THEN 3
          END,
          m.created_at DESC
      `,
      sql`
        SELECT p.id, p.package, p.status,
          c.name as client_name,
          c.email as client_email,
          (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
        FROM projects p
        INNER JOIN clients c ON c.id = p.client_id
        ORDER BY p.created_at DESC
      `,
    ]);
    mistakes = mistakeRows as unknown as MistakeWithContext[];
    projects = projectRows as unknown as ProjectOption[];
  } catch (err) {
    console.error('Failed to fetch mistakes:', err);
    const errMsg = String(err);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      mistakes = [];
    } else {
      fetchError = err instanceof Error ? err : new Error('Failed to fetch mistakes');
    }
  }

  return (
    <AdminContent
      title="Mistakes"
      description="Client-reported issues and bugs detected by AI."
    >
      {fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load mistakes. Please refresh the page.
        </div>
      ) : (
        <MistakesList initialMistakes={mistakes} projects={projects} />
      )}
    </AdminContent>
  );
}
