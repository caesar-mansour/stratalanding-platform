import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import BriefList from './BriefList';
import { requireAdminPage } from '@/lib/admin-page-guard';

export default async function BriefsPage() {
  await requireAdminPage();
  const briefs = await sql`
    SELECT p.id, p.status, p.package, p.created_at,
      c.name as client_name, c.email as client_email,
      bs.company_name, bs.industry, bs.notes
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN brief_submissions bs ON bs.project_id = p.id
    WHERE p.source = 'brief' AND p.status = 'new'
    ORDER BY p.created_at DESC
  `;

  return (
    <AdminContent
      title="Briefs"
      description="Incoming project briefs — not yet converted to projects."
    >
      <BriefList briefs={briefs as Record<string, unknown>[]} />
    </AdminContent>
  );
}
