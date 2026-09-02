import sql from '@/lib/db';
import { notFound } from 'next/navigation';
import AdminContent from '../../AdminContent';
import ProjectDetailClient from './ProjectDetailClient';
import Link from 'next/link';
import { requireAdminPage } from '@/lib/admin-page-guard';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  try {
    // 11 parallel queries for all project data
    const [
      projectResult,
      payments,
      milestones,
      tasks,
      mistakes,
      uploads,
      onboardingResult,
      proposals,
      recentMessages,
      revisionCountResult,
      priceOverrides,
    ] = await Promise.all([
      // 1. Project + client + brief
      sql`
        SELECT p.*,
          row_to_json(c.*) as client,
          (SELECT row_to_json(bs.*) FROM brief_submissions bs WHERE bs.project_id = p.id LIMIT 1) as brief
        FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        WHERE p.id = ${id}
        LIMIT 1
      `,
      // 2. Payments
      sql`SELECT * FROM payments WHERE project_id = ${id} ORDER BY created_at DESC`,
      // 3. Milestones
      sql`SELECT * FROM project_milestones WHERE project_id = ${id} ORDER BY created_at ASC`,
      // 4. Tasks
      sql`
        SELECT * FROM tasks WHERE project_id = ${id}
        ORDER BY
          CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'completed' THEN 2 END,
          CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 WHEN 'low' THEN 2 END,
          created_at DESC
      `,
      // 5. Mistakes
      sql`
        SELECT * FROM mistakes WHERE project_id = ${id}
        ORDER BY
          CASE status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 WHEN 'fixed' THEN 2 WHEN 'dismissed' THEN 3 END,
          created_at DESC
      `,
      // 6. Uploads
      sql`SELECT * FROM project_uploads WHERE project_id = ${id} ORDER BY created_at DESC`,
      // 7. Onboarding session + messages
      sql`
        SELECT os.*,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', om.id, 'role', om.role, 'message', om.message,
                'question_number', om.question_number, 'created_at', om.created_at
              ) ORDER BY om.created_at ASC
            ) FROM onboarding_messages om WHERE om.session_id = os.id),
            '[]'::json
          ) as messages
        FROM onboarding_sessions os
        WHERE os.project_id = ${id}
        LIMIT 1
      `,
      // 8. Proposals
      sql`
        SELECT pr.* FROM proposals pr
        WHERE pr.project_id = ${id}
        ORDER BY pr.created_at DESC
      `,
      // 9. Recent chat messages (last 50)
      sql`SELECT * FROM revision_messages WHERE project_id = ${id} ORDER BY created_at DESC LIMIT 50`,
      // 10. Revision round count
      sql`
        SELECT COUNT(*)::int as used FROM revision_messages
        WHERE project_id = ${id} AND sender_type = 'system'
        AND message LIKE '%Revision Round%'
      `,
      // 11. Price overrides
      sql`SELECT * FROM price_overrides WHERE project_id = ${id} ORDER BY created_at DESC`,
    ]);

    const project = projectResult[0];
    if (!project) {
      notFound();
    }

    const companyName = project.brief?.company_name || 'Unnamed Project';
    const clientName = project.client?.name || project.client?.email || 'Unknown';

    const data = {
      project: {
        ...project,
        client: project.client || { id: '', email: '', name: null, created_at: '' },
        brief: project.brief || null,
      },
      payments: payments as Record<string, unknown>[],
      milestones: milestones as Record<string, unknown>[],
      tasks: tasks as Record<string, unknown>[],
      mistakes: mistakes as Record<string, unknown>[],
      uploads: uploads as Record<string, unknown>[],
      onboarding: onboardingResult[0] || null,
      proposals: proposals as Record<string, unknown>[],
      recentMessages: (recentMessages as Record<string, unknown>[]).reverse(),
      revisionRoundsUsed: revisionCountResult[0]?.used || 0,
      priceOverrides: [...priceOverrides] as Record<string, unknown>[],
      ceoEmail: process.env.CEO_EMAIL || '',
    };

    return (
      <AdminContent
        title={companyName}
        description={`${clientName} · ${project.package} · ${project.status?.replace(/_/g, ' ')}`}
        actions={
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        }
      >
        <ProjectDetailClient data={data} />
      </AdminContent>
    );
  } catch (error) {
    console.error('Error loading project:', error);
    return (
      <AdminContent title="Error" description="Failed to load project">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">Failed to load project data. Please try again.</p>
          <Link href="/admin" className="text-red-600 underline mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </AdminContent>
    );
  }
}
