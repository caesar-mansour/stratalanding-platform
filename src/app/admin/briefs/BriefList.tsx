'use client';

import { Avatar, DataTable, EmptyState, type Column } from '../_components/admin-ui';
import { Pressable } from '../_components/motion';

const packageLabels: Record<string, string> = {
  starter: 'Presence Page',
  growth: 'Lead Page',
  scale: 'Purchase Page',
};

type Brief = Record<string, unknown>;

const columns: Column<Brief>[] = [
  {
    key: 'company',
    header: 'Company',
    render: (b) => (
      <div className="flex items-center gap-3">
        <Avatar name={(b.company_name as string) || (b.client_name as string)} />
        <span className="text-sm font-medium text-text-primary">
          {(b.company_name as string) || 'N/A'}
        </span>
      </div>
    ),
  },
  {
    key: 'client',
    header: 'Client',
    render: (b) => (
      <div>
        <p className="text-sm text-text-primary">{(b.client_name as string) || 'N/A'}</p>
        <p className="text-sm text-text-muted">{b.client_email as string}</p>
      </div>
    ),
  },
  {
    key: 'industry',
    header: 'Industry',
    render: (b) => <span className="text-sm text-text-muted">{(b.industry as string) || 'N/A'}</span>,
  },
  {
    key: 'package',
    header: 'Package',
    render: (b) => (
      <span className="text-sm text-text-primary">
        {packageLabels[b.package as string] || String(b.package)}
      </span>
    ),
  },
  {
    key: 'submitted',
    header: 'Submitted',
    render: (b) => (
      <span className="text-sm text-text-muted">
        {new Date(b.created_at as string).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (b) => (
      <Pressable
        as="a"
        href={`/admin/projects/${b.id}`}
        ariaLabel="Review brief"
        className="group inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
      >
        Review{' '}
        <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </Pressable>
    ),
  },
];

export default function BriefList({ briefs }: { briefs: Brief[] }) {
  if (briefs.length === 0) {
    return <EmptyState title="No pending briefs" description="New project briefs will appear here." />;
  }
  return <DataTable columns={columns} rows={briefs} rowKey={(b) => b.id as string} />;
}
