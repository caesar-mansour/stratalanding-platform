'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OutreachCampaign } from './page';
import { SpotlightCard, NumberTicker, LiveDot } from '@/app/admin/_components/motion';
import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';

const statusColors: Record<string, { bg: string; text: string; dot: string; hex: string }> = {
  extracted: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', hex: '#60A5FA' },
  sending: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', hex: '#FBBF24' },
  sent: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400', hex: '#C084FC' },
  follow_up: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400', hex: '#22D3EE' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', hex: '#34D399' },
};

const statusLabels: Record<string, string> = {
  extracted: 'Extracted',
  sending: 'Sending',
  sent: 'Sent',
  follow_up: 'Follow Up',
  completed: 'Completed',
};

const platformIcons: Record<string, string> = {
  email: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  instagram: 'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z',
  linkedin: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0',
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.05 },
  }),
};

export default function OutreachDashboard({
  initialCampaigns,
}: {
  initialCampaigns: OutreachCampaign[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    location: '',
    niche: '',
    platform: 'email',
    leads_extracted: 0,
    notes: '',
  });

  // Stats
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads_extracted, 0);
  const totalSent = campaigns.reduce((sum, c) => sum + c.emails_sent, 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + c.replies, 0);
  const totalBooked = campaigns.reduce((sum, c) => sum + c.booked_calls, 0);
  const totalDeals = campaigns.reduce((sum, c) => sum + c.closed_deals, 0);

  const filtered = filter === 'all' ? campaigns : campaigns.filter((c) => c.status === filter);

  async function handleAdd() {
    if (!formData.location || !formData.niche) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.campaign) {
        setCampaigns((prev) => [data.campaign, ...prev]);
        setFormData({ location: '', niche: '', platform: 'email', leads_extracted: 0, notes: '' });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Failed to add campaign:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, updates: Partial<OutreachCampaign>) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/outreach', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (data.campaign) {
        setCampaigns((prev) => prev.map((c) => (c.id === id ? data.campaign : c)));
      }
    } catch (err) {
      console.error('Failed to update campaign:', err);
    } finally {
      setSaving(false);
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog({ title: 'Delete this campaign?', message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' })).confirmed) return;
    try {
      await fetch('/api/admin/outreach', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Leads', value: totalLeads, color: 'text-blue-400', glow: '#60A5FA' },
          { label: 'Emails Sent', value: totalSent, color: 'text-amber-400', glow: '#FBBF24' },
          { label: 'Replies', value: totalReplies, color: 'text-purple-400', glow: '#C084FC' },
          { label: 'Booked Calls', value: totalBooked, color: 'text-cyan-400', glow: '#22D3EE' },
          { label: 'Closed Deals', value: totalDeals, color: 'text-emerald-400', glow: '#34D399' },
        ].map((stat) => (
          <SpotlightCard key={stat.label} glowColor={stat.glow} className="p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>
              <NumberTicker value={stat.value} />
            </p>
            <p className="text-xs text-text-muted mt-1">{stat.label}</p>
          </SpotlightCard>
        ))}
      </div>

      {/* Filter Tabs + Add Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'extracted', 'sending', 'sent', 'follow_up', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                filter === s
                  ? 'bg-[#0891B2]/20 text-accent font-medium'
                  : 'text-text-muted hover:text-[var(--text-secondary)] hover:bg-[var(--card-bg)]'
              }`}
            >
              {s === 'all' ? 'All' : statusLabels[s]} ({s === 'all' ? campaigns.length : campaigns.filter((c) => c.status === s).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] hover:bg-[#0891B2]/80 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Campaign
        </button>
      </div>

      {/* Add Campaign Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <h3 className="text-lg font-bold text-text-primary mb-4">New Outreach Campaign</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Location *</label>
                    <input
                      type="text"
                      placeholder="Miami, FL"
                      value={formData.location}
                      onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                      className="w-full bg-background border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-[#0891B2]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Niche *</label>
                    <input
                      type="text"
                      placeholder="Med Spa"
                      value={formData.niche}
                      onChange={(e) => setFormData((p) => ({ ...p, niche: e.target.value }))}
                      className="w-full bg-background border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-[#0891B2]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Platform</label>
                    <select
                      value={formData.platform}
                      onChange={(e) => setFormData((p) => ({ ...p, platform: e.target.value }))}
                      className="w-full bg-background border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#0891B2]/50"
                    >
                      <option value="email">Email</option>
                      <option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Leads Extracted</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.leads_extracted || ''}
                      onChange={(e) => setFormData((p) => ({ ...p, leads_extracted: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-background border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-[#0891B2]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-text-muted mb-1.5">Notes</label>
                  <textarea
                    placeholder="Source, filters used, etc."
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full bg-background border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-[#0891B2]/50 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-[var(--text-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving || !formData.location || !formData.niche}
                  className="px-4 py-2 bg-[#0891B2] hover:bg-[#0891B2]/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? 'Adding...' : 'Add Campaign'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-text-muted"
            >
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <p>No campaigns yet. Add your first outreach campaign.</p>
            </motion.div>
          ) : (
            filtered.map((campaign, i) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                index={i}
                isEditing={editingId === campaign.id}
                onEdit={() => setEditingId(editingId === campaign.id ? null : campaign.id)}
                onUpdate={(updates) => handleUpdate(campaign.id, updates)}
                onDelete={() => handleDelete(campaign.id)}
                saving={saving}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  index,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  saving,
}: {
  campaign: OutreachCampaign;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<OutreachCampaign>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [editData, setEditData] = useState({
    emails_sent: campaign.emails_sent,
    replies: campaign.replies,
    booked_calls: campaign.booked_calls,
    closed_deals: campaign.closed_deals,
    status: campaign.status,
    notes: campaign.notes || '',
  });

  const sc = statusColors[campaign.status] || statusColors.extracted;
  const replyRate = campaign.emails_sent > 0 ? ((campaign.replies / campaign.emails_sent) * 100).toFixed(1) : '0';

  return (
    <motion.div
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:border-[#0891B2]/20 transition-colors"
    >
      {/* Main Row */}
      <div className="p-4 flex items-center gap-4">
        {/* Location pin icon */}
        <div className="w-10 h-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {campaign.niche} — {campaign.location}
            </h3>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
              {campaign.status === 'sending' || campaign.status === 'follow_up' ? (
                <LiveDot color={sc.hex} size={6} />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              )}
              {statusLabels[campaign.status]}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="capitalize">{campaign.platform}</span>
            <span>Extracted {new Date(campaign.extracted_at).toLocaleDateString()}</span>
            {campaign.notes && <span className="truncate max-w-[200px]">{campaign.notes}</span>}
          </div>
        </div>

        {/* Stats mini */}
        <div className="hidden sm:flex items-center gap-4 text-center shrink-0">
          <div>
            <p className="text-sm font-bold text-blue-400">{campaign.leads_extracted}</p>
            <p className="text-[10px] text-text-muted">Leads</p>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-400">{campaign.emails_sent}</p>
            <p className="text-[10px] text-text-muted">Sent</p>
          </div>
          <div>
            <p className="text-sm font-bold text-purple-400">{campaign.replies}</p>
            <p className="text-[10px] text-text-muted">Replies</p>
          </div>
          <div>
            <p className="text-sm font-bold text-cyan-400">{campaign.booked_calls}</p>
            <p className="text-[10px] text-text-muted">Calls</p>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-400">{campaign.closed_deals}</p>
            <p className="text-[10px] text-text-muted">Deals</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">{replyRate}%</p>
            <p className="text-[10px] text-text-muted">Reply Rate</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-[#0891B2]/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Edit Section */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-[var(--card-border)] space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Emails Sent</label>
                  <input
                    type="number"
                    value={editData.emails_sent}
                    onChange={(e) => setEditData((p) => ({ ...p, emails_sent: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-background border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[#0891B2]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Replies</label>
                  <input
                    type="number"
                    value={editData.replies}
                    onChange={(e) => setEditData((p) => ({ ...p, replies: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-background border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[#0891B2]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Booked Calls</label>
                  <input
                    type="number"
                    value={editData.booked_calls}
                    onChange={(e) => setEditData((p) => ({ ...p, booked_calls: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-background border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[#0891B2]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Closed Deals</label>
                  <input
                    type="number"
                    value={editData.closed_deals}
                    onChange={(e) => setEditData((p) => ({ ...p, closed_deals: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-background border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[#0891B2]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-muted mb-1">Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData((p) => ({ ...p, status: e.target.value as OutreachCampaign['status'] }))}
                    className="w-full bg-background border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[#0891B2]/50"
                  >
                    <option value="extracted">Extracted</option>
                    <option value="sending">Sending</option>
                    <option value="sent">Sent</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-text-muted mb-1">Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-background border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[#0891B2]/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={onEdit}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-[var(--text-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onUpdate(editData)}
                  disabled={saving}
                  className="px-3 py-1.5 bg-[#0891B2] hover:bg-[#0891B2]/80 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
