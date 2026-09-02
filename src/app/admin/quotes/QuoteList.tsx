'use client';

import { Avatar, DataTable, EmptyState, type Column } from '../_components/admin-ui';
import { Pressable } from '../_components/motion';

// Extract structured data from quote notes
function parseQuoteNotes(notes: string | null) {
  if (!notes) return { projectType: null, budget: null, timeline: null, website: null, freeText: null };
  const lines = notes.split('\n\n');
  let projectType: string | null = null;
  let budget: string | null = null;
  let timeline: string | null = null;
  let website: string | null = null;
  const freeTextParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith('Project Type: ')) projectType = line.replace('Project Type: ', '');
    else if (line.startsWith('Budget: ')) budget = line.replace('Budget: ', '');
    else if (line.startsWith('Timeline: ')) timeline = line.replace('Timeline: ', '');
    else if (line.startsWith('Website: ')) website = line.replace('Website: ', '');
    else if (line.trim()) freeTextParts.push(line.trim());
  }

  return { projectType, budget, timeline, website, freeText: freeTextParts.join(' ') || null };
}

type Quote = Record<string, unknown>;

const columns: Column<Quote>[] = [
  {
    key: 'company',
    header: 'Company / Website',
    render: (q) => (
      <div className="flex items-center gap-3">
        <Avatar name={(q.company_name as string) || (q.client_name as string)} />
        <span className="text-sm font-medium text-text-primary">
          {(q.company_name as string) || 'N/A'}
        </span>
      </div>
    ),
  },
  {
    key: 'client',
    header: 'Client',
    render: (q) => (
      <div>
        <p className="text-sm text-text-primary">{(q.client_name as string) || 'N/A'}</p>
        <p className="text-sm text-text-muted">{q.client_email as string}</p>
      </div>
    ),
  },
  {
    key: 'projectType',
    header: 'Project Type',
    render: (q) => {
      const parsed = parseQuoteNotes(q.notes as string | null);
      return <span className="text-sm text-text-muted">{parsed.projectType || (q.industry as string) || 'N/A'}</span>;
    },
  },
  {
    key: 'budget',
    header: 'Budget',
    render: (q) => {
      const parsed = parseQuoteNotes(q.notes as string | null);
      return <span className="text-sm text-text-muted">{parsed.budget || '—'}</span>;
    },
  },
  {
    key: 'timeline',
    header: 'Timeline',
    render: (q) => {
      const parsed = parseQuoteNotes(q.notes as string | null);
      return <span className="text-sm text-text-muted">{parsed.timeline || '—'}</span>;
    },
  },
  {
    key: 'submitted',
    header: 'Submitted',
    render: (q) => (
      <span className="text-sm text-text-muted">
        {new Date(q.created_at as string).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (q) => (
      <Pressable
        as="a"
        href={`/admin/projects/${q.id}`}
        ariaLabel="Review quote"
        className="group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
      >
        Review{' '}
        <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </Pressable>
    ),
  },
];

export default function QuoteList({ quotes }: { quotes: Quote[] }) {
  if (quotes.length === 0) {
    return <EmptyState title="No pending quotes" description="Custom quote requests will appear here." />;
  }
  return <DataTable columns={columns} rows={quotes} rowKey={(q) => q.id as string} />;
}
