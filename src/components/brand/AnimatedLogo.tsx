'use client';

import Image from 'next/image';

interface AnimatedLogoProps {
  /** Logo size in px (default 48) */
  size?: number;
  /** Enable float + glow animation (default true) */
  animate?: boolean;
  className?: string;
}

export default function AnimatedLogo({
  size = 48,
  animate = true,
  className = '',
}: AnimatedLogoProps) {
  const w = Math.round(size * 0.946);
  const h = size;

  if (!animate) {
    return (
      <Image
        src="/brand/stratalanding.png"
        alt="StrataLanding"
        width={w}
        height={h}
        className={`object-contain ${className}`}
        priority
        quality={100}
      />
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center sl-float ${className}`}
      style={{ width: w, height: h, '--sl-d': '4px', '--sl-dur': '3s' } as React.CSSProperties}
    >
      {/* Glow ring — CSS opacity pulse instead of boxShadow (compositor-safe) */}
      <div className="absolute inset-0 rounded-2xl bg-accent/15 blur-lg sl-pulse" />
      <Image
        src="/brand/stratalanding.png"
        alt="StrataLanding"
        width={w}
        height={h}
        className="object-contain relative z-10"
        priority
        quality={100}
      />
    </div>
  );
}
