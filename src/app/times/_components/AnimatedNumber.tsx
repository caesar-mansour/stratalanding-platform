'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useMotionValue, useTransform, motion } from 'framer-motion';

/**
 * Count-up odometer for newspaper stats. Springs from previous value to next
 * whenever `value` changes — feels like a flipping ticker board.
 */
export function AnimatedNumber({
  value,
  className = '',
  style,
  format = (n: number) => Math.round(n).toLocaleString(),
  duration = 1.2,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
  format?: (n: number) => string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => format(v));
  const previous = useRef(0);

  useEffect(() => {
    if (!inView && previous.current === 0) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, inView, motionValue, duration]);

  return (
    <motion.span ref={ref} className={className} style={style}>
      {display}
    </motion.span>
  );
}
