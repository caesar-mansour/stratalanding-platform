'use client';

/**
 * Brass-pressed primary CTA. Visually distinct from plain buttons — uses
 * `.brass-button` styles in globals.css, plus motion: a magnetic pull on
 * hover, a shimmer that sweeps across when hovered, and a brass ripple
 * pulse on click.
 */
import {
  ButtonHTMLAttributes,
  ReactNode,
  useRef,
  useState,
  MouseEvent as RMouseEvent,
} from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from 'framer-motion';

type Ripple = { id: number; x: number; y: number };

type BrassProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDragStart'
  | 'onDrag'
  | 'onDragEnd'
> & {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function BrassButton({
  children,
  className = '',
  size = 'md',
  onClick,
  disabled,
  ...rest
}: BrassProps) {
  const pad =
    size === 'lg'
      ? 'px-7 py-3 text-[14px]'
      : size === 'sm'
      ? 'px-3 py-1.5 text-[12px]'
      : 'px-5 py-2.5 text-[13px]';

  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18 });
  const sy = useSpring(y, { stiffness: 250, damping: 18 });
  const [hovering, setHovering] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  function onMove(e: RMouseEvent<HTMLButtonElement>) {
    if (reduce || !ref.current || disabled) return;
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    x.set(dx * 6);
    y.set(dy * 4);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
    setHovering(false);
  }

  function handleClick(e: RMouseEvent<HTMLButtonElement>) {
    if (!disabled && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setRipples((rs) => [...rs, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(() => setRipples((rs) => rs.filter((rp) => rp.id !== id)), 700);
    }
    onClick?.(e);
  }

  return (
    <motion.button
      ref={ref}
      {...rest}
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`brass-button rounded-sm inline-flex items-center justify-center gap-2 relative overflow-hidden ${pad} ${className}`}
    >
      {/* Shimmer sweep on hover */}
      <AnimatePresence>
        {hovering && !disabled && !reduce && (
          <motion.span
            key="sweep"
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-[55%]"
            initial={{ x: '-110%', opacity: 0 }}
            animate={{ x: '210%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.95, ease: 'easeInOut' }}
            style={{
              background:
                'linear-gradient(105deg, transparent 0%, rgba(255,240,200,0.55) 50%, transparent 100%)',
              mixBlendMode: 'screen',
              filter: 'blur(2px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Ripples on click */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              left: r.x,
              top: r.y,
              width: 8,
              height: 8,
              marginLeft: -4,
              marginTop: -4,
              background: 'rgba(255,240,200,0.6)',
              boxShadow: '0 0 14px rgba(255,235,180,0.7)',
            }}
            initial={{ scale: 0.4, opacity: 0.85 }}
            animate={{ scale: 16, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
