import sql from '@/lib/db';
import AdminProjectList from './AdminProjectList';
import AdminContent from './AdminContent';
import AdminDashboardStats from './AdminDashboardStats';
import type { ProjectStatus, PackageType } from '@/lib/types';
import { requireAdminPage } from '@/lib/admin-page-guard';

interface ProjectWithClient {
  id: string;
  status: ProjectStatus;
  package: PackageType;
  timeline: string;
  deposit_payment_url: string | null;
  final_payment_url: string | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  clients: {
    id: string;
    email: string;
    name: string | null;
  };
  brief_submissions: {
    company_name: string;
    industry: string | null;
    notes: string | null;
  }[];
  admin_notes?: string | null;
}

export default async function AdminDashboard() {
  // Verify admin access
  await requireAdminPage();
  let projects: ProjectWithClient[] = [];
  let error: Error | null = null;

  try {
    // Fetch projects that are past the 'new' stage (converted leads)
    const rows = await sql`
      SELECT p.*,
        row_to_json(c.*) as clients,
        COALESCE(
          json_agg(
            json_build_object(
              'company_name', bs.company_name,
              'industry', bs.industry,
              'notes', bs.notes
            )
          ) FILTER (WHERE bs.id IS NOT NULL),
          '[]'
        ) as brief_submissions
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN brief_submissions bs ON bs.project_id = p.id
      WHERE p.status NOT IN ('new', 'proposal_sent')
      GROUP BY p.id, c.id
      ORDER BY p.created_at DESC
    `;

    projects = rows as unknown as ProjectWithClient[];
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    error = err instanceof Error ? err : new Error('Failed to fetch projects');
  }

  return (
      <AdminContent
        title="Dashboard"
        description="Overview of your projects, revenue, and pipeline."
      >
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Failed to load projects. Please refresh the page.
          </div>
        ) : (
          <>
            <AdminDashboardStats projects={projects} />
            <h2 className="text-xl font-semibold text-text-primary mb-4">All Projects</h2>
            <AdminProjectList projects={projects} />
          </>
        )}
      </AdminContent>
  );
}
