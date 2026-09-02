'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { apiPath } from '@/lib/api-path';

const NAV = [
  { href: '/times/outreach/room', label: 'Today', kicker: 'Dashboard', icon: 'room' },
  { href: '/times/outreach', label: 'Overview', kicker: 'Stats', icon: 'grid' },
  { href: '/times/outreach/inbox', label: 'Replies', kicker: 'Inbox', icon: 'inbox' },
  { href: '/times/outreach/prospects', label: 'Prospects', kicker: 'Leads', icon: 'users' },
  { href: '/times/outreach/campaigns', label: 'Campaigns', kicker: 'Lists', icon: 'layers' },
  { href: '/times/outreach/suppressions', label: 'Blocked', kicker: 'Do not email', icon: 'ban' },
  { href: '/times/outreach/settings', label: 'Settings', kicker: 'Inboxes', icon: 'cog' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <aside
      className="w-60 shrink-0 flex flex-col relative"
      style={{
        background: 'linear-gradient(180deg, rgba(245,238,224,0.06) 0%, rgba(245,238,224,0.02) 100%)',
        borderRight: '1px solid rgba(180,145,74,0.30)',
      }}
    >
      {/* Subscriber's Index nameplate */}
      <motion.div
        className="px-5 pt-7 pb-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link href="/times/outreach" className="block group">
          <motion.div
            className="brass-rule origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="font-display leading-tight mt-2 mb-1 group-hover:text-[var(--color-brass)] transition-colors"
            style={{ fontWeight: 900, fontSize: '22px', color: 'var(--color-paper)', letterSpacing: '-0.01em' }}
            initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            The Strata
            <br />Times
          </motion.div>
          <motion.div
            className="brass-rule origin-right mt-2"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="smallcaps text-[9px] mt-2 tracking-[0.22em]"
            style={{ color: 'var(--color-brass)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            Menu
          </motion.div>
        </Link>
      </motion.div>

      {/* Nav — table of contents in vintage paper */}
      <nav className="flex-1 px-5 py-2 space-y-3">
        {NAV.map((item, idx) => {
          const isActive =
            item.href === '/times/outreach'
              ? pathname === '/times/outreach'
              : pathname?.startsWith(item.href);
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              kicker={item.kicker}
              index={idx}
              isActive={!!isActive}
              reduce={!!reduce}
            />
          );
        })}
      </nav>

      {/* Footer — global STOP button */}
      <motion.div
        className="px-5 py-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <div className="brass-rule-thin mb-2" />
        <KillSwitch />
        <div className="smallcaps text-[9px] tracking-[0.20em]" style={{ color: 'rgba(180,145,74,0.55)' }}>
          v0.1
        </div>
      </motion.div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  kicker,
  index,
  isActive,
  reduce,
}: {
  href: string;
  label: string;
  kicker: string;
  index: number;
  isActive: boolean;
  reduce: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -14, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{
        duration: 0.55,
        delay: 0.3 + index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <Link
        href={href}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative flex items-baseline gap-3 group py-1"
      >
        {/* Hovered background slab */}
        <AnimatePresence>
          {hover && !isActive && !reduce && (
            <motion.span
              key="hover-bg"
              className="absolute inset-y-0 -inset-x-2 rounded-[2px]"
              style={{
                background:
                  'linear-gradient(90deg, rgba(201,166,97,0.10) 0%, rgba(201,166,97,0) 80%)',
              }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          )}
        </AnimatePresence>

        {/* Active vertical brass bar */}
        {isActive && (
          <motion.span
            layoutId="navActiveBar"
            className="absolute -left-5 top-0 bottom-0 w-[2px]"
            style={{
              background:
                'linear-gradient(180deg, transparent, var(--color-brass), transparent)',
              boxShadow: '0 0 10px rgba(201,166,97,0.7)',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}

        <motion.span
          className="font-display tabular-nums shrink-0 relative"
          style={{
            color: isActive ? 'var(--color-brass)' : 'rgba(245,238,224,0.40)',
            fontStyle: 'italic',
            fontSize: '11px',
            width: '14px',
          }}
          animate={{ x: hover && !isActive ? 2 : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        >
          {String(index + 1).padStart(2, '0')}
        </motion.span>

        <motion.span
          className="flex-1 min-w-0 relative"
          animate={{ x: hover && !isActive ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <span
            className="font-display block transition-colors"
            style={{
              fontWeight: isActive ? 700 : 500,
              fontSize: '15px',
              color: isActive
                ? 'var(--color-paper)'
                : hover
                ? 'var(--color-paper)'
                : 'rgba(245,238,224,0.75)',
            }}
          >
            {label}
          </span>
          <span
            className="smallcaps text-[9px] block tracking-[0.20em] transition-colors"
            style={{
              color: isActive
                ? 'var(--color-brass)'
                : hover
                ? 'rgba(201,166,97,0.85)'
                : 'rgba(180,145,74,0.55)',
            }}
          >
            {kicker}
          </span>
        </motion.span>

        {isActive && (
          <motion.span
            layoutId="outreachSidebarPin"
            className="shrink-0 brass-text relative"
            transition={{ type: 'spring', stiffness: 420, damping: 35 }}
            style={{ fontSize: '14px', lineHeight: 1 }}
          >
            <motion.span
              animate={
                reduce
                  ? undefined
                  : { rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 1, 1.15, 1] }
              }
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-block' }}
            >
              ✦
            </motion.span>
          </motion.span>
        )}
      </Link>
    </motion.div>
  );
}

// Global stop button — visible from every page. Big red button when sending,
// resume button when paused. One-click access to kill the entire pipeline.
function KillSwitch() {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  // Load current state once on mount
  useEffect(() => {
    let alive = true;
    fetch(apiPath('/api/admin/outreach/settings'))
      .then((r) => r.json())
      .then((d) => { if (alive) setPaused(d.outreach_paused === true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  async function toggle() {
    if (paused === null) return;
    if (!paused) {
      // About to STOP — confirm
      if (!confirm('Stop all sending now? Any emails in the queue will be canceled.')) return;
    }
    setBusy(true);
    try {
      const res = await fetch(apiPath('/api/admin/outreach/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_pause', value: !paused, cancel_queue: !paused }),
      });
      const d = await res.json();
      if (d.ok) setPaused(d.outreach_paused);
    } finally { setBusy(false); }
  }

  if (paused === null) {
    return (
      <div className="font-display text-[11px]" style={{ fontStyle: 'italic', color: 'rgba(245,238,224,0.55)' }}>
        Loading…
      </div>
    );
  }

  if (paused) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 font-display text-[11px]" style={{ fontStyle: 'italic', color: '#D32D40' }}>
          <motion.span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#D32D40' }}
            animate={{
              boxShadow: [
                '0 0 0px rgba(211,45,64,0.0)',
                '0 0 12px rgba(211,45,64,0.9)',
                '0 0 0px rgba(211,45,64,0.0)',
              ],
              scale: [1, 1.25, 1],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span>Sending is stopped</span>
        </div>
        <motion.button
          onClick={toggle}
          disabled={busy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full px-3 py-2 rounded-sm font-display text-[13px] transition disabled:opacity-50"
          style={{
            backgroundColor: 'rgba(180,145,74,0.20)',
            color: 'var(--color-paper)',
            border: '1px solid rgba(180,145,74,0.40)',
            fontWeight: 600,
          }}
        >
          {busy ? 'Resuming…' : 'Resume sending'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 font-display text-[11px]" style={{ fontStyle: 'italic', color: 'rgba(245,238,224,0.70)' }}>
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'var(--color-brass)' }}
          animate={{
            boxShadow: [
              '0 0 0px rgba(201,166,97,0.0)',
              '0 0 12px rgba(201,166,97,0.9)',
              '0 0 0px rgba(201,166,97,0.0)',
            ],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span>Sending is on</span>
      </div>
      <motion.button
        onClick={toggle}
        disabled={busy}
        whileHover={{ scale: 1.02, backgroundColor: '#E03A4D' }}
        whileTap={{ scale: 0.96 }}
        className="w-full px-3 py-2.5 rounded-sm font-display text-[14px] transition disabled:opacity-50 relative overflow-hidden"
        style={{
          backgroundColor: '#D32D40',
          color: '#FBF7EE',
          border: '1px solid #8E0E1C',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: '12px',
        }}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-[40%]"
          style={{
            background:
              'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          }}
          animate={{ x: ['-130%', '230%'] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
        />
        <span className="relative z-10">{busy ? 'Stopping…' : '■ STOP ALL SENDING'}</span>
      </motion.button>
    </div>
  );
}
