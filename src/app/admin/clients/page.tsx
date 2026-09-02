import sql from '@/lib/db';
import AdminContent from '../AdminContent';
import ClientList from './ClientList';
import { requireAdminPage } from '@/lib/admin-page-guard';

export default async function ClientsPage() {
  await requireAdminPage();
  const clients = await sql`
    SELECT c.id, c.name, c.email, c.created_at,
      COUNT(p.id)::int as project_count,
      MAX(p.status) as latest_status,
      MAX(p.created_at) as last_project_at
    FROM clients c
    LEFT JOIN projects p ON p.client_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  return (
    <AdminContent
      title="Clients"
      description="All registered clients and their project activity."
    >
      <ClientList clients={clients as Record<string, unknown>[]} />
    </AdminContent>
  );
}
