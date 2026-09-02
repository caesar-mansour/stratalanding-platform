"use client";

import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useDeviceTier, useVisibility } from "@/lib/animation-perf";

interface FloatingParticlesProps {
  count?: number;
  color?: "accent" | "primary" | "muted";
  size?: "sm" | "md" | "lg";
  speed?: "slow" | "medium" | "fast";
  className?: string;
}

export function FloatingParticles({
  count = 20,
  color = "accent",
  size = "sm",
  speed = "medium",
  className = "",
}: FloatingParticlesProps) {
  const prefersReducedMotion = useReducedMotion();
  const deviceTier = useDeviceTier();
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useVisibility(containerRef);
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<
    { id: number; initialX: number; initialY: number; size: number; duration: number; delay: number; driftX: number; driftY: number }[]
  >([]);

  // Tier-based count reduction
  const effectiveCount = deviceTier === 'low' ? 0 : deviceTier === 'mid' ? Math.min(count, 5) : Math.min(count, 10);

  useEffect(() => {
    setMounted(true);
    setParticles(
      Array.from({ length: effectiveCount }, (_, i) => ({
        id: i,
        initialX: Math.random() * 100,
        initialY: Math.random() * 100,
        size: Math.random() * 0.5 + 0.5,
        duration: Math.random() * 10 + (speed === "slow" ? 20 : speed === "fast" ? 8 : 15),
        delay: Math.random() * 5,
        driftX: (Math.random() - 0.5) * 50,
        driftY: (Math.random() - 0.5) * 50,
      }))
    );
  }, [effectiveCount, speed]);

  const colorClasses = {
    accent: "bg-accent",
    primary: "bg-primary",
    muted: "bg-text-muted",
  };

  const sizeBase = {
    sm: 4,
    md: 6,
    lg: 8,
  };

  // Low tier or reduced motion → render nothing
  if (!mounted || prefersReducedMotion || deviceTier === 'low') {
    return <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} />;
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      data-sl-paused={!isVisible ? "true" : undefined}
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full ${colorClasses[color]} sl-float`}
          style={{
            left: `${particle.initialX}%`,
            top: `${particle.initialY}%`,
            width: sizeBase[size] * particle.size,
            height: sizeBase[size] * particle.size,
            opacity: 0.1 + particle.size * 0.15,
            '--sl-d': `${particle.driftY}px`,
            '--sl-dur': `${particle.duration}s`,
            '--sl-delay': `${particle.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

interface FloatingShapesProps {
  count?: number;
  className?: string;
}

export function FloatingShapes({ count = 6, className = "" }: FloatingShapesProps) {
  const prefersReducedMotion = useReducedMotion();
  const deviceTier = useDeviceTier();
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useVisibility(containerRef);
  const [mounted, setMounted] = useState(false);
  const [shapes, setShapes] = useState<
    { id: number; x: number; y: number; size: number; duration: number; delay: number; type: "circle" | "ring" | "square"; rotation: number }[]
  >([]);

  // Tier-based: max 3 shapes, or 0 on low
  const effectiveCount = deviceTier === 'low' ? 0 : Math.min(count, 3);

  useEffect(() => {
    setMounted(true);
    setShapes(
      Array.from({ length: effectiveCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 60 + 40,
        duration: Math.random() * 15 + 20,
        delay: Math.random() * 5,
        type: ["circle", "ring", "square"][Math.floor(Math.random() * 3)] as "circle" | "ring" | "square",
        rotation: Math.random() * 360,
      }))
    );
  }, [effectiveCount]);

  if (!mounted || prefersReducedMotion || deviceTier === 'low') {
    return <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} />;
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      data-sl-paused={!isVisible ? "true" : undefined}
    >
      {shapes.map((shape) => (
        <div
          key={shape.id}
          className="absolute sl-float"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            '--sl-d': '30px',
            '--sl-dur': `${shape.duration}s`,
            '--sl-delay': `${shape.delay}s`,
            opacity: 0.05,
          } as React.CSSProperties}
        >
          {shape.type === "circle" && (
            <div className="w-full h-full rounded-full bg-accent/50" />
          )}
          {shape.type === "ring" && (
            <div className="w-full h-full rounded-full border-2 border-accent/30" />
          )}
          {shape.type === "square" && (
            <div className="w-full h-full rounded-xl border border-primary/20" />
          )}
        </div>
      ))}
    </div>
  );
}
