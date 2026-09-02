"use client";

import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 2,
  delay = 0,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();

  const springValue = useSpring(0, {
    duration: prefersReducedMotion ? 0.1 : duration * 1000,
    bounce: 0.2,
  });

  const displayValue = useTransform(springValue, (latest) =>
    decimals > 0 ? latest.toFixed(decimals) : Math.round(latest).toString()
  );

  const [displayText, setDisplayText] = useState(prefix + "0" + suffix);

  useEffect(() => {
    const unsubscribe = displayValue.on("change", (latest) => {
      setDisplayText(prefix + latest + suffix);
    });
    return unsubscribe;
  }, [displayValue, prefix, suffix]);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        springValue.set(value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, springValue, delay]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.3, delay }}
    >
      {displayText}
    </motion.span>
  );
}

// Parse metric strings like "42%", "50+", "3.2x"
export function parseMetricValue(metric: string): {
  value: number;
  prefix: string;
  suffix: string;
  decimals: number;
} {
  // Match number (including decimals) and surrounding text
  const match = metric.match(/^([^\d]*)([\d.]+)(.*)$/);

  if (!match) {
    return { value: 0, prefix: "", suffix: metric, decimals: 0 };
  }

  const [, prefix, numStr, suffix] = match;
  const value = parseFloat(numStr);
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;

  return { value, prefix, suffix, decimals };
}

// Animated metric that parses string format automatically
interface AnimatedMetricProps {
  metric: string;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedMetric({
  metric,
  duration = 2,
  delay = 0,
  className,
}: AnimatedMetricProps) {
  const { value, prefix, suffix, decimals } = parseMetricValue(metric);

  return (
    <AnimatedCounter
      value={value}
      prefix={prefix}
      suffix={suffix}
      decimals={decimals}
      duration={duration}
      delay={delay}
      className={className}
    />
  );
}
