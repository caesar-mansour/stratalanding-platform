"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useCallback, ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useThrottledMouse } from "@/lib/useThrottledMouse";
import { useIsTouchDevice } from "@/lib/animation-perf";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  as?: "button" | "div" | "a";
  onClick?: () => void;
  href?: string;
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
  as: Component = "button",
  onClick,
  href,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Disable magnetic effect on touch devices (no hover = wasted listeners)
  const disabled = prefersReducedMotion || isTouchDevice;

  const onMove = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      if (disabled) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set((clientX - centerX) * strength);
      y.set((clientY - centerY) * strength);
    },
    [disabled, strength, x, y]
  );

  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const throttled = useThrottledMouse(onMove, onLeave);

  const MotionComponent = motion[Component] as typeof motion.div;
  const props = Component === "a" ? { href } : { onClick };

  return (
    <MotionComponent
      ref={ref}
      {...props}
      className={className}
      style={{
        x: disabled ? undefined : springX,
        y: disabled ? undefined : springY,
      }}
      {...(disabled ? {} : throttled)}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {children}
    </MotionComponent>
  );
}

// Tilt card effect on hover — rAF-throttled + touch-disabled
interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltStrength?: number;
  glareEnabled?: boolean;
}

export function TiltCard({
  children,
  className,
  tiltStrength = 10,
  glareEnabled = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = useIsTouchDevice();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  // Disable tilt on touch devices
  const disabled = prefersReducedMotion || isTouchDevice;

  const onMove = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      if (disabled) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const percentX = (clientX - centerX) / (rect.width / 2);
      const percentY = (clientY - centerY) / (rect.height / 2);

      rotateX.set(-percentY * tiltStrength);
      rotateY.set(percentX * tiltStrength);

      if (glareEnabled) {
        glareX.set(((clientX - rect.left) / rect.width) * 100);
        glareY.set(((clientY - rect.top) / rect.height) * 100);
        glareOpacity.set(0.15);
      }
    },
    [disabled, tiltStrength, glareEnabled, rotateX, rotateY, glareX, glareY, glareOpacity]
  );

  const onLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    glareOpacity.set(0);
  }, [rotateX, rotateY, glareOpacity]);

  const throttled = useThrottledMouse(onMove, onLeave);

  const backgroundGlowOpacity = useTransform(glareOpacity, [0, 0.15], [0, 1]);
  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) =>
      `radial-gradient(circle at ${gx}% ${gy}%, hsla(var(--accent), 0.25), transparent 65%)`
  );

  return (
    <motion.div
      ref={ref}
      className={`relative rounded-[inherit] group ${className}`}
      style={{
        rotateX: disabled ? undefined : springRotateX,
        rotateY: disabled ? undefined : springRotateY,
        transformStyle: disabled ? undefined : "preserve-3d",
        perspective: disabled ? undefined : 1000,
      }}
      {...(disabled ? {} : throttled)}
    >
      {/* Background glow shadow */}
      {!disabled && (
        <motion.div
          className="absolute -inset-2 bg-accent/20 blur-2xl rounded-[inherit] pointer-events-none"
          style={{ opacity: backgroundGlowOpacity }}
        />
      )}

      <div className="relative z-10 rounded-[inherit] h-full">
        {children}
      </div>

      {glareEnabled && !disabled && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden z-20"
          style={{
            background: glareBackground,
            opacity: glareOpacity,
          }}
        />
      )}
    </motion.div>
  );
}
