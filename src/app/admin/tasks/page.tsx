import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import TasksList from './TasksList';
import { requireAdminPage } from '@/lib/admin-page-guard';

export interface TaskWithContext {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high';
  source: 'ai' | 'admin';
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

export default async function AdminTasksPage() {
  await requireAdminPage();
  let tasks: TaskWithContext[] = [];
  let projects: ProjectOption[] = [];
  let fetchError: Error | null = null;

  try {
    const [taskRows, projectRows] = await Promise.all([
      sql`
        SELECT t.*,
          p.package as project_package,
          p.status as project_status,
          c.name as client_name,
          c.email as client_email,
          (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
        FROM tasks t
        INNER JOIN projects p ON p.id = t.project_id
        INNER JOIN clients c ON c.id = p.client_id
        ORDER BY
          CASE t.status
            WHEN 'pending' THEN 0
            WHEN 'in_progress' THEN 1
            WHEN 'completed' THEN 2
          END,
          CASE t.priority
            WHEN 'high' THEN 0
            WHEN 'normal' THEN 1
            WHEN 'low' THEN 2
          END,
          t.created_at DESC
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
    tasks = taskRows as unknown as TaskWithContext[];
    projects = projectRows as unknown as ProjectOption[];
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
    const errMsg = String(err);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      tasks = [];
    } else {
      fetchError = err instanceof Error ? err : new Error('Failed to fetch tasks');
    }
  }

  return (
    <AdminContent
      title="Tasks"
      description="Client change requests and work items."
    >
      {fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load tasks. Please refresh the page.
        </div>
      ) : (
        <TasksList initialTasks={tasks} projects={projects} />
      )}
    </AdminContent>
  );
}
