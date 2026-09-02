'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePortalData } from './PortalDataContext';

const icon = (d: string, d2?: string) => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  hasNotification?: boolean;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { href: '/portal', label: 'Dashboard', exact: true, icon: icon('M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75') },
  { href: '/portal/onboarding', label: 'Onboarding', icon: icon('M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z') },
  { href: '/portal/proposals', label: 'Proposals', icon: icon('M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z') },
  { href: '/portal/package', label: 'Package', icon: icon('M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9') },
  { href: '/portal/brief', label: 'Brief', icon: icon('M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z') },
  { href: '/portal/milestones', label: 'Milestones', icon: icon('M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5') },
  { href: '/portal/uploads', label: 'Uploads', icon: icon('M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z') },
  { href: '/portal/revisions', label: 'Chat', hasNotification: true, icon: icon('M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z') },
  { href: '/portal/analytics', label: 'Analytics', icon: icon('M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z') },
  { href: '/portal/settings', label: 'Settings', icon: icon('M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z') },
];

const templatesItem: NavItem = {
  href: '/portal/my-templates',
  label: 'My Templates',
  exact: true,
  icon: icon('M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z'),
};

// ── A single tab: static content with a clean active pill (layoutId slide)
//    and a subtle hover wash. No cursor-following motion. ──────────
function NavTab({
  item,
  isActive,
  isLocked,
  unreadCount,
  mounted,
}: {
  item: NavItem;
  isActive: boolean;
  isLocked: boolean;
  unreadCount: number;
  mounted: boolean;
}) {
  // AUDIT 2026-08-12 (P2): a locked tab was blurred to 25% opacity with NO explanation, and for a
  // brand-new client that is most of the nav. The visitor cannot tell whether the product is
  // broken, still loading, or gated — and the worst of those three readings is the one they pick.
  // `title` gives a hover explanation; aria-label carries the same to assistive tech.
  return (
    <div
      className={`relative shrink-0 ${isLocked ? 'opacity-40 pointer-events-none select-none grayscale' : ''}`}
      title={isLocked ? 'Unlocks after your deposit is paid' : undefined}
    >
      <Link
        href={isLocked ? '#' : item.href}
        tabIndex={isLocked ? -1 : undefined}
        aria-disabled={isLocked || undefined}
        aria-label={isLocked ? `${item.label} — unlocks after your deposit is paid` : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex items-center justify-center min-h-[44px] px-2.5 py-2 rounded-xl text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#0891B2]/45 ${
          isActive ? 'text-[#0B1B3A] font-semibold' : 'text-text-muted hover:text-[#0B1B3A]'
        }`}
      >
        {/* hover wash (inactive only) */}
        {!isActive && (
          <span className="absolute inset-0 -z-10 rounded-xl bg-[#0B1B3A]/0 transition-colors duration-200 group-hover:bg-[#0B1B3A]/[0.045]" />
        )}
        {/* active pill — the one indicator */}
        {isActive && mounted && (
          <motion.span
            layoutId="portalActiveTab"
            className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-b from-white/95 to-[#22D3EE]/[0.09] ring-1 ring-[#22D3EE]/35 shadow-[0_4px_16px_-4px_rgba(8,145,178,0.28)] backdrop-blur-sm"
            initial={false}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          />
        )}
        {/* static content — no cursor follow */}
        <span className="relative z-[1] flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={`shrink-0 transition-transform duration-200 ${
              isActive
                ? 'text-accent drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                : 'text-[#1A3A5A]/55 group-hover:text-accent group-hover:scale-110'
            }`}
          >
            {item.icon}
          </span>
          <span className="relative">
            {item.label}
            {item.hasNotification && unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-3 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              >
                {unreadCount}
              </motion.span>
            )}
          </span>
        </span>
      </Link>
    </div>
  );
}

export default function PortalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { onboardingStatus, brief, hasTemplatePurchases, client, projects } = usePortalData();
  // Phone-outreach clients (came from a cold call) skip onboarding entirely.
  const isPhoneLead = (projects || []).some((p) => (p as { source?: string }).source === 'phone');
  // Phone leads shouldn't see pricing/add-ons before they've actually been sent a proposal
  // (status leaves 'new'). Front-loading a $4,800 package on a cold preview kills warm leads.
  const phoneLeadPreProposal = isPhoneLead && (projects || [])
    .filter((p) => (p as { source?: string }).source === 'phone')
    .every((p) => (((p as { status?: string }).status) || 'new') === 'new');
  const onboardingPending = !isPhoneLead && !!brief && onboardingStatus?.status !== 'completed';
  const isTemplateOnlyUser = !client && !!hasTemplatePurchases;

  // Phone leads never see Onboarding. A FRESH phone lead (pre-proposal) also gets a lean
  // portal — Dashboard · Proposals · Chat · Settings — hiding pricing and everything that's
  // empty/premature until they're an actual prospect.
  const hiddenHrefs = new Set<string>();
  if (isPhoneLead) hiddenHrefs.add('/portal/onboarding');
  if (phoneLeadPreProposal) ['/portal/package', '/portal/brief', '/portal/milestones', '/portal/uploads', '/portal/analytics'].forEach((h) => hiddenHrefs.add(h));
  const baseItems = hiddenHrefs.size ? navItems.filter((i) => !hiddenHrefs.has(i.href)) : navItems;

  // Build nav based on user type:
  // Template-only → just "My Templates"
  // Project + templates → all tabs + "My Templates"
  // Project only → normal tabs
  const allNavItems = isTemplateOnlyUser
    ? [templatesItem]
    : hasTemplatePurchases
      ? [...baseItems, templatesItem]
      : baseItems;

  useEffect(() => {
    // Delay glass effect until background content has painted
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Strengthen the bar's blur/shadow once the page is scrolled (depth cue).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Prefetch all portal routes on mount for instant navigation
  useEffect(() => {
    allNavItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router, allNavItems]);

  // Check for new messages
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await fetch('/api/messages');
        if (res.ok) {
          const data = await res.json();
          const messages = data.messages || [];
          const adminMessages = messages.filter((m: { sender_type: string }) => m.sender_type === 'admin');
          let stored: string | null = null;
          try { stored = localStorage.getItem('lastSeenMessageCount'); } catch { /* private mode */ }
          const lastSeen = stored ? parseInt(stored, 10) : 0;
          setUnreadCount(adminMessages.length > lastSeen ? adminMessages.length - lastSeen : 0);
        }
      } catch {
        // Ignore errors
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  // Clear unread when visiting chat page
  useEffect(() => {
    if (pathname === '/portal/revisions') {
      const markAsRead = async () => {
        try {
          const res = await fetch('/api/messages');
          if (res.ok) {
            const data = await res.json();
            const messages = data.messages || [];
            const adminMessages = messages.filter((m: { sender_type: string }) => m.sender_type === 'admin');
            try { localStorage.setItem('lastSeenMessageCount', String(adminMessages.length)); } catch { /* private mode */ }
            setUnreadCount(0);
          }
        } catch {
          // Ignore
        }
      };
      markAsRead();
    }
  }, [pathname]);

  return (
    <nav
      className={`sticky top-0 z-40 border-b border-white/50 transition-all duration-300 ${
        mounted
          ? scrolled
            ? 'bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_-10px_rgba(11,27,58,0.28)]'
            : 'bg-white/60 backdrop-blur-md shadow-[0_4px_24px_-14px_rgba(11,27,58,0.14)]'
          : 'bg-white'
      }`}
    >
      <div
        className="overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, #000 28px, #000 calc(100% - 28px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 28px, #000 calc(100% - 28px), transparent)',
        }}
      >
        <div className="flex w-max mx-auto items-center gap-0.5 pt-2 pb-1.5">
          {allNavItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const isLocked = onboardingPending && item.href !== '/portal/onboarding';
            return (
              <NavTab
                key={item.href}
                item={item}
                isActive={isActive}
                isLocked={isLocked}
                unreadCount={unreadCount}
                mounted={mounted}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
