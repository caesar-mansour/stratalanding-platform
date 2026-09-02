'use client';

import { usePortalData } from '../PortalDataContext';
import { statusInfo, type ProjectStatus } from '@/lib/types';
import TimelineContent from './TimelineContent';
import Link from 'next/link';

const milestones = [
  {
    status: 'new',
    label: 'Brief Received',
    description: 'Your project brief has been submitted and is being reviewed.',
  },
  {
    status: 'proposal_sent',
    label: 'Proposal Sent',
    description: 'We\'ve sent your custom proposal. Review and pay the deposit to proceed.',
  },
  {
    status: 'deposit_paid',
    label: 'Deposit Paid',
    description: 'Payment received. Project is being prepared for production.',
  },
  {
    status: 'in_production',
    label: 'In Production',
    description: 'Your landing page is being designed and developed. You\'ll receive checkpoint updates.',
  },
  {
    status: 'ready_for_final_payment',
    label: 'Ready for Review',
    description: 'Development is complete. Pay the final balance to proceed with launch.',
  },
  {
    status: 'paid_in_full',
    label: 'Paid in Full',
    description: 'All payments received. Launch preparation is underway.',
  },
  {
    status: 'launched',
    label: 'Launched',
    description: 'Your landing page is live! Thank you for working with us.',
  },
];

const statusOrder: ProjectStatus[] = [
  'new',
  'proposal_sent',
  'deposit_paid',
  'in_production',
  'ready_for_final_payment',
  'paid_in_full',
  'launched',
];

export default function PortalStatusPage() {
  const { client, projects } = usePortalData();

  if (!client || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No project found.</p>
        <Link href="/portal" className="text-[var(--color-accent)] hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const project = projects[0];
  const currentStatus = project.status as ProjectStatus;
  const currentStatusIndex = statusOrder.indexOf(currentStatus);

  // Phone leads approved a preview, not a brief — use the call-flow wording.
  const isPhoneLead = (project as { source?: string }).source === 'phone';
  const status = (isPhoneLead && currentStatus === 'new')
    ? { label: 'Preview Approved', description: "You approved your preview — we're putting your proposal together now.", nextAction: "We'll email your proposal shortly — usually within a day." }
    : statusInfo[currentStatus];
  const displayMilestones = isPhoneLead
    ? milestones.map((m) => m.status === 'new'
        ? { ...m, label: 'Preview Approved', description: 'You approved your preview — your proposal is on the way.' }
        : m)
    : milestones;

  return (
    <TimelineContent
      status={status}
      milestones={displayMilestones}
      currentStatus={currentStatus}
      currentStatusIndex={currentStatusIndex}
      statusOrder={statusOrder}
    />
  );
}
