"use client";

import { Variants } from "framer-motion";

// ============================================
// MOTION TOKENS - Smoother & Faster
// ============================================

export const duration = {
  instant: 0.08,
  micro: 0.12,
  fast: 0.15,
  normal: 0.22,
  slow: 0.35,
  slower: 0.5,
  dramatic: 0.7,
  epic: 1,
} as const;

export const easing = {
  // Standard easings
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  // Smooth dramatic easings
  bounce: [0.68, -0.4, 0.265, 1.4] as const,
  elastic: [0.68, -0.5, 0.32, 1.5] as const,
  overshoot: [0.34, 1.4, 0.64, 1] as const,
  anticipate: [0.36, 0, 0.66, -0.4] as const,
  // Smooth curves
  smooth: [0.25, 0.1, 0.25, 1] as const,
  snappy: [0.6, 0.05, 0.01, 0.9] as const,
} as const;

export const spring = {
  // Soft and gentle - optimized for smooth 60fps
  soft: { type: "spring", stiffness: 120, damping: 20, mass: 1 } as const,
  // Standard responsive - balanced performance
  default: { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const,
  // Bouncy and playful - reduced bounce for smoothness
  bouncy: { type: "spring", stiffness: 400, damping: 25, mass: 1 } as const,
  // Very bouncy - toned down for performance
  superBouncy: { type: "spring", stiffness: 450, damping: 20, mass: 1 } as const,
  // Snappy and quick - optimized
  snappy: { type: "spring", stiffness: 500, damping: 40, mass: 1 } as const,
  // Wobbly effect - smoother
  wobbly: { type: "spring", stiffness: 200, damping: 18, mass: 1 } as const,
  // Dramatic entrance - smoother
  dramatic: { type: "spring", stiffness: 250, damping: 25, mass: 1 } as const,
} as const;

// ============================================
// ANIMATION VARIANTS - Reusable presets
// ============================================

// Fade variants
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.fast, ease: easing.easeOut }
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.instant, ease: easing.easeIn }
  }
};

// Slide up with fade - smoother
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.easeOut }
  },
  exit: {
    opacity: 0,
    y: 15,
    transition: { duration: duration.fast, ease: easing.easeIn }
  }
};

// Dramatic slide up - faster
export const slideUpDramatic: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: spring.dramatic
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.97,
    transition: { duration: duration.fast }
  }
};

// Slide from left - faster
export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: spring.bouncy
  }
};

// Slide from right - faster
export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: spring.bouncy
  }
};

// Scale up with bounce - faster
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: spring.bouncy
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: { duration: duration.fast }
  }
};

// POP in - faster and smoother
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -5 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: spring.superBouncy
  }
};

// Blur in effect - faster
export const blurIn: Variants = {
  hidden: { opacity: 0, filter: "blur(12px)", scale: 1.05 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: { duration: duration.normal, ease: easing.easeOut }
  }
};

// Hero headline - faster word reveal
export const heroText: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05
    }
  }
};

export const heroWord: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    rotateX: -60,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: spring.dramatic
  }
};

// Stagger container - faster
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1
    }
  }
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  }
};

// Card hover effects
export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
  },
  hover: {
    scale: 1.02,
    y: -6,
    boxShadow: "0 20px 40px -12px rgb(0 0 0 / 0.2)",
    transition: spring.snappy
  },
  tap: {
    scale: 0.98,
    transition: { duration: duration.instant }
  }
};

// Button micro-interactions
export const buttonHover: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.04,
    transition: spring.snappy
  },
  tap: {
    scale: 0.96,
    transition: { duration: duration.instant }
  }
};

// Magnetic effect for interactive elements
export const magneticHover = {
  rest: { x: 0, y: 0 },
  hover: (custom: { x: number; y: number }) => ({
    x: custom.x * 0.25,
    y: custom.y * 0.25,
    transition: spring.soft
  })
};

// Process step variants - faster
export const processStep: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    y: 15
  },
  visible: (custom: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...spring.bouncy,
      delay: custom * 0.08
    }
  })
};

// Line draw animation - faster
export const drawLine: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.2, ease: easing.easeInOut },
      opacity: { duration: 0.2 }
    }
  }
};

// Floating animation — one-shot only (for infinite float, use CSS class "sl-float")
export const float: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-8, 8, -8],
    transition: {
      duration: 3,
      ease: "easeInOut"
    }
  }
};

// Pulse glow — DEPRECATED: use CSS class "sl-pulse" instead (boxShadow is non-compositor)
export const pulseGlow: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 1, 0],
    transition: {
      duration: 1.5,
      ease: "easeInOut"
    }
  }
};

// Shake animation
export const shake: Variants = {
  initial: { x: 0 },
  shake: {
    x: [-8, 8, -8, 8, -4, 4, 0],
    transition: { duration: 0.4 }
  }
};

// Rotate in - faster
export const rotateIn: Variants = {
  hidden: {
    opacity: 0,
    rotate: -120,
    scale: 0.5
  },
  visible: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: spring.bouncy
  }
};

// Flip animation - faster
export const flipIn: Variants = {
  hidden: {
    opacity: 0,
    rotateY: 60,
    scale: 0.85
  },
  visible: {
    opacity: 1,
    rotateY: 0,
    scale: 1,
    transition: spring.dramatic
  }
};

// ============================================
// SCROLL ANIMATION PRESETS
// ============================================

export const scrollRevealConfig = {
  once: true,
  amount: 0.2,
  margin: "-50px"
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Create stagger delay for children
export const staggerDelay = (index: number, baseDelay = 0.06) => ({
  delay: index * baseDelay
});

// Get reduced motion safe variants
export const getReducedMotionVariants = (
  variants: Variants,
  reducedMotion: boolean
): Variants => {
  if (!reducedMotion) return variants;

  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
    exit: { opacity: 0, transition: { duration: 0.01 } }
  };
};
