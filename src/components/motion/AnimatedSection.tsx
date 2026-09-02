"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef, ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  slideUp,
  slideUpDramatic,
  slideFromLeft,
  slideFromRight,
  scaleUp,
  blurIn,
  fadeIn,
} from "@/lib/motion";

type AnimationType =
  | "fadeIn"
  | "slideUp"
  | "slideUpDramatic"
  | "slideFromLeft"
  | "slideFromRight"
  | "scaleUp"
  | "blurIn";

const animationVariants: Record<AnimationType, Variants> = {
  fadeIn,
  slideUp,
  slideUpDramatic,
  slideFromLeft,
  slideFromRight,
  scaleUp,
  blurIn,
};

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
  className?: string;
  once?: boolean;
  amount?: number;
  custom?: Variants;
}

export function AnimatedSection({
  children,
  animation = "slideUp",
  delay = 0,
  className,
  once = true,
  amount = 0.3,
  custom,
}: AnimatedSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });
  const prefersReducedMotion = useReducedMotion();

  const variants = custom || animationVariants[animation];

  // If user prefers reduced motion, just fade in quickly
  const safeVariants: Variants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.1 } },
      }
    : variants;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={safeVariants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for animating children
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
  once?: boolean;
  amount?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.06,
  delayChildren = 0.1,
  once = true,
  amount = 0.2,
}: StaggerContainerProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });
  const prefersReducedMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
        delayChildren: prefersReducedMotion ? 0 : delayChildren,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual stagger item
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  animation?: AnimationType;
}

export function StaggerItem({
  children,
  className,
  animation = "slideUp",
}: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const variants = animationVariants[animation];

  const safeVariants: Variants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.1 } },
      }
    : variants;

  return (
    <motion.div variants={safeVariants} className={className}>
      {children}
    </motion.div>
  );
}
