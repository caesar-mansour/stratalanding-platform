'use client';

import { useMemo, useState } from 'react';
import type { PreviewLinkRow } from './page';
import { SpotlightCard, NumberTicker, CopyButton, Pressable } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';
import { confirmDialog } from '@/app/admin/_components/ConfirmDialog';

interface Company { slug: string; name: string; city: string; umbrellaUrl: string; email?: string }

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  liked: 'bg-sky-100 text-sky-700',
  approved: 'bg-emerald-100 text-emerald-700',
  exploring: 'bg-amber-100 text-amber-700',
  declined: 'bg-rose-100 text-rose-700',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Sent — awaiting', liked: 'Liked', approved: 'Approved ✦', exploring: 'Exploring', declined: 'Declined',
};
const PKG: Record<string, string> = { starter: 'Presence', growth: 'Lead Page', scale: 'Purchase' };
type Filter = 'all' | 'opened' | 'visited' | 'liked' | 'approved' | 'exploring' | 'declined';
const inputCls = 'bg-white border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--text-primary))] placeholder-[hsl(var(--text-muted))] outline-none focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent))]/20';

// ---- Engagement helpers (migration 049) --------------------------------------------------
const hasOpened = (l: PreviewLinkRow) => !!l.first_opened_at;
const hasVisitedSite = (l: PreviewLinkRow) => !!(l.viewed_site_at || l.site_reached_at);
// Can we follow up? Needs an email on file, and they haven't already given a firm yes/no.
const canFollowUp = (l: PreviewLinkRow) => !!l.contact_email && !['approved', 'declined'].includes(l.status);

function fmtRel(iso: string | null): string {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
function fmtDur(sec: number): string {
  if (!sec || sec < 1) return '0s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60); return `${h}h ${m % 60}m`;
}

interface PreviewEvent { kind: string; surface: string; scroll_pct: number | null; seconds: number | null; stage: string | null; label: string | null; created_at: string }

// A just-minted link has no engagement yet — defaults for the optimistic table insert.
const NO_ENGAGEMENT = {
  first_opened_at: null, last_seen_at: null, open_count: 0,
  viewed_site_at: null, site_reached_at: null,
  gate_scroll_pct: 0, site_scroll_pct: 0, gate_seconds: 0, site_seconds: 0, last_stage: null,
  click_count: 0, liked_at: null, followed_up_at: null, followup_count: 0,
} satisfies Partial<PreviewLinkRow>;

const CLICK_LABEL: Record<string, string> = {
  like: 'Tapped “I love it — let’s do it” ❤',
  not_for_me: 'Tapped “Not for me”',
  exploring: 'Tapped “Just exploring for now”',
  send_proposal: 'Tapped “Yes — send the proposal”',
  resend_code: 'Asked to resend the code',
  resend_login: 'Asked for a login link',
};

const STAGE_TL_LABEL: Record<string, string> = {
  welcome: 'Landed on the welcome page',
  proposal: 'Tapped “I love it — let’s do it”',
  code: 'Started email verification',
  decline: 'Opened the “not for me” step',
  approved: 'Approved ✦',
  'done-approved': 'Approved ✦',
  'done-emailed': 'Approved (already had an account)',
  'done-declined': 'Declined',
  'done-exploring': 'Said “just exploring for now”',
};

function eventLabel(e: PreviewEvent): string {
  const where = e.surface === 'site' ? 'the website' : 'the preview page';
  switch (e.kind) {
    case 'open': return 'Opened the link';
    case 'view_site': return 'Clicked through to their new website';
    case 'site_open': return 'Landed on their new website';
    case 'scroll': return `Scrolled ${e.scroll_pct ?? 0}% of ${where}`;
    case 'dwell': return `${fmtDur(e.seconds ?? 0)} spent on ${where}`;
    case 'hide': return `Left / switched away from ${where}`;
    case 'return': return `Came back to ${where}`;
    case 'stage': return e.stage ? (STAGE_TL_LABEL[e.stage] || e.stage) : 'Advanced a step';
    case 'click': {
      const known = e.label ? CLICK_LABEL[e.label] : null;
      if (known) return known;
      if (e.label?.startsWith('booking_demo')) {
        const who = e.label.split(':')[1]?.trim();
        return `Tested the booking form on their demo${who ? ` (as “${who}”)` : ''} 🔥`;
      }
      return e.label ? `Pressed “${e.label}” on ${where}` : `Pressed something on ${where}`;
    }
    default: return e.kind;
  }
}

// Prewritten text for sending the link by SMS (Quo) right after the call —
// texts don't land in spam folders the way the emails do.
function smsText(name: string, url: string): string {
  return `It's Caesar — great talking with you. Your new ${name} website is ready to see: ${url} — free to look, no obligation. Love it? There's a one-tap button on the page.`;
}

export default function PreviewLinksDashboard({ initialLinks, companies }: { initialLinks: PreviewLinkRow[]; companies: Company[] }) {
  const [links, setLinks] = useState(initialLinks);
  const [filter, setFilter] = useState<Filter>('all');
  // company picker
  const [search, setSearch] = useState('');
  const [pkg, setPkg] = useState('growth');
  const [genSlug, setGenSlug] = useState('');           // slug currently generating
  const [genUrls, setGenUrls] = useState<Record<string, string>>({}); // slug -> freshly minted url
  const [pickErr, setPickErr] = useState('');
  const [lastGen, setLastGen] = useState<{ name: string; url: string } | null>(null); // prominent banner
  // "Send email" (only when the lead agreed on the call)
  const [emailFor, setEmailFor] = useState('');   // slug currently in email mode
  const [emailVal, setEmailVal] = useState('');
  const [sendingSlug, setSendingSlug] = useState('');
  const [sentEmail, setSentEmail] = useState<Record<string, string>>({}); // slug -> email it went to
  // Engagement timeline drawer
  const [detail, setDetail] = useState<PreviewLinkRow | null>(null);
  const [events, setEvents] = useState<PreviewEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  // Per-lead follow-up
  const [followupFor, setFollowupFor] = useState<string | null>(null);        // link id in follow-up mode
  const [sendingFollowup, setSendingFollowup] = useState<string | null>(null);
  const [followupUrl, setFollowupUrl] = useState<Record<string, string>>({});  // id -> refreshed url when email failed

  async function sendFollowup(l: PreviewLinkRow) {
    setSendingFollowup(l.id);
    try {
      const res = await fetch('/api/admin/preview-links/follow-up', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: l.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error('Could not follow up', data.error || l.practice_name); setSendingFollowup(null); return; }
      if (data.emailed) {
        setLinks((ls) => ls.map((x) => x.id === l.id
          ? { ...x, followed_up_at: new Date().toISOString(), followup_count: (x.followup_count || 0) + 1 }
          : x));
        setFollowupFor(null);
        toast.success('Follow-up sent', `Emailed ${l.contact_email}.`);
      } else {
        // Email failed — the link was refreshed, so surface it for a manual send.
        if (data.url) setFollowupUrl((u) => ({ ...u, [l.id]: data.url }));
        toast.error('Email failed', data.emailError || 'Copy the refreshed link and send it manually.');
      }
    } catch { toast.error('Network error', 'Could not reach the server.'); }
    setSendingFollowup(null);
  }

  async function openTimeline(l: PreviewLinkRow) {
    setDetail(l); setEvents([]); setEventsLoading(true);
    try {
      const res = await fetch(`/api/admin/preview-links/${l.id}/events`);
      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch { setEvents([]); }
    setEventsLoading(false);
  }

  // latest link per slug (for status badges)
  const linkBySlug = useMemo(() => {
    const m: Record<string, PreviewLinkRow> = {};
    for (const l of links) if (!m[l.slug]) m[l.slug] = l; // links are newest-first
    return m;
  }, [links]);

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? companies.filter((c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.slug.includes(q)) : companies;
    return list.slice(0, 60);
  }, [search, companies]);

  async function generate(c: Company) {
    setPickErr(''); setGenSlug(c.slug);
    try {
      const res = await fetch('/api/admin/preview-links', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ practiceName: c.name, slug: c.slug, previewUrl: c.umbrellaUrl, package: pkg }),
      });
      const data = await res.json();
      if (!res.ok) { setPickErr(`${c.name}: ${data.error || 'failed'}`); toast.error('Could not generate link', data.error || c.name); setGenSlug(''); return; }
      setGenUrls((g) => ({ ...g, [c.slug]: data.url }));
      setLastGen({ name: c.name, url: data.url });
      setLinks((ls) => [{ id: data.id, practice_name: c.name, slug: c.slug, preview_url: c.umbrellaUrl, current_url: null, package: pkg, contact_email: null, status: 'pending', project_id: null, measured: false, expires_at: '', created_at: new Date().toISOString(), ...NO_ENGAGEMENT }, ...ls]);
      toast.success('Link ready', `Copy it now — shown once for ${c.name}.`);
    } catch { setPickErr('Network error.'); toast.error('Network error', 'Could not reach the server.'); }
    setGenSlug('');
  }

  // Generate + email the link to the lead in one step (raw token only exists at mint time).
  async function sendEmail(c: Company) {
    setPickErr('');
    const email = emailVal.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setPickErr('Enter a valid email address first.'); toast.error('Invalid email', 'Enter a valid email address first.'); return; }
    setSendingSlug(c.slug);
    try {
      const res = await fetch('/api/admin/preview-links', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ practiceName: c.name, slug: c.slug, previewUrl: c.umbrellaUrl, package: pkg, contactEmail: email, send: true }),
      });
      const data = await res.json();
      if (!res.ok) { setPickErr(`${c.name}: ${data.error || 'failed'}`); toast.error('Could not send link', data.error || c.name); setSendingSlug(''); return; }
      setLinks((ls) => [{ id: data.id, practice_name: c.name, slug: c.slug, preview_url: c.umbrellaUrl, current_url: null, package: pkg, contact_email: email, status: 'pending', project_id: null, measured: false, expires_at: '', created_at: new Date().toISOString(), ...NO_ENGAGEMENT }, ...ls]);
      if (data.emailed) {
        setSentEmail((s) => ({ ...s, [c.slug]: email }));
        setEmailFor(''); setEmailVal('');
        toast.success('Link emailed', `Sent to ${email}.`);
      } else {
        // Link created but email failed — surface it + let them copy/send manually.
        setPickErr(data.emailError || 'Email failed — copy the link and send it manually.');
        toast.error('Email failed', 'Copy the link and send it manually.');
        if (data.url) { setGenUrls((g) => ({ ...g, [c.slug]: data.url })); setLastGen({ name: c.name, url: data.url }); }
        setEmailFor('');
      }
    } catch { setPickErr('Network error.'); toast.error('Network error', 'Could not reach the server.'); }
    setSendingSlug('');
  }

  // Remove a single lead row (the preview link). Any real project it became is untouched.
  async function removeLink(l: PreviewLinkRow) {
    const { confirmed } = await confirmDialog({
      title: `Remove ${l.practice_name}?`,
      message: 'Deletes this preview-link lead from the table. Any project they became stays in Projects.',
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/preview-links?id=${encodeURIComponent(l.id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLinks((ls) => ls.filter((x) => x.id !== l.id));
      toast.success('Lead removed', l.practice_name);
    } catch { toast.error('Could not remove lead', 'Try again.'); }
  }

  // Clear everything currently shown (respects the active status filter).
  async function clearVisible() {
    if (visible.length === 0) return;
    const scopeAll = filter === 'all';
    const { confirmed } = await confirmDialog({
      title: scopeAll ? `Clear all ${visible.length} leads?` : `Clear ${visible.length} ${filter} leads?`,
      message: 'This permanently removes these preview-link leads. Any projects they became stay in Projects. This cannot be undone.',
      confirmLabel: 'Clear all',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const res = scopeAll
        ? await fetch('/api/admin/preview-links?all=true', { method: 'DELETE' })
        : await fetch('/api/admin/preview-links', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ ids: visible.map((l) => l.id) }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const removed = new Set(visible.map((l) => l.id));
      setLinks((ls) => ls.filter((l) => !removed.has(l.id)));
      toast.success('Leads cleared', `${data.deleted ?? visible.length} removed.`);
    } catch { toast.error('Could not clear leads', 'Try again.'); }
  }

  const count = (s: string) => links.filter((l) => l.status === s).length;
  const stats = [
    { key: 'all' as Filter, label: 'Links sent', n: links.length, color: 'text-[hsl(var(--text-primary))]' },
    { key: 'opened' as Filter, label: 'Opened', n: links.filter(hasOpened).length, color: 'text-sky-600' },
    { key: 'visited' as Filter, label: 'Visited site', n: links.filter(hasVisitedSite).length, color: 'text-cyan-600' },
    { key: 'liked' as Filter, label: 'Liked ❤', n: links.filter((l) => l.liked_at).length, color: 'text-pink-600' },
    { key: 'approved' as Filter, label: 'Approved', n: count('approved'), color: 'text-emerald-600' },
    { key: 'exploring' as Filter, label: 'Exploring', n: count('exploring'), color: 'text-amber-600' },
    { key: 'declined' as Filter, label: 'Declined', n: count('declined'), color: 'text-rose-600' },
  ];
  const visible =
    filter === 'all' ? links
      : filter === 'opened' ? links.filter(hasOpened)
      : filter === 'visited' ? links.filter(hasVisitedSite)
      : filter === 'liked' ? links.filter((l) => l.liked_at)
      : links.filter((l) => l.status === filter);

  return (
    <div className="space-y-6">
      {/* Freshly minted link — shown ONCE, can't be retrieved later */}
      {lastGen && (
        <div className="rounded-[var(--radius-lg)] border-2 border-emerald-300 bg-emerald-50 p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-emerald-800">✓ Link ready for {lastGen.name}</p>
              <p className="text-xs text-emerald-700/80 mt-0.5">Copy it now and send it — for security this link is shown once and can&apos;t be retrieved later.</p>
            </div>
            <button onClick={() => setLastGen(null)} className="text-emerald-700/60 hover:text-emerald-800 text-sm shrink-0" aria-label="Dismiss">✕</button>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row items-stretch gap-2">
            <input
              readOnly
              value={lastGen.url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2.5 text-sm text-emerald-900 font-mono outline-none"
            />
            <CopyButton
              value={lastGen.url}
              label="Copy link"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg px-5 py-2.5 whitespace-nowrap transition-colors"
            />
            <CopyButton
              value={smsText(lastGen.name, lastGen.url)}
              label="📱 Copy SMS text"
              className="bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-sm font-semibold rounded-lg px-5 py-2.5 whitespace-nowrap transition-colors"
            />
          </div>
        </div>
      )}

      {/* Funnel — sent → opened → visited site → liked → approved */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {stats.map((s) => (
          <SpotlightCard
            key={s.key}
            as="button"
            onClick={() => setFilter(s.key)}
            glowColor="#0891B2"
            className={`text-left p-4 ${filter === s.key ? 'ring-2 ring-accent' : ''}`}
          >
            <div className={`text-2xl font-bold ${s.color}`}><NumberTicker value={s.n} /></div>
            <div className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{s.label}</div>
          </SpotlightCard>
        ))}
      </div>

      {/* Company picker — generate a link for any of your spec-site companies */}
      <div className="bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-[var(--radius-lg)] p-5 sm:p-6 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold text-[hsl(var(--text-primary))]">Generate a preview link</h3>
            <p className="text-sm text-[hsl(var(--text-muted))]">{companies.length} companies with a spec site ready. Pick one to send.</p>
          </div>
          <select value={pkg} onChange={(e) => setPkg(e.target.value)} className={inputCls}>
            <option value="growth">Lead Page — $4,800</option>
            <option value="starter">Presence Page — $2,400</option>
            <option value="scale">Purchase Page — $9,600</option>
          </select>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by practice name or city…" className={`${inputCls} w-full`} />
        {pickErr && <p className="text-sm text-rose-600 mt-2">{pickErr}</p>}
        <div className="mt-3 max-h-[380px] overflow-y-auto divide-y divide-[hsl(var(--border))] border border-[hsl(var(--border))] rounded-lg">
          {filteredCompanies.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[hsl(var(--text-muted))]">No companies match “{search}”.</p>
          ) : filteredCompanies.map((c) => {
            const existing = linkBySlug[c.slug];
            const fresh = genUrls[c.slug];
            return (
              <div key={c.slug} className="px-4 py-3 hover:bg-[hsl(var(--background))] transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[hsl(var(--text-primary))] truncate">{c.name}</p>
                    <p className="text-xs text-[hsl(var(--text-muted))] truncate">{c.city || c.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sentEmail[c.slug]
                      ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Emailed ✓</span>
                      : existing && <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[existing.status] || STATUS_STYLE.pending}`}>{STATUS_LABEL[existing.status] || existing.status}</span>}
                    <a href={c.umbrellaUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent))]">Site ↗</a>
                    <Pressable onClick={() => generate(c)} disabled={genSlug === c.slug}
                      className="border border-[hsl(var(--border))] hover:bg-[hsl(var(--background))] text-[hsl(var(--text-primary))] text-xs font-semibold rounded-lg px-3 py-1.5 disabled:opacity-50 transition-colors">
                      {genSlug === c.slug ? 'Generating…' : existing ? 'New link' : 'Generate link'}
                    </Pressable>
                    <Pressable onClick={() => { setPickErr(''); setEmailFor(emailFor === c.slug ? '' : c.slug); setEmailVal(c.email || existing?.contact_email || ''); }}
                      className="bg-[hsl(var(--accent))] hover:opacity-90 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-opacity">
                      Send email
                    </Pressable>
                  </div>
                </div>
                {emailFor === c.slug && (
                  <div className="mt-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-xs font-semibold text-[hsl(var(--text-muted))]">Send the link to:</span>
                    <a href={`/api/admin/preview-links/preview?practice=${encodeURIComponent(c.name)}`} target="_blank" rel="noopener"
                      className="text-xs font-semibold text-[hsl(var(--accent))] hover:underline">👁 Preview the exact email →</a>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input autoFocus type="email" value={emailVal} onChange={(e) => setEmailVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendEmail(c); }}
                      placeholder="their@email.com — only if they said yes on the call"
                      className={`${inputCls} flex-1`} />
                    <Pressable onClick={() => sendEmail(c)} disabled={sendingSlug === c.slug}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg px-4 py-2 whitespace-nowrap disabled:opacity-50 transition-colors">
                      {sendingSlug === c.slug ? 'Sending…' : 'Send the link'}
                    </Pressable>
                    <button onClick={() => { setEmailFor(''); setEmailVal(''); }} className="text-xs font-semibold text-[hsl(var(--text-muted))] px-2">Cancel</button>
                  </div>
                  </div>
                )}
                {fresh && (
                  <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                    <code className="flex-1 text-xs text-emerald-800 break-all">{fresh}</code>
                    <CopyButton value={fresh} label="Copy" className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold rounded px-2.5 py-1 whitespace-nowrap" />
                    <CopyButton value={smsText(c.name, fresh)} label="📱 SMS" className="bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded px-2.5 py-1 whitespace-nowrap" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-[hsl(var(--text-muted))] mt-2">Showing {filteredCompanies.length} of {companies.length}. After sending, run <code className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-1 rounded">scripts/preview-measure.cjs &lt;token&gt; &lt;theirSite&gt;</code> to attach the proof.</p>
      </div>

      {/* Leads table */}
      <div className="bg-[hsl(var(--surface))] border border-[hsl(var(--border))] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[hsl(var(--border))]">
          <h3 className="font-semibold text-[hsl(var(--text-primary))]">
            {filter === 'all' ? 'All leads'
              : filter === 'opened' ? 'Opened the link'
              : filter === 'visited' ? 'Visited their site'
              : filter === 'liked' ? 'Liked it ❤'
              : `${STATUS_LABEL[filter] || filter} leads`}
            <span className="ml-2 text-[hsl(var(--text-muted))] font-normal">{visible.length}</span>
          </h3>
          {visible.length > 0 && (
            <Pressable onClick={clearVisible}
              className="inline-flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              {filter === 'all' ? 'Clear all' : `Clear these ${visible.length}`}
            </Pressable>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[hsl(var(--border))] text-sm">
            <thead className="bg-[hsl(var(--background))]">
              <tr className="text-left text-[hsl(var(--text-muted))] text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Practice</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Engagement</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Package</th>
                <th className="px-5 py-3 font-medium">Proof</th>
                <th className="px-5 py-3 font-medium">Sent</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {visible.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-[hsl(var(--text-muted))]">{links.length === 0 ? 'No links yet — generate one above.' : 'None in this stage.'}</td></tr>
              ) : visible.map((l) => (
                <tr key={l.id} className="group hover:bg-[hsl(var(--accent))]/[0.04] transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap"><span className="font-medium text-[hsl(var(--text-primary))]">{l.practice_name}</span><div className="text-[hsl(var(--text-muted))] text-xs">{l.slug}</div></td>
                  <td className="px-5 py-4 whitespace-nowrap"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[l.status] || STATUS_STYLE.pending}`}>{STATUS_LABEL[l.status] || l.status}</span></td>
                  <td className="px-5 py-4"><EngagementCell l={l} onOpen={() => openTimeline(l)} /></td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[hsl(var(--text-muted))]">{l.contact_email || '—'}</span>
                        {l.followed_up_at && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 whitespace-nowrap">
                            Followed up ✓{l.followup_count > 1 ? ` ×${l.followup_count}` : ''}
                          </span>
                        )}
                      </div>
                      {canFollowUp(l) && (followupFor === l.id ? (
                        <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg p-2 max-w-xs">
                          <p className="text-[11px] text-[hsl(var(--text-muted))] mb-1.5">
                            {hasOpened(l)
                              ? 'Sends the “what did you think?” nudge — they opened it but haven’t decided.'
                              : 'Sends the “did it reach you?” resend — they haven’t opened it yet.'}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <a href={`/api/admin/preview-links/preview?type=followup&opened=${hasOpened(l) ? 1 : 0}&practice=${encodeURIComponent(l.practice_name)}`}
                              target="_blank" rel="noopener" className="text-[11px] font-semibold text-[hsl(var(--accent))] hover:underline">👁 Preview →</a>
                            <Pressable onClick={() => sendFollowup(l)} disabled={sendingFollowup === l.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-lg px-3 py-1 whitespace-nowrap disabled:opacity-50 transition-colors">
                              {sendingFollowup === l.id ? 'Sending…' : 'Send follow-up'}
                            </Pressable>
                            <button onClick={() => setFollowupFor(null)} className="text-[11px] font-semibold text-[hsl(var(--text-muted))] px-1">Cancel</button>
                          </div>
                          {followupUrl[l.id] && (
                            <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded p-1.5">
                              <code className="flex-1 text-[10px] text-amber-800 break-all">{followupUrl[l.id]}</code>
                              <CopyButton value={followupUrl[l.id]} label="Copy" className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-semibold rounded px-2 py-0.5 whitespace-nowrap" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => { setFollowupFor(l.id); }}
                          className="self-start text-[11px] font-semibold text-[hsl(var(--accent))] hover:underline">
                          {hasOpened(l) ? 'Follow up: ask their thoughts →' : 'Follow up: nudge to open →'}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-[hsl(var(--text-primary))]">{PKG[l.package] || l.package}</td>
                  <td className="px-5 py-4 whitespace-nowrap">{l.measured ? <span className="text-emerald-600 text-xs font-semibold">Measured ✓</span> : <span className="text-[hsl(var(--text-muted))] text-xs">—</span>}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-[hsl(var(--text-muted))] text-xs">{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <a href={l.preview_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] text-xs font-semibold transition-colors">Site ↗</a>
                    {l.status === 'approved' && l.project_id && (
                      <a href={`/admin/projects/${l.project_id}`} className="ml-3 text-emerald-600 hover:text-emerald-700 text-xs font-semibold transition-colors">Open lead →</a>
                    )}
                    <button onClick={() => removeLink(l)} aria-label={`Remove ${l.practice_name}`}
                      className="ml-3 align-middle text-[hsl(var(--text-muted))] hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all">
                      <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engagement timeline drawer */}
      {detail && (
        <TimelineDrawer
          l={detail}
          events={events}
          loading={eventsLoading}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------------------- */
/* Engagement cell — the at-a-glance answer to "did they open it, go to the site, scroll?"  */
/* --------------------------------------------------------------------------------------- */
function EngagementCell({ l, onOpen }: { l: PreviewLinkRow; onOpen: () => void }) {
  if (!hasOpened(l)) {
    return (
      <button onClick={onOpen} className="group flex items-center gap-1.5 text-xs text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] transition-colors">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
        Not opened yet
      </button>
    );
  }
  const visited = hasVisitedSite(l);
  const onSite = !!l.site_reached_at;
  // Show the deepest/longest of whichever surface they actually reached.
  const scroll = onSite ? l.site_scroll_pct : l.gate_scroll_pct;
  const seconds = (l.gate_seconds || 0) + (l.site_seconds || 0);
  return (
    <button onClick={onOpen} className="flex flex-col items-start gap-1 text-left group">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500" />
        Opened{l.open_count > 1 ? ` ×${l.open_count}` : ''}
        <span className="font-normal text-[hsl(var(--text-muted))]">· {fmtRel(l.last_seen_at)}</span>
      </span>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {l.liked_at && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">❤ Liked</span>}
        {visited
          ? <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">🌐 Visited site</span>
          : <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Didn’t open site</span>}
        {scroll > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">📖 {scroll}%</span>}
        {seconds > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">⏱ {fmtDur(seconds)}</span>}
        {l.click_count > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">👆 {l.click_count}</span>}
      </span>
      <span className="text-[10px] text-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity">View timeline →</span>
    </button>
  );
}

/* --------------------------------------------------------------------------------------- */
/* Timeline drawer — the full moment-by-moment event log for one lead.                      */
/* --------------------------------------------------------------------------------------- */
function TimelineDrawer({ l, events, loading, onClose }: { l: PreviewLinkRow; events: PreviewEvent[]; loading: boolean; onClose: () => void }) {
  const visited = hasVisitedSite(l);
  const summary = [
    { label: 'Opens', value: String(l.open_count || (l.first_opened_at ? 1 : 0)) },
    { label: 'Liked it', value: l.liked_at ? '❤ Yes' : 'No' },
    { label: 'Visited site', value: visited ? 'Yes' : 'No' },
    { label: 'Buttons pressed', value: String(l.click_count || 0) },
    { label: 'Scroll (site)', value: l.site_reached_at ? `${l.site_scroll_pct}%` : '—' },
    { label: 'Scroll (page)', value: l.first_opened_at ? `${l.gate_scroll_pct}%` : '—' },
    { label: 'Time on site', value: l.site_reached_at ? fmtDur(l.site_seconds) : '—' },
    { label: 'Time on page', value: l.first_opened_at ? fmtDur(l.gate_seconds) : '—' },
    { label: 'First opened', value: l.first_opened_at ? new Date(l.first_opened_at).toLocaleString() : '—' },
    { label: 'Last seen', value: l.last_seen_at ? fmtRel(l.last_seen_at) : '—' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[hsl(var(--surface))] border-l border-[hsl(var(--border))] shadow-2xl overflow-y-auto animate-[slideIn_0.2s_ease-out]">
        <div className="sticky top-0 bg-[hsl(var(--surface))] border-b border-[hsl(var(--border))] px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[hsl(var(--text-primary))]">{l.practice_name}</h3>
            <p className="text-xs text-[hsl(var(--text-muted))]">Engagement timeline</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {summary.map((s) => (
              <div key={s.label} className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-muted))]">{s.label}</div>
                <div className="text-sm font-semibold text-[hsl(var(--text-primary))] truncate">{s.value}</div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-muted))] mb-3">Every moment, in order</h4>
            {loading ? (
              <p className="text-sm text-[hsl(var(--text-muted))]">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-[hsl(var(--text-muted))]">{l.first_opened_at ? 'No detailed events recorded.' : 'They haven’t opened the link yet.'}</p>
            ) : (
              <ol className="relative border-l border-[hsl(var(--border))] ml-1.5 space-y-4">
                {events.map((e, i) => (
                  <li key={i} className="ml-4">
                    <span className={`absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full ${e.surface === 'site' ? 'bg-cyan-500' : 'bg-sky-400'}`} />
                    <div className="text-sm text-[hsl(var(--text-primary))]">{eventLabel(e)}</div>
                    <div className="text-[11px] text-[hsl(var(--text-muted))]">{new Date(e.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(16px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}
