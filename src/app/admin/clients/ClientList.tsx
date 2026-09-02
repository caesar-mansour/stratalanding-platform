'use client';

import { Avatar, DataTable, EmptyState, StatusBadge, type Column } from '../_components/admin-ui';
import { NumberTicker } from '../_components/motion';

type Client = Record<string, unknown>;

const columns: Column<Client>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (c) => (
      <div className="flex items-center gap-3">
        <Avatar name={(c.name as string) || (c.email as string)} />
        <span className="text-sm font-medium text-text-primary">{(c.name as string) || 'N/A'}</span>
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    render: (c) => <span className="text-sm text-text-muted">{c.email as string}</span>,
  },
  {
    key: 'projects',
    header: 'Projects',
    render: (c) => (
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-background px-2 text-sm font-medium text-text-primary tabular-nums">
        <NumberTicker value={(c.project_count as number) || 0} />
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Latest Status',
    render: (c) => <StatusBadge status={c.latest_status as string | null} />,
  },
  {
    key: 'joined',
    header: 'Joined',
    render: (c) => (
      <span className="text-sm text-text-muted">
        {new Date(c.created_at as string).toLocaleDateString()}
      </span>
    ),
  },
];

export default function ClientList({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return <EmptyState title="No clients yet" description="Registered clients will appear here." />;
  }
  return <DataTable columns={columns} rows={clients} rowKey={(c) => c.id as string} />;
}
