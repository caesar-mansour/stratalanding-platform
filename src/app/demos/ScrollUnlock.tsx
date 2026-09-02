'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Ensures body scroll is never stuck on demo pages.
 * Clears any leftover body.style.overflow on mount and route change.
 */
export function ScrollUnlock() {
  const pathname = usePathname();

  useEffect(() => {
    // Clear any stuck overflow style from modals or other components
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
    }
    // Also ensure html element is clean
    if (document.documentElement.style.overflow === 'hidden') {
      document.documentElement.style.overflow = '';
    }
  }, [pathname]);

  return null;
}
