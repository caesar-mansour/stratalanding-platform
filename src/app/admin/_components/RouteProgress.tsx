'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Thin top progress bar that sweeps on every admin route change — the small
 * "app-grade" feedback cue you see in Linear/Vercel. App Router doesn't expose
 * navigation-start events, so we trigger the sweep when the resolved pathname
 * changes (i.e. the new route has committed).
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setActive(true);
    const t = setTimeout(() => setActive(false), 520);
    return () => clearTimeout(t);
  }, [pathname]);

  if (pathname === '/admin/login') return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[60] h-[3px] origin-left admin-gradient-pan bg-gradient-to-r from-[#0891B2] via-[#22D3EE] to-[#0B1B3A] shadow-[0_0_12px_rgba(8,145,178,0.6)]"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 0.42, ease: [0, 0, 0.2, 1] },
            opacity: { duration: 0.2, ease: [0.4, 0, 1, 1] },
          }}
        />
      )}
    </AnimatePresence>
  );
}
