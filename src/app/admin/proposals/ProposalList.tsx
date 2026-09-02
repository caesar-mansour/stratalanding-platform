'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Proposal, ProposalStatus, PackageType } from '@/lib/types';
import { packagePricing, formatPrice, getProposalPrice } from '@/lib/types';
import { SpotlightCard, RevealGroup, RevealItem, NumberTicker, Pressable } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';

const statusLabels: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  expired: 'Expired',
};

const statusColors: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
};

const packageLabels: Record<PackageType, string> = {
  starter: 'Presence Page',
  growth: 'Lead Page',
  scale: 'Purchase Page',
};

export default function ProposalList({ proposals }: { proposals: Proposal[] }) {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const copyProposalLink = async (proposalId: string, url?: string | null) => {
    // SECURITY (audit F53): prefer the stored signed-token URL so a prospect can actually open it
    // (the page is now gated). The plain fallback only works for admins/owners.
    const link = url || `${window.location.origin}/proposal/${proposalId}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(proposalId);
    toast.success('Link copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (proposalId: string, newStatus: ProposalStatus) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch('/api/admin/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Status updated', `Marked as ${statusLabels[newStatus]}.`);
      window.location.reload();
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Update failed');
      toast.error('Could not update status', 'Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentUrlUpdate = async (proposalId: string, url: string) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch('/api/admin/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, deposit_payment_url: url }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment URL');
      }

      toast.success('Payment URL saved');
      window.location.reload();
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Update failed');
      toast.error('Could not save payment URL', 'Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch(`/api/admin/proposals?id=${proposalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete proposal');
      }

      toast.success('Proposal deleted');
      window.location.reload();
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Delete failed');
      toast.error('Could not delete proposal', 'Please try again.');
      setIsUpdating(false);
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  if (proposals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-[var(--radius-lg)] border border-border p-8 text-center shadow-[var(--shadow-sm)]"
      >
        <svg className="w-12 h-12 text-text-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-text-primary mb-4">No proposals yet.</p>
        <p className="text-sm text-text-muted">Create your first proposal to send to a client.</p>
      </motion.div>
    );
  }

  return (
    <>
      {/* Proposals Table */}
      <RevealGroup>
      <RevealItem>
      <SpotlightCard
        padded={false}
        className="rounded-[var(--radius-lg)] border border-border overflow-hidden"
      >
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Valid Until
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {proposals.map((proposal, index) => (
              <motion.tr
                key={proposal.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="hover:bg-background transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{proposal.client_name}</p>
                    <p className="text-sm text-text-muted">{proposal.client_email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-text-primary">{proposal.company_name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-text-primary">
                    {packageLabels[proposal.package as PackageType]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-text-primary">
                    {formatPrice(getProposalPrice(proposal))}
                  </span>
                  {proposal.custom_price_cents && (
                    <span className="ml-1 text-xs text-green-600">(custom)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const expired = isExpired(proposal.valid_until) && proposal.status !== 'accepted';
                    const effective = (expired ? 'expired' : proposal.status) as ProposalStatus;
                    const live = effective === 'sent' || effective === 'viewed';
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${statusColors[effective]}`}>
                        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current ${live ? 'animate-pulse' : ''}`} />
                        {expired ? 'Expired' : statusLabels[proposal.status as ProposalStatus]}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                  {new Date(proposal.valid_until).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                  <Pressable
                    onClick={() => copyProposalLink(proposal.id)}
                    className="text-sm text-accent hover:text-[var(--accent-hover)] transition-colors"
                  >
                    {copiedId === proposal.id ? 'Copied!' : 'Copy Link'}
                  </Pressable>
                  <Pressable
                    onClick={() => setSelectedProposal(proposal)}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    Manage
                  </Pressable>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </SpotlightCard>
      </RevealItem>
      </RevealGroup>

      {/* Proposal Detail Modal */}
      <AnimatePresence>
        {selectedProposal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">
                  Proposal for {selectedProposal.company_name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedProposal(null);
                    setShowDeleteConfirm(false);
                  }}
                  className="text-text-muted hover:text-text-primary"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {updateError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {updateError}
                </div>
              )}

              {/* Proposal Link */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Proposal Link</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedProposal.deposit_payment_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${selectedProposal.id}`}
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-[var(--radius-md)] text-sm text-text-primary"
                  />
                  <Pressable
                    onClick={() => copyProposalLink(selectedProposal.id, selectedProposal.deposit_payment_url)}
                    className="px-4 py-2 bg-accent text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    {copiedId === selectedProposal.id ? 'Copied!' : 'Copy'}
                  </Pressable>
                </div>
              </div>

              {/* Client Info */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Client</h4>
                <p className="text-text-primary">{selectedProposal.client_name}</p>
                <p className="text-text-muted">{selectedProposal.client_email}</p>
              </div>

              {/* Package & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">Package</h4>
                  <p className="text-text-primary">{packageLabels[selectedProposal.package as PackageType]}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">Price</h4>
                  <p className="text-text-primary font-semibold">
                    {formatPrice(getProposalPrice(selectedProposal))}
                  </p>
                  {selectedProposal.custom_price_cents && (
                    <p className="text-xs text-green-600">Custom pricing applied</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedProposal.notes && (
                <div>
                  <h4 className="text-sm font-medium text-text-muted mb-2">Notes</h4>
                  <p className="text-text-primary whitespace-pre-wrap bg-background p-3 rounded-[var(--radius-md)] text-sm">
                    {selectedProposal.notes}
                  </p>
                </div>
              )}

              {/* Status Update */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Status</h4>
                <select
                  value={selectedProposal.status}
                  onChange={(e) => handleStatusChange(selectedProposal.id, e.target.value as ProposalStatus)}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="viewed">Viewed</option>
                  <option value="accepted">Accepted</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Payment URL */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Deposit Payment URL (PayPal)</h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    defaultValue={selectedProposal.deposit_payment_url || ''}
                    placeholder="https://www.paypal.com/paypalme/..."
                    className="flex-1 px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    id={`payment-url-${selectedProposal.id}`}
                  />
                  <Pressable
                    onClick={() => {
                      const input = document.getElementById(`payment-url-${selectedProposal.id}`) as HTMLInputElement;
                      handlePaymentUrlUpdate(selectedProposal.id, input.value);
                    }}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-text-primary text-surface rounded-[var(--radius-md)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Save
                  </Pressable>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Create a PayPal payment link for the deposit amount ({formatPrice(getProposalPrice(selectedProposal) / 2)})
                </p>
              </div>

              {/* Timeline Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-text-muted mb-1">Valid Until</h4>
                  <p className="text-text-primary">{new Date(selectedProposal.valid_until).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-text-muted mb-1">Created</h4>
                  <p className="text-text-primary">{new Date(selectedProposal.created_at).toLocaleDateString()}</p>
                </div>
                {selectedProposal.viewed_at && (
                  <div>
                    <h4 className="font-medium text-text-muted mb-1">First Viewed</h4>
                    <p className="text-text-primary">{new Date(selectedProposal.viewed_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedProposal.accepted_at && (
                  <div>
                    <h4 className="font-medium text-text-muted mb-1">Accepted</h4>
                    <p className="text-text-primary">{new Date(selectedProposal.accepted_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Proposal ID */}
              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Proposal ID</h4>
                <code className="text-sm text-text-muted bg-background px-2 py-1 rounded-[var(--radius-sm)]">
                  {selectedProposal.id}
                </code>
              </div>

              {/* Delete Section */}
              <div className="pt-4 border-t border-border">
                <AnimatePresence mode="wait">
                  {!showDeleteConfirm ? (
                    <motion.button
                      key="delete-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isUpdating}
                      className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      Delete Proposal
                    </motion.button>
                  ) : (
                    <motion.div
                      key="delete-confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <p className="text-sm text-red-800 mb-3">
                        Are you sure you want to delete this proposal? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Pressable
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isUpdating}
                          className="flex-1 px-4 py-2 text-text-muted border border-border rounded-lg hover:bg-background disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </Pressable>
                        <Pressable
                          onClick={() => handleDeleteProposal(selectedProposal.id)}
                          disabled={isUpdating}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isUpdating ? 'Deleting...' : 'Yes, Delete'}
                        </Pressable>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
