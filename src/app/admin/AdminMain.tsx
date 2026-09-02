'use client';

import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

export default function AdminMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const isLogin = pathname === '/admin/login';

  return (
    <div className={`relative z-10 ${isLogin ? '' : 'lg:pl-60'}`}>
      {/* Cinematic content reveal — blur-zoom up on every route change */}
      <motion.div
        key={pathname}
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.985, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>

      {/* Cyan→violet light sweep that crosses the screen on each navigation */}
      {!reduce && !isLogin && (
        <motion.span
          key={pathname + ':sweep'}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[20]"
          initial={{ opacity: 0.55, x: '-100%' }}
          animate={{ opacity: 0, x: '120%' }}
          transition={{ duration: 0.85, ease: 'easeInOut' }}
          style={{
            background:
              'linear-gradient(100deg, transparent 32%, rgba(34,211,238,0.16) 48%, rgba(139,92,246,0.12) 56%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}
