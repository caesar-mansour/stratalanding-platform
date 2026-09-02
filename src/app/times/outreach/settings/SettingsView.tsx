'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PaperGrainDefs } from '../../_components/PaperGrainDefs';
import { PaperCard } from '../../_components/PaperCard';
import { Colophon } from '../../_components/Colophon';
import { SectionMasthead } from '../../_components/SectionMasthead';
import { BrassButton } from '../../_components/BrassButton';
import { Headline } from '../../_components/Headline';
import { AnimatedModal } from '../../_components/AnimatedModal';
import { apiPath } from '@/lib/api-path';

interface Inbox {
  id: string; label: string; email: string; display_name: string; type: string;
  daily_cap: number; min_spacing_seconds: number; max_spacing_seconds: number;
  active: boolean; paused: boolean; sent_today: number;
  warmup_start_date: string | null; warmup_daily_cap: number | null; notes: string | null;
}

interface Domain {
  domain: string; daily_cap: number; hard_ceiling: number; sent_today: number;
  is_transactional: boolean; notes: string | null;
}

export default function SettingsView({
  inboxes, domains, paused,
}: { inboxes: Inbox[]; domains: Domain[]; paused: boolean }) {
  const [globalPaused, setGlobalPaused] = useState(paused);
  const [inboxState, setInboxState] = useState(inboxes);
  const [saving, setSaving] = useState(false);
  const [addDeskOpen, setAddDeskOpen] = useState(false);

  // Re-sync local state from server props on refresh / navigation. Without this,
  // optimistic updates from toggle handlers stick around even when the server
  // reflects different state, causing settings to "lose" their values on refresh.
  useEffect(() => { setGlobalPaused(paused); }, [paused]);
  useEffect(() => { setInboxState(inboxes); }, [inboxes]);

  async function togglePause() {
    setSaving(true);
    try {
      const r = await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pause' }),
      });
      const d = await r.json();
      if (d.ok) setGlobalPaused(d.outreach_paused);
    } finally { setSaving(false); }
  }

  async function toggleInboxPause(id: string) {
    setSaving(true);
    try {
      const r = await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_inbox_pause', inbox_id: id }),
      });
      const d = await r.json();
      if (d.ok) setInboxState((arr) => arr.map((i) => (i.id === id ? { ...i, paused: d.paused } : i)));
    } finally { setSaving(false); }
  }

  return (
    <div className="relative">
      <PaperGrainDefs />
      <PaperCard padding="lg" as="article" className="md:px-10 lg:px-14 lg:py-10">
        <SectionMasthead
          kicker="Configuration"
          title="Settings"
          description="Master stop-switch, inbox settings, and per-domain sending limits."
        />

        {/* Global kill switch */}
        <section className="mt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <Headline scale="byline" className={globalPaused ? 'crimson-text' : ''}>
                Master Stop {globalPaused && '· Sending is stopped'}
              </Headline>
              <Headline scale="section" italic className="mt-1">
                {globalPaused ? 'No emails are being sent.' : 'Sending is active.'}
              </Headline>
              <p className="font-display ink-soft text-[13px] mt-1" style={{ fontStyle: 'italic' }}>
                When stopped, every worker (send, poll-replies, follow-ups) halts immediately without sending. Stays stopped until you resume.
              </p>
            </div>
            <BrassButton onClick={togglePause} disabled={saving}>
              {saving ? 'Saving…' : globalPaused ? 'Resume Sending' : 'Stop Sending'}
            </BrassButton>
          </div>
        </section>

        <div className="brass-rule mt-7 mb-7" />

        {/* Inboxes — desks */}
        <section>
          <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
            <Headline scale="byline">Inboxes ({inboxState.length})</Headline>
            <BrassButton size="sm" onClick={() => setAddDeskOpen(true)}>
              + Connect a Desk
            </BrassButton>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-7">
            {inboxState.map((i) => (
              <motion.article
                key={i.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="relative pt-4"
              >
                <div className="brass-rule-thin absolute top-0 left-0 right-0" />
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <Headline scale="section" italic className="truncate">{i.email}</Headline>
                    <div className="smallcaps text-[10px] ink-soft mt-1">
                      {i.display_name} · {i.label} · <span className="brass-text">{i.type}</span>
                    </div>
                  </div>
                  <span className={`smallcaps text-[10px] ${i.paused ? 'crimson-text' : 'brass-text'}`}>
                    {i.paused ? 'held' : 'in rotation'}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 mt-3 font-display tabular-nums">
                  <DeskStat label="Letters per day" value={i.daily_cap} />
                  <span className="brass-text">·</span>
                  <DeskStat label="Sent today" value={i.sent_today} />
                  <span className="brass-text">·</span>
                  <DeskStat label="Gap" value={`${i.min_spacing_seconds}–${i.max_spacing_seconds}s`} />
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => toggleInboxPause(i.id)}
                    disabled={saving}
                    className="smallcaps text-[10px] ink-text hover:brass-text underline-offset-4 hover:underline"
                  >
                    {i.paused ? 'bring back into rotation →' : 'hold this desk →'}
                  </button>
                </div>
                {i.notes && (
                  <p className="font-display ink-soft text-[12px] mt-3 pt-2" style={{ fontStyle: 'italic', borderTop: '1px dotted rgba(11,27,58,0.20)' }}>
                    {i.notes}
                  </p>
                )}
              </motion.article>
            ))}
          </div>
        </section>

        <div className="brass-rule mt-7 mb-7" />

        {/* Domain limits */}
        <section>
          <Headline scale="byline" className="mb-4">Standing Limits by Recipient Domain</Headline>
          <ul className="space-y-2">
            {domains.map((d, idx) => (
              <li key={d.domain} className={`flex items-center justify-between gap-3 py-2 ${idx > 0 ? 'border-t' : ''}`} style={{ borderColor: 'rgba(11,27,58,0.08)' }}>
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-display ink-text text-[14px]" style={{ fontStyle: 'italic' }}>{d.domain}</span>
                  {d.is_transactional && <span className="smallcaps text-[10px] crimson-text">transactional</span>}
                </div>
                <div className="font-display tabular-nums text-[13px] ink-text shrink-0">
                  <span className="font-semibold">{d.sent_today}</span>
                  <span className="ink-soft mx-0.5">/</span>
                  <span className="ink-soft">{d.daily_cap}</span>
                  <span className="brass-text mx-2">·</span>
                  <span className="smallcaps text-[10px] ink-soft">ceiling</span>
                  <span className="ml-1 ink-text">{d.hard_ceiling}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="brass-rule-thin mt-7 mb-4" />
        <div className="flex items-baseline gap-2">
          <Headline scale="byline">Coming in a future issue</Headline>
          <span className="smallcaps text-[10px] ink-soft">Templates &amp; follow-ups</span>
        </div>
        <p className="font-display ink-soft text-[12px] mt-1" style={{ fontStyle: 'italic' }}>
          Archetype templates, day 3 / 7 / 14 follow-up bodies, seed inbox test. Drafts are presently composed by <span className="ink-text">rewrite-voice.js</span> and filed on each prospect.
        </p>

        <Colophon />
      </PaperCard>

      <AddDeskModal
        open={addDeskOpen}
        onClose={() => setAddDeskOpen(false)}
        onSaved={() => {
          setAddDeskOpen(false);
          // Reload page to pull the new desk into the server-rendered list
          if (typeof window !== 'undefined') window.location.reload();
        }}
      />
    </div>
  );
}

function DeskStat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="smallcaps text-[10px] ink-soft">{label}</span>
      <span className="text-[15px] font-semibold ink-text">{value}</span>
    </span>
  );
}

function AddDeskModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [dailyCap, setDailyCap] = useState(25);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr('Enter a valid email address');
      return;
    }
    const cleanedPassword = appPassword.replace(/\s+/g, '');
    if (cleanedPassword.length < 8) {
      setErr('App password is too short');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_inbox',
          email: email.trim().toLowerCase(),
          display_name: displayName.trim() || undefined,
          app_password: cleanedPassword,
          daily_cap: dailyCap,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to connect desk');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to connect desk');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      panelClassName="rounded-sm p-7 max-w-md w-full"
      panelStyle={{
        backgroundColor: '#13100A',
        backgroundImage: 'radial-gradient(800px 500px at 50% 0%, rgba(180,145,74,0.10), transparent 60%)',
        border: '1px solid rgba(180,145,74,0.30)',
      }}
    >
      <div>
        <div className="brass-rule mb-4" />
        <Headline scale="byline" className="mb-1">Connect a New Desk</Headline>
        <Headline scale="section" italic>Bring another sending address into rotation.</Headline>
        <p className="font-display ink-soft text-[13px] mt-2 mb-5" style={{ fontStyle: 'italic' }}>
          Use a Gmail account with an app password. Generate one at <span className="ink-text">myaccount.google.com → Security → App passwords</span>.
        </p>

        <div className="space-y-4">
          <FormField label="Gmail address">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caesar.outreach@gmail.com"
              className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display focus:outline-none"
              style={{ borderColor: 'var(--color-ink)', fontStyle: 'italic' }}
            />
          </FormField>

          <FormField label="Display name (optional)">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Caesar @ StrataLanding"
              className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display focus:outline-none"
              style={{ borderColor: 'var(--color-ink)', fontStyle: 'italic' }}
            />
          </FormField>

          <FormField label="App password (16 characters)">
            <input
              type="text"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display tabular-nums focus:outline-none"
              style={{ borderColor: 'var(--color-ink)' }}
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>

          <FormField label="Letters per day (max)">
            <input
              type="number"
              min={1} max={500}
              value={dailyCap}
              onChange={(e) => setDailyCap(Number(e.target.value) || 25)}
              className="w-full bg-transparent border-b ink-text px-1 py-1.5 text-[14px] font-display tabular-nums focus:outline-none"
              style={{ borderColor: 'var(--color-ink)' }}
            />
          </FormField>
        </div>

        {err && <p className="font-display crimson-text text-[12px] mt-3" style={{ fontStyle: 'italic' }}>✦ {err}</p>}

        <div className="brass-rule-thin mt-5 mb-4" />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="smallcaps text-[11px] ink-soft hover:ink-text transition-colors px-2"
          >
            cancel
          </button>
          <BrassButton size="sm" onClick={save} disabled={saving || !email || !appPassword}>
            {saving ? 'Connecting…' : 'Bring into rotation'}
          </BrassButton>
        </div>
      </div>
    </AnimatedModal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="smallcaps text-[10px] ink-soft">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
