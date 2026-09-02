'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AnimatedLogo from '@/components/brand/AnimatedLogo';

type NavItem = { href: string; label: string; icon: ReactNode };
type NavGroup = { label: string; items: NavItem[] };

const icon = (d: string, extra?: string) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    {extra && <path strokeLinecap="round" strokeLinejoin="round" d={extra} />}
  </svg>
);

const navGroups: NavGroup[] = [
  {
    label: 'Pipeline',
    items: [
      { href: '/admin/briefs', label: 'Briefs', icon: icon('M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z') },
      { href: '/admin/quotes', label: 'Quotes', icon: icon('M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z') },
      { href: '/admin/preview-links', label: 'Phone Leads', icon: icon('M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z') },
      { href: '/admin/outreach-clients', label: 'Outreach', icon: icon('M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0') },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { href: '/admin', label: 'Projects', icon: icon('M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z') },
      { href: '/admin/proposals', label: 'Proposals', icon: icon('M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z') },
      { href: '/admin/clients', label: 'Clients', icon: icon('M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z') },
      { href: '/admin/tasks', label: 'Tasks', icon: icon('M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z') },
      { href: '/admin/messages', label: 'Messages', icon: icon('M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z') },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: icon('M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z') },
      { href: '/admin/affiliates', label: 'Affiliates', icon: icon('M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.864-3.554a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244') },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/templates', label: 'Templates', icon: icon('M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z') },
      { href: '/admin/security', label: 'Security', icon: icon('M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z') },
      { href: '/admin/settings', label: 'Settings', icon: icon('M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z') },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  if (pathname === '/admin/login') return null;

  const isItemActive = (href: string) =>
    pathname === href ||
    (href !== '/admin' && pathname.startsWith(href)) ||
    (href === '/admin' && pathname.startsWith('/admin/projects'));

  let runningIndex = 0;

  const navBody = (
    <nav className="flex-1 overflow-y-auto py-3 px-3">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="px-3.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1A3A5A]/40">
            {group.label}
          </p>
          {group.items.map((item) => {
            const isActive = isItemActive(item.href);
            const i = runningIndex++;
            return (
              <motion.div
                key={item.href}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 + i * 0.025, duration: 0.32, ease: [0.2, 0, 0, 1] }}
              >
                <Link
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3.5 py-2.5 my-0.5 text-sm rounded-xl transition-colors duration-150 ${
                    isActive
                      ? 'text-[#0B1B3A] font-semibold'
                      : 'text-[#1A3A5A]/60 hover:text-[#0B1B3A] hover:bg-white/30'
                  }`}
                >
                  {isActive && mounted && (
                    <motion.span
                      layoutId="adminActiveBar"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-[#22D3EE] via-[#0891B2] to-[#22D3EE] shadow-[0_0_16px_3px_rgba(34,211,238,0.9)]"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    >
                      <motion.span
                        className="absolute inset-0 rounded-r-full bg-[#22D3EE]"
                        animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </motion.span>
                  )}
                  {isActive && mounted && (
                    <motion.span
                      layoutId="adminActivePill"
                      className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-[#22D3EE]/20 via-white/55 to-white/40 ring-1 ring-[#22D3EE]/40 shadow-[0_0_22px_rgba(34,211,238,0.28)] backdrop-blur-sm"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    />
                  )}
                  <span
                    className={`shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                      isActive
                        ? 'text-accent drop-shadow-[0_0_6px_rgba(34,211,238,0.75)]'
                        : 'text-[#1A3A5A]/55 group-hover:text-accent'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A] border-b border-[#3A6A8A]/20">
        <Link href="/admin" className="flex items-center gap-2.5">
          <AnimatedLogo size={30} animate={false} />
          <span className="text-sm font-bold text-[#0B1B3A] tracking-wide uppercase">Admin</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="p-2 rounded-lg text-[#0B1B3A] hover:bg-[#1A3A5A]/10 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-[#0B1B3A]/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-gradient-to-b from-[#EEF4FA] via-[#9ABCD8] to-[#3A6A8A] border-r border-[#3A6A8A]/25 shadow-[2px_0_24px_rgba(11,27,58,0.08)] transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Soft top sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/40 to-transparent" />

        {/* Brand header */}
        <div className="relative flex items-center justify-between h-16 px-5 shrink-0 border-b border-[#1A3A5A]/10">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <motion.div whileHover={{ scale: 1.08, rotate: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <AnimatedLogo size={36} animate={false} />
            </motion.div>
            <span className="leading-tight">
              <span className="block text-base font-bold text-[#0B1B3A] tracking-wide uppercase">Admin</span>
              <span className="block text-[10px] font-medium text-[#1A3A5A]/45 tracking-wide">Studio console</span>
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="lg:hidden p-1.5 rounded-lg text-[#1A3A5A]/70 hover:bg-[#1A3A5A]/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Command palette trigger */}
        <div className="relative px-3 pt-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('admin:cmdk'))}
            className="group flex w-full items-center gap-2 rounded-xl bg-white/35 px-3 py-2 text-left ring-1 ring-white/40 transition-colors hover:bg-white/55"
          >
            <svg className="w-4 h-4 text-[#1A3A5A]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span className="flex-1 text-sm text-[#1A3A5A]/55">Search…</span>
            <kbd className="rounded-md bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold text-[#1A3A5A]/70 ring-1 ring-[#1A3A5A]/10">⌘K</kbd>
          </button>
        </div>

        {navBody}

        {/* Footer: live status + sign out */}
        <div className="relative shrink-0 p-3 border-t border-[#1A3A5A]/10 space-y-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/35 px-3 py-2 ring-1 ring-white/40">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-[#0B1B3A]">All systems live</p>
              <p className="text-[10px] text-[#1A3A5A]/50">Auto-refresh · 10s</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/admin/auth', { method: 'DELETE' });
              router.push('/admin/login');
              router.refresh();
            }}
            className="w-full flex items-center gap-3 text-sm text-[#1A3A5A]/60 hover:text-red-600 transition-colors px-3.5 py-2.5 rounded-xl hover:bg-white/40"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
