'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body so the overlay escapes any ancestor
 * that has `transform`, `filter`, or `perspective` set — those create a new
 * containing block, which traps `position: fixed` inside them.
 *
 * (Framer Motion leaves `filter: blur(0px)` on its motion.div elements after
 * animations settle. That's enough to break a viewport-pinned overlay.)
 *
 * The portal is wrapped in `.times-shell` so the scoped Strata Times CSS
 * (Fraunces, smallcaps, brass-rule, ink-text, etc.) applies inside the
 * modal even though it's rendered outside the times layout subtree.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<div className="times-shell">{children}</div>, document.body);
}
