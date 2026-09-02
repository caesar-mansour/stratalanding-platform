"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { spring } from "@/lib/motion";

interface AnimatedTextProps {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  animation?: "words" | "letters" | "lines";
  highlightWord?: string;
  highlightClassName?: string;
  delay?: number;
  once?: boolean;
}

export function AnimatedText({
  children,
  className,
  as: Component = "p",
  animation: rawAnimation = "words",
  highlightWord,
  highlightClassName = "text-[#22D3EE]",
  delay = 0,
  once = true,
}: AnimatedTextProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();

  // Auto-fallback: letters mode with long text → words mode (perf guard)
  const animation =
    rawAnimation === "letters" && children.length > 50 ? "words" : rawAnimation;

  // Split text based on animation type
  const elements =
    animation === "letters"
      ? children.split("")
      : animation === "words"
        ? children.split(" ")
        : children.split("\n");

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion
          ? 0
          : animation === "letters"
            ? 0.015
            : 0.04,
        delayChildren: prefersReducedMotion ? 0 : delay,
      },
    },
  };

  // Removed rotateX 3D — uses opacity + y only (compositor-safe)
  const itemVariants: Variants = prefersReducedMotion
    ? {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    }
    : {
      hidden: {
        opacity: 0,
        y: 25,
      },
      visible: {
        opacity: 1,
        y: 0,
        transition: spring.dramatic,
      },
    };

  const MotionComponent = motion[Component];

  return (
    <MotionComponent
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {elements.map((element, index) => {
        const isHighlight = highlightWord && element.includes(highlightWord);

        return (
          <span key={index} className="inline-block whitespace-nowrap">
            <motion.span
              variants={itemVariants}
              className={isHighlight ? highlightClassName : undefined}
              style={{ display: "inline-block", transformOrigin: "bottom" }}
            >
              {element}
            </motion.span>
            {animation === "words" && index < elements.length - 1 && (
              <span className="inline-block">&nbsp;</span>
            )}
          </span>
        );
      })}
    </MotionComponent>
  );
}

// Character by character typing effect — fixed display animation (no layout trigger)
interface TypewriterTextProps {
  children: string;
  className?: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
}

export function TypewriterText({
  children,
  className,
  speed = 50,
  delay = 0,
  cursor = true,
}: TypewriterTextProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();

  const letters = children.split("");

  const containerVariants: Variants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : speed / 1000,
        delayChildren: prefersReducedMotion ? 0 : delay,
      },
    },
  };

  // Fixed: uses opacity + clip-path instead of display: none → inline (layout trigger)
  const letterVariants: Variants = {
    hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    visible: {
      opacity: 1,
      clipPath: "inset(0 0% 0 0)",
      transition: { duration: 0.01 },
    },
  };

  return (
    <motion.span
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={letterVariants}
          style={{ display: "inline-block" }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
      {cursor && (
        <span className="inline-block w-[2px] h-[1em] bg-current ml-1 align-middle sl-cursor-blink" />
      )}
    </motion.span>
  );
}

// Glitch text effect
interface GlitchTextProps {
  children: string;
  className?: string;
}

export function GlitchText({ children, className }: GlitchTextProps) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      {/* CSS-only glitch layers — compositor thread (transform + opacity) */}
      <span
        className="absolute top-0 left-0 text-[#22D3EE] z-0 sl-glitch-a"
        aria-hidden
      >
        {children}
      </span>
      <span
        className="absolute top-0 left-0 text-[#FF0080] z-0 sl-glitch-b"
        aria-hidden
      >
        {children}
      </span>
    </span>
  );
}
