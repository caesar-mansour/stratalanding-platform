"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef, ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface ParallaxWrapperProps {
  children: ReactNode;
  className?: string;
  speed?: number; // Positive = moves slower than scroll, Negative = moves faster
  direction?: "up" | "down" | "left" | "right";
}

export function ParallaxWrapper({
  children,
  className,
  speed = 0.5,
  direction = "up",
}: ParallaxWrapperProps) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const range = [-100 * speed, 100 * speed];

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    direction === "up" ? range : direction === "down" ? range.reverse() : [0, 0]
  );

  const x = useTransform(
    scrollYProgress,
    [0, 1],
    direction === "left" ? range : direction === "right" ? range.reverse() : [0, 0]
  );

  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });
  const smoothX = useSpring(x, { stiffness: 100, damping: 30 });

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{
        y: direction === "up" || direction === "down" ? smoothY : 0,
        x: direction === "left" || direction === "right" ? smoothX : 0,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating animation — CSS-based (compositor thread, zero JS overhead)
interface FloatingElementProps {
  children?: ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
  delay?: number;
}

export function FloatingElement({
  children,
  className,
  duration = 4,
  distance = 15,
  delay = 0,
}: FloatingElementProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`sl-float ${className ?? ''}`}
      style={{
        '--sl-d': `${distance}px`,
        '--sl-dur': `${duration}s`,
        '--sl-delay': `${delay}s`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// Rotating element — CSS-based (compositor thread, zero JS overhead)
interface RotatingElementProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  direction?: "cw" | "ccw";
}

export function RotatingElement({
  children,
  className,
  duration = 20,
  direction = "cw",
}: RotatingElementProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`${direction === "cw" ? "sl-rotate" : "sl-rotate-r"} ${className ?? ''}`}
      style={{ '--sl-dur': `${duration}s` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// Scale on scroll - element grows as it comes into view
interface ScaleOnScrollProps {
  children: ReactNode;
  className?: string;
  scaleRange?: [number, number];
}

export function ScaleOnScroll({
  children,
  className,
  scaleRange = [0.8, 1],
}: ScaleOnScrollProps) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], scaleRange);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  const smoothScale = useSpring(scale, { stiffness: 100, damping: 30 });
  const smoothOpacity = useSpring(opacity, { stiffness: 100, damping: 30 });

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{
        scale: smoothScale,
        opacity: smoothOpacity,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
