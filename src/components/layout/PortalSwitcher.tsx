'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import type { ReactElement } from 'react';

export type PortalRole = 'client' | 'templates' | 'partner';

interface PortalSwitcherProps {
  roles: PortalRole[];
}

const ROLE_CONFIG: Record<PortalRole, { label: string; href: string; matches: (p: string) => boolean; icon: ReactElement }> = {
  client: {
    label: 'Client',
    href: '/portal',
    matches: (p) => p === '/portal' || (p.startsWith('/portal/') && !p.startsWith('/portal/my-templates')),
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
      </svg>
    ),
  },
  templates: {
    label: 'Templates',
    href: '/portal/my-templates',
    matches: (p) => p.startsWith('/portal/my-templates'),
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    ),
  },
  partner: {
    label: 'Partner',
    href: '/partner-portal',
    matches: (p) => p.startsWith('/partner-portal'),
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
};

export function PortalSwitcher({ roles }: PortalSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (roles.length < 2) return null;

  const activeIdx = Math.max(0, roles.findIndex((r) => ROLE_CONFIG[r].matches(pathname)));
  const widthPct = 100 / roles.length;

  return (
    <div className="relative flex items-center bg-[#0B1B3A]/10 backdrop-blur-sm rounded-full p-0.5">
      {/* Sliding indicator */}
      <motion.div
        className="absolute top-0.5 bottom-0.5 rounded-full bg-white shadow-sm"
        initial={false}
        animate={{ left: `calc(${activeIdx * widthPct}% + 2px)` }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        style={{ width: `calc(${widthPct}% - 4px)` }}
      />

      {roles.map((role, idx) => {
        const cfg = ROLE_CONFIG[role];
        const isActive = idx === activeIdx;
        return (
          <button
            key={role}
            onClick={() => { if (!isActive) router.push(cfg.href); }}
            className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${isActive ? 'text-[#0B1B3A]' : 'text-[#1A3A5A]/50 hover:text-[#1A3A5A]/70'}`}
          >
            {cfg.icon}
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
