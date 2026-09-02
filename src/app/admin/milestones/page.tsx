import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import MilestonesList from './MilestonesList';
import { requireAdminPage } from '@/lib/admin-page-guard';

export interface ProjectWithMilestones {
  id: string;
  status: string;
  package: string;
  client_name: string | null;
  client_email: string;
  company_name: string | null;
  created_at: string;
  milestones: {
    id: string;
    milestone_type: string;
    status: string;
    notes: string | null;
    requires_approval: boolean;
    client_approved_at: string | null;
    completed_at: string | null;
  }[];
}

export default async function AdminMilestonesPage() {
  await requireAdminPage();
  let projects: ProjectWithMilestones[] = [];
  let fetchError: Error | null = null;

  try {
    // Get active projects (not launched, not closed)
    const projectRows = await sql`
      SELECT p.id, p.status, p.package, p.created_at,
        c.name as client_name,
        c.email as client_email,
        (SELECT bs.company_name FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as company_name
      FROM projects p
      INNER JOIN clients c ON c.id = p.client_id
      WHERE p.status NOT IN ('not_interested')
      ORDER BY
        CASE p.status
          WHEN 'in_production' THEN 0
          WHEN 'deposit_paid' THEN 1
          WHEN 'ready_for_final_payment' THEN 2
          WHEN 'paid_in_full' THEN 3
          WHEN 'proposal_sent' THEN 4
          WHEN 'new' THEN 5
          WHEN 'launched' THEN 6
        END,
        p.created_at DESC
    `;

    // Get milestones for all projects
    const projectIds = projectRows.map((p: Record<string, unknown>) => p.id as string);

    let milestoneRows: Record<string, unknown>[] = [];
    if (projectIds.length > 0) {
      milestoneRows = await sql`
        SELECT * FROM project_milestones
        WHERE project_id = ANY(${projectIds})
        ORDER BY created_at ASC
      `;
    }

    // Group milestones by project
    const milestonesByProject = new Map<string, Record<string, unknown>[]>();
    for (const m of milestoneRows) {
      const pid = m.project_id as string;
      if (!milestonesByProject.has(pid)) {
        milestonesByProject.set(pid, []);
      }
      milestonesByProject.get(pid)!.push(m);
    }

    projects = projectRows.map((p: Record<string, unknown>) => ({
      id: p.id as string,
      status: p.status as string,
      package: p.package as string,
      client_name: p.client_name as string | null,
      client_email: p.client_email as string,
      company_name: p.company_name as string | null,
      created_at: p.created_at as string,
      milestones: (milestonesByProject.get(p.id as string) || []).map((m) => ({
        id: m.id as string,
        milestone_type: m.milestone_type as string,
        status: m.status as string,
        notes: m.notes as string | null,
        requires_approval: m.requires_approval as boolean,
        client_approved_at: m.client_approved_at as string | null,
        completed_at: m.completed_at as string | null,
      })),
    }));
  } catch (err) {
    console.error('Failed to fetch milestones:', err);
    const errMsg = String(err);
    if (errMsg.includes('does not exist') || errMsg.includes('relation')) {
      projects = [];
    } else {
      fetchError = err instanceof Error ? err : new Error('Failed to fetch milestones');
    }
  }

  return (
    <AdminContent
      title="Milestones"
      description="Track project delivery progress and client approvals."
    >
      {fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load milestones. Please refresh the page.
        </div>
      ) : (
        <MilestonesList initialProjects={projects} />
      )}
    </AdminContent>
  );
}
