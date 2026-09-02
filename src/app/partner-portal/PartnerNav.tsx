'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';

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
  icon: ReactNode;
};

const navItems: NavItem[] = [
  // Dashboard — home
  { href: '/partner-portal', label: 'Dashboard', exact: true, icon: icon('M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75') },
  // Conversions — bar chart / trending
  { href: '/partner-portal/conversions', label: 'Conversions', icon: icon('M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z') },
  // Payouts — bank / building columns
  { href: '/partner-portal/payouts', label: 'Payouts', icon: icon('M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z') },
  // Settings — gear
  { href: '/partner-portal/settings', label: 'Settings', icon: icon('M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z') },
];

// ── A single tab: static content with a clean active pill (layoutId slide)
//    and a subtle hover wash. No cursor-following motion. ──────────
function NavTab({
  item,
  isActive,
  mounted,
}: {
  item: NavItem;
  isActive: boolean;
  mounted: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <Link
        href={item.href}
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
            layoutId="partnerActiveTab"
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
          <span>{item.label}</span>
        </span>
      </Link>
    </div>
  );
}

export default function PartnerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  // Prefetch all partner-portal routes on mount for instant navigation
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

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
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <NavTab
                key={item.href}
                item={item}
                isActive={isActive}
                mounted={mounted}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
