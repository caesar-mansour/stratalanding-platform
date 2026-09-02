import Link from 'next/link';
import NewProposalForm from './NewProposalForm';
import sql from '@/lib/db';
import { requireAdminPage } from '@/lib/admin-page-guard';

interface EligibleProject {
  id: string;
  status: string;
  package: string;
  created_at: string;
}

interface ClientWithoutProposal {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  // GATE 8 (2026-08-12): the form needs these so an admin can link the proposal to a specific
  // project. Without a link the proposal is unpayable — create-payment rejects it outright.
  projects: EligibleProject[];
}

export default async function NewProposalPage() {
  // Verify admin access
  await requireAdminPage();
  // Fetch all clients with their latest brief company name
  const clients = await sql`
    SELECT c.id, c.name, c.email,
      (SELECT bs.company_name
       FROM projects p
       JOIN brief_submissions bs ON bs.project_id = p.id
       WHERE p.client_id = c.id
       ORDER BY p.created_at DESC
       LIMIT 1
      ) as company_name
    FROM clients c
    ORDER BY c.created_at DESC
  `;

  // Fetch all proposal emails to filter out
  const proposals = await sql`SELECT client_email FROM proposals`;

  // Fetch banned emails to filter out
  const bannedEmails = await sql`SELECT email FROM banned_emails`;

  const proposalEmails = new Set(
    proposals.map((p: Record<string, unknown>) => (p.client_email as string).toLowerCase())
  );

  const bannedEmailSet = new Set(
    bannedEmails.map((b: Record<string, unknown>) => (b.email as string).toLowerCase())
  );

  // Projects a deposit can still be collected on. Anything at 'deposit_paid' or beyond has already
  // paid one, so attaching a new deposit proposal to it would be wrong. Mirrors the server-side
  // eligibility rule in POST /api/admin/proposals.
  const eligibleProjects = await sql<
    { id: string; client_id: string; status: string; package: string; created_at: Date }[]
  >`
    SELECT id, client_id, status, package, created_at
    FROM projects
    WHERE status IN ('new', 'proposal_sent')
    ORDER BY created_at DESC
  `;

  const projectsByClient = new Map<string, EligibleProject[]>();
  for (const p of eligibleProjects) {
    const list = projectsByClient.get(p.client_id) ?? [];
    list.push({
      id: p.id,
      status: p.status,
      package: p.package,
      created_at: new Date(p.created_at).toISOString(),
    });
    projectsByClient.set(p.client_id, list);
  }

  // Filter clients who don't have proposals yet and are not banned
  const clientsWithoutProposals: ClientWithoutProposal[] = clients
    .filter((client: Record<string, unknown>) =>
      !proposalEmails.has((client.email as string).toLowerCase()) &&
      !bannedEmailSet.has((client.email as string).toLowerCase())
    )
    .map((client: Record<string, unknown>) => ({
      id: client.id as string,
      name: client.name as string,
      email: client.email as string,
      company_name: (client.company_name as string) || undefined,
      projects: projectsByClient.get(client.id as string) ?? [],
    }));

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/admin/proposals"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Proposals
        </Link>
        <h2 className="text-2xl font-bold text-text-primary mb-2">Create New Proposal</h2>
        <p className="text-text-muted">
          Fill in the details below to create a proposal. You&apos;ll get a shareable link to send to the client.
        </p>
      </div>

      <NewProposalForm clientsWithoutProposals={clientsWithoutProposals} />
    </main>
  );
}
