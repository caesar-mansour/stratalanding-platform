import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import QuoteList from './QuoteList';
import { requireAdminPage } from '@/lib/admin-page-guard';

export default async function QuotesPage() {
  await requireAdminPage();
  const quotes = await sql`
    SELECT p.id, p.status, p.created_at,
      c.name as client_name, c.email as client_email,
      bs.company_name, bs.industry, bs.notes
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN brief_submissions bs ON bs.project_id = p.id
    WHERE p.source = 'quote' AND p.status = 'new'
    ORDER BY p.created_at DESC
  `;

  return (
    <AdminContent
      title="Quotes"
      description="Incoming quote requests — not yet converted to projects."
    >
      <QuoteList quotes={quotes as Record<string, unknown>[]} />
    </AdminContent>
  );
}
