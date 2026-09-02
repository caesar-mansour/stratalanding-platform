'use client';

import Link from 'next/link';
import type { Proposal, ProposalStatus, PackageType } from '@/lib/types';
import { getProposalPrice } from '@/lib/types';
import { GradientText, NumberTicker, Reveal, RevealGroup, RevealItem, PortalCard } from '@/app/portal/components/portal-ui';

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

const statusLabels: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Pending Review',
  viewed: 'Viewed',
  accepted: 'Accepted',
  expired: 'Expired',
};

const statusColors: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-red-100 text-red-800',
};

const packageLabels: Record<PackageType, string> = {
  starter: 'Presence Page',
  growth: 'Lead Page',
  scale: 'Purchase Page',
};

interface ProposalsContentProps {
  proposals: Proposal[];
}

export default function ProposalsContent({ proposals }: ProposalsContentProps) {
  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  if (proposals.length === 0) {
    return (
      <div className="container py-8">
        <Reveal className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight mb-6"><GradientText>Your Proposals</GradientText></h1>
          <div className={`${GLASS} p-8 text-center`}>
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] grid place-items-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2"><GradientText>No Proposals Yet</GradientText></h2>
            <p className="text-text-muted">
              Once we send you a proposal, it will appear here for your review.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <h1 className="text-3xl font-extrabold tracking-tight mb-6"><GradientText>Your Proposals</GradientText></h1>
        </Reveal>

        <RevealGroup className="space-y-4">
          {proposals.map((proposal) => {
            const expired = isExpired(proposal.valid_until);
            const status = expired && proposal.status !== 'accepted' ? 'expired' : proposal.status;
            const totalPrice = getProposalPrice(proposal);
            const depositAmount = totalPrice / 2;

            return (
              <RevealItem key={proposal.id}>
              <PortalCard className={`${GLASS} overflow-hidden`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        {proposal.company_name}
                      </h2>
                      <p className="text-sm text-text-muted">
                        {packageLabels[proposal.package as PackageType]} Package
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border border-white/50 ${statusColors[status as ProposalStatus]}`}>
                      {statusLabels[status as ProposalStatus]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-text-muted mb-1">Total Price</p>
                      <p className="text-lg font-semibold text-text-primary">
                        <NumberTicker value={totalPrice} format="currency" />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-1">Deposit (50%)</p>
                      <p className="text-lg font-semibold text-[var(--color-accent)]">
                        <NumberTicker value={depositAmount} format="currency" />
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-1">Valid Until</p>
                      <p className={`text-sm font-medium tabular-nums ${expired ? 'text-red-600' : 'text-text-primary'}`}>
                        {new Date(proposal.valid_until).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-1">Sent On</p>
                      <p className="text-sm font-medium tabular-nums text-text-primary">
                        {new Date(proposal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {proposal.notes && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-800 mb-1">Note from our team:</p>
                      <p className="text-sm text-amber-700">{proposal.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Link
                      href={`/proposal/${proposal.id}`}
                      className="flex-1 px-4 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium text-center transition-[background-color,transform,box-shadow] duration-200 hover:bg-[var(--accent-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      View Full Proposal
                    </Link>
                    {proposal.status !== 'accepted' && !expired && proposal.deposit_payment_url && (
                      <a
                        href={proposal.deposit_payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium transition-[background-color,transform,box-shadow] duration-200 hover:bg-emerald-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        Pay Deposit
                      </a>
                    )}
                  </div>
                </div>

                {proposal.status === 'accepted' && (
                  <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm font-medium">
                        Accepted on {proposal.accepted_at ? new Date(proposal.accepted_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </PortalCard>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </div>
  );
}
