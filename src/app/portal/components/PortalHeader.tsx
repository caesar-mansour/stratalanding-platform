import Link from 'next/link';
import Image from 'next/image';
import { PortalSwitcher, type PortalRole } from '@/components/layout/PortalSwitcher';

interface PortalHeaderProps {
  email: string;
  roles?: PortalRole[];
}

export function PortalHeader({ email, roles = [] }: PortalHeaderProps) {
  const showSwitcher = roles.length >= 2;
  return (
    <header className="relative overflow-hidden bg-gradient-to-r from-[#E9F6FB] via-[#8FCFE0] to-[#155E7A] border-b border-white/20">
      {/* glowing cyan bottom edge */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#22D3EE]/70 to-transparent" />
      <div className="container relative flex items-center justify-between h-16 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/portal" className="group font-bold text-lg text-[#1A3A5A] flex items-center gap-2 sm:gap-3 min-w-0">
            <Image
              src="/brand/stratalanding.png"
              alt="StrataLanding"
              width={31}
              height={36}
              className="w-auto h-8 sm:h-9 shrink-0 transition-transform duration-300 group-hover:scale-[1.07] group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.45)]"
              unoptimized
            />
            <span className="leading-tight hidden sm:inline">Client Portal</span>
            <span className="leading-tight sm:hidden text-base">Portal</span>
          </Link>
          {showSwitcher && (
            <>
              <div className="w-px h-7 bg-[#1A3A5A]/15" />
              <PortalSwitcher roles={roles} />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/25 ring-1 ring-white/40 rounded-lg backdrop-blur-md shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm text-[#1A3A5A]/80 truncate max-w-[180px]">{email}</span>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="text-sm text-[#1A3A5A]/70 hover:text-[#1A3A5A] flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 min-h-[44px] min-w-[44px] rounded-lg hover:bg-[#1A3A5A]/10 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
