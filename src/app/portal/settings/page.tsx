'use client';

import { useState } from 'react';
import { usePortalData } from '../PortalDataContext';
import Link from 'next/link';
import { RevealGroup, RevealItem, PortalButton, PortalPageHeader } from '../components/portal-ui';

const GLASS = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-[0_1px_2px_-1px_rgba(11,27,58,0.08),0_12px_40px_-12px_rgba(11,27,58,0.20),inset_0_1px_0_0_rgba(255,255,255,0.7)]';

const PKG: Record<string, string> = { starter: 'Presence Page', growth: 'Lead Page', scale: 'Purchase Page' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span className="text-sm text-text-muted">{label}</span>
      <div className="text-text-primary font-medium text-right">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { userEmail, client, projects, brief } = usePortalData();
  const [name, setName] = useState(client?.name || '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const plan = projects[0]?.package ? PKG[projects[0].package] || projects[0].package : null;
  const business = brief?.company_name || null;
  const memberSince = client?.created_at
    ? new Date(client.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  async function saveName() {
    setErr('');
    if (!name.trim()) { setErr('Name is required.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/portal/account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Could not save.'); setBusy(false); return; }
      setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { setErr('Network error.'); }
    setBusy(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PortalPageHeader eyebrow="Account" title="Settings" subtitle="Manage your account settings" />

      <RevealGroup className="space-y-4">
        {/* Account Info */}
        <RevealItem>
          <div className={`${GLASS} p-6`}>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Account</h2>
            <div className="divide-y divide-border">
              {/* Name (editable) */}
              <div className="py-3.5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-muted">Name</span>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={name} onChange={(e) => setName(e.target.value)} autoFocus
                        className="rounded-lg border border-border bg-white/80 px-3 py-1.5 text-sm text-text-primary outline-none transition focus:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50"
                      />
                      <PortalButton onClick={saveName} disabled={busy}
                        className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50">
                        {busy ? 'Saving…' : 'Save'}
                      </PortalButton>
                      <button onClick={() => { setEditing(false); setName(client?.name || ''); setErr(''); }}
                        className="rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-text-primary font-medium">{client?.name || '—'}</span>
                      <button onClick={() => setEditing(true)}
                        className="rounded-md text-sm font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50">Edit</button>
                    </div>
                  )}
                </div>
                {err && <p className="text-sm text-red-600 mt-2 text-right">{err}</p>}
                {saved && <p className="text-sm text-emerald-600 mt-2 text-right">Saved ✓</p>}
              </div>

              <Row label="Email">{userEmail}</Row>
              {business && <Row label="Business">{business}</Row>}
              {plan && <Row label="Plan">{plan}</Row>}
              {memberSince && <Row label="Member since">{memberSince}</Row>}
            </div>
          </div>
        </RevealItem>

        {/* Security */}
        <RevealItem>
          <Link
            href="/portal/settings/security"
            className={`group block ${GLASS} p-6 transition-all duration-200 hover:-translate-y-[3px] hover:border-[#22D3EE]/40 hover:shadow-[0_16px_44px_-12px_rgba(8,145,178,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE]/50`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Security</h2>
                  <p className="text-sm text-text-muted">Manage your password and two-factor authentication</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-text-muted group-hover:text-[var(--color-accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </RevealItem>
      </RevealGroup>
    </div>
  );
}
