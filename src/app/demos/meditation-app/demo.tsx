// @ts-nocheck
"use client";

import { useState, FormEvent, useEffect, useRef, useCallback } from "react";
import { ReactElement } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
} from "framer-motion";
import { spring } from "@/lib/motion";
import { Button, Accordion } from "@/components/ui";
import { validateEmail, validatePhone, validateRequired } from "@/lib/utils";
import Link from "next/link";

// Color scheme
const COLORS = {
  primary: "#7c3aed", // Purple
  secondary: "#ec4899", // Pink
  accent: "#06b6d4", // Cyan
  dark: "#1f2937",
  light: "#f9fafb",
  white: "#ffffff",
};

// Animation configuration
const ANIMATION_CONFIG = {
  duration: 0.6,
  stagger: 0.1,
  bounce: 0.3,
};

// App details
const FIRM = {
  name: "Mindful Journey",
  phone: "(555) 987-6543",
  email: "hello@mindfuljourney.app",
};

// Hero rotating words
const HERO_WORDS = [
  "Inner Peace",
  "Mindfulness",
  "Better Sleep",
  "Stress Relief",
  "Mental Clarity",
];

// Statistics
const STATS = [
  { value: 5, suffix: "M+", label: "Active Users" },
  { value: 500, suffix: "+", label: "Guided Meditations" },
  { value: 4.9, suffix: "/5", label: "App Store Rating" },
  { value: 10, suffix: "K+", label: "5-Star Reviews" },
];

// Services
const SERVICES = [
  {
    title: "Guided Meditations",
    description:
      "Expertly crafted meditation sessions for every experience level, from 5-minute quickies to hour-long deep dives.",
    icon: "meditation",
  },
  {
    title: "Sleep Stories",
    description:
      "Drift off to dreamland with soothing narrations designed by sleep scientists to help you fall asleep faster.",
    icon: "sleep",
  },
  {
    title: "Breathing Exercises",
    description:
      "Science-backed breathwork techniques to reduce anxiety, boost energy, and improve focus instantly.",
    icon: "breath",
  },
  {
    title: "Music & Soundscapes",
    description:
      "Immersive ambient sounds and binaural beats to enhance relaxation, concentration, and creativity.",
    icon: "music",
  },
  {
    title: "Daily Mindfulness",
    description:
      "Build a consistent practice with daily reminders, streak tracking, and personalized recommendations.",
    icon: "calendar",
  },
  {
    title: "Expert Teachers",
    description:
      "Learn from world-renowned meditation masters, therapists, and wellness experts in video courses.",
    icon: "teacher",
  },
];

// Client types
const CLIENT_TYPES = [
  {
    title: "Beginners",
    description: "New to meditation and looking for an easy starting point",
  },
  {
    title: "Busy Professionals",
    description: "Need quick stress relief during hectic workdays",
  },
  {
    title: "Sleep Seekers",
    description: "Struggling with insomnia or poor sleep quality",
  },
  {
    title: "Wellness Enthusiasts",
    description: "Want to deepen existing mindfulness practices",
  },
];

// Why choose us
const WHY_US = [
  {
    title: "Personalized for You",
    description:
      "AI-powered recommendations adapt to your mood, goals, and meditation history",
  },
  {
    title: "Offline Access",
    description: "Download sessions and practice anywhere, even without internet",
  },
  {
    title: "Expert-Led Content",
    description: "Created by certified meditation teachers and wellness professionals",
  },
  {
    title: "Progress Tracking",
    description: "Visualize your journey with detailed stats and milestone celebrations",
  },
];

// Testimonials
const TESTIMONIALS = [
  {
    name: "Emma Rodriguez",
    case: "Premium User - 2 Years",
    rating: 5,
    text: "This app completely transformed my relationship with stress. I went from daily anxiety attacks to a calm, centered mindset. The sleep stories are absolute magic - I'm out in minutes!",
  },
  {
    name: "David Chen",
    case: "Premium User - 1 Year",
    rating: 5,
    text: "As a skeptical beginner, I was amazed at how quickly I felt results. The guided meditations are beautifully produced, and the variety keeps me engaged. My focus at work has improved dramatically.",
  },
  {
    name: "Sophia Martinez",
    case: "Premium User - 3 Years",
    rating: 5,
    text: "I've tried every meditation app out there, and this is by far the best. The quality of teachers, the depth of content, and the intuitive design make it an absolute joy to use daily.",
  },
];

// FAQs
const FAQS = [
  {
    question: "Do I need meditation experience to use the app?",
    answer:
      "Absolutely not! We have hundreds of beginner-friendly meditations with clear instructions. Our 'First Steps' program guides you through the basics over 7 days. Most of our users start with zero experience and build a consistent practice within weeks.",
  },
  {
    question: "What's included in the free version?",
    answer:
      "The free tier includes 50+ guided meditations, basic breathing exercises, sleep sounds, and limited music. You can explore core features and see if meditation resonates with you before upgrading to Premium for our full library of 500+ sessions.",
  },
  {
    question: "How is Premium different from the free version?",
    answer:
      "Premium unlocks our entire library of 500+ meditations, sleep stories, courses, offline downloads, advanced progress tracking, ad-free experience, and new content added weekly. Plus, you get exclusive access to live meditation sessions with expert teachers.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes, absolutely. You can cancel anytime from your account settings. Your Premium access continues until the end of your billing period, and there are no cancellation fees. We also offer a 7-day free trial so you can try Premium risk-free.",
  },
  {
    question: "Does meditation really work for anxiety and stress?",
    answer:
      "Yes! Thousands of scientific studies show meditation reduces stress, anxiety, and depression while improving sleep, focus, and emotional regulation. Our users report feeling calmer within just a few days. Results vary by individual, but consistency is key.",
  },
  {
    question: "How long are the meditation sessions?",
    answer:
      "We offer flexibility for every schedule. Sessions range from 3-minute breathing exercises to 60-minute deep meditations. Our most popular lengths are 5, 10, and 20 minutes. You can filter by duration to find what fits your day.",
  },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ANIMATION_CONFIG.duration },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: ANIMATION_CONFIG.duration },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: ANIMATION_CONFIG.duration },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: ANIMATION_CONFIG.duration },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: ANIMATION_CONFIG.duration },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_CONFIG.stagger,
    },
  },
};

// SVG Icons
const MeditationIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2C12 2 8 6 8 10C8 12.2091 9.79086 14 12 14C14.2091 14 16 12.2091 16 10C16 6 12 2 12 2Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M4 18C4 16 6 14 12 14C18 14 20 16 20 18V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V18Z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const SleepIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BreathIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const MusicIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
    <path
      d="M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm12-2c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
    <rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const TeacherIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    <path
      d="M5.5 21v-2a7.5 7.5 0 0115 0v2"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const getServiceIcon = (iconName: string) => {
  switch (iconName) {
    case "meditation":
      return <MeditationIcon />;
    case "sleep":
      return <SleepIcon />;
    case "breath":
      return <BreathIcon />;
    case "music":
      return <MusicIcon />;
    case "calendar":
      return <CalendarIcon />;
    case "teacher":
      return <TeacherIcon />;
    default:
      return <MeditationIcon />;
  }
};

// Floating shapes component
const FloatingShapes = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: `radial-gradient(circle, ${COLORS.primary}15 0%, transparent 70%)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      ))}
    </div>
  );
};

// Animated counter component
const AnimatedCounter = ({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    const duration = 2000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start * 10) / 10);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {prefix}
      {count}
      {suffix}
    </span>
  );
};

// Confetti component
const Confetti = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: [COLORS.primary, COLORS.secondary, COLORS.accent][
              i % 3
            ],
            left: `${Math.random() * 100}%`,
            top: `-10%`,
          }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, Math.random() * 100 - 50],
            rotate: [0, 360],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
};

// Shimmer button component
const ShimmerButton = ({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <motion.button
      className={`relative overflow-hidden px-8 py-4 rounded-full font-semibold text-white ${className}`}
      style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
        animate={{
          x: ["-100%", "200%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 1,
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

// 3D Card component
const Card3D = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Section header component
const SectionHeader = ({
  title,
  subtitle,
  centered = true,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
}) => {
  return (
    <motion.div
      className={`mb-12 ${centered ? "text-center" : ""}`}
      variants={fadeInUp}
    >
      <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: COLORS.dark }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">{subtitle}</p>
      )}
    </motion.div>
  );
};

// Star rating component
const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <motion.svg
          key={i}
          className="w-5 h-5"
          fill={i < rating ? COLORS.accent : "none"}
          stroke={COLORS.accent}
          strokeWidth="2"
          viewBox="0 0 24 24"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </motion.svg>
      ))}
    </div>
  );
};

// Breathing animation component
const BreathingCircle = () => {
  return (
    <div className="relative w-64 h-64 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${COLORS.primary}40, ${COLORS.secondary}40)`,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute inset-8 rounded-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
        }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.p
          className="text-white text-2xl font-bold"
          animate={{
            opacity: [1, 0.5, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
          }}
        >
          Breathe
        </motion.p>
      </motion.div>
    </div>
  );
};

// Main component
export default function MeditationAppPage() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMobileCTA, setShowMobileCTA] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleProgress = useTransform(scrollYProgress, [0, 1], [1, 1.2]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowMobileCTA(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    const nameValidation = validateRequired(formData.name);
    if (!nameValidation.isValid) errors.name = nameValidation.error || "";

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) errors.email = emailValidation.error || "";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setShowSuccess(true);
    setFormData({ name: "", email: "", phone: "", message: "" });

    setTimeout(() => setShowSuccess(false), 5000);
  };

  const scrollToForm = () => {
    document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <motion.div
        className="bg-gradient-to-r text-white py-3 text-center"
        style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-sm md:text-base font-semibold">
          Start Your 7-Day Free Trial - No Credit Card Required
        </p>
      </motion.div>
      {/* Hero Section */}

      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="w-full relative z-40" style={{ background: 'rgba(124,58,237,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #06b6d4, #EC4899)' }}>
              {/* logo icon */}
              <span className="text-base">M</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Mindful Journey</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300">Features</span>
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300">How It Works</span>
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300">Pricing</span>
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300">Science</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white cursor-pointer transition-all border border-white/10 hover:border-white/25 hover:bg-white/5">Features</span>
            <span className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #06b6d4, #EC4899)' }}>Download Free</span>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <FloatingShapes />
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${COLORS.light} 0%, ${COLORS.white} 50%, ${COLORS.primary}10 100%)`,
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.h1
                className="text-5xl md:text-7xl font-bold mb-6"
                style={{ color: COLORS.dark }}
                variants={fadeInUp}
              >
                Find Your{" "}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentWordIndex}
                    className="block bg-clip-text text-transparent"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    {HERO_WORDS[currentWordIndex]}
                  </motion.span>
                </AnimatePresence>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto"
                variants={fadeInUp}
              >
                Join 5 million people discovering calm, clarity, and better
                sleep through guided meditation. Start your mindfulness journey
                today.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
                variants={fadeInUp}
              >
                <ShimmerButton onClick={scrollToForm}>
                  Start Free Trial
                </ShimmerButton>
                <button
                  className="px-8 py-4 border-2 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  style={{ borderColor: COLORS.primary, color: COLORS.primary }}
                >
                  Watch Demo
                </button>
              </motion.div>

              {/* Breathing Circle */}
              <motion.div variants={fadeInUp}>
                <BreathingCircle />
              </motion.div>

              {/* Stats */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16"
                variants={staggerContainer}
              >
                {STATS.map((stat, index) => (
                  <motion.div
                    key={index}
                    className="text-center"
                    variants={scaleIn}
                  >
                    <div
                      className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                      }}
                    >
                      <AnimatedCounter
                        value={stat.value}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                      />
                    </div>
                    <div className="text-gray-600">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <SectionHeader
              title="Everything You Need to Thrive"
              subtitle="Comprehensive tools for mind, body, and spirit"
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SERVICES.map((service, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <Card3D className="h-full">
                    <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow h-full">
                      <div
                        className="w-16 h-16 mb-6 text-white rounded-2xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                        }}
                      >
                        {getServiceIcon(service.icon)}
                      </div>
                      <h3 className="text-2xl font-bold mb-4" style={{ color: COLORS.dark }}>
                        {service.title}
                      </h3>
                      <p className="text-gray-600">{service.description}</p>
                    </div>
                  </Card3D>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who We Serve Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <SectionHeader
              title="Perfect For Everyone"
              subtitle="Whether you're a beginner or experienced meditator"
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {CLIENT_TYPES.map((type, index) => (
                <motion.div
                  key={index}
                  className="p-6 rounded-2xl border-2 hover:shadow-lg transition-all"
                  style={{
                    borderColor: COLORS.primary,
                    background: `linear-gradient(135deg, ${COLORS.primary}05, ${COLORS.secondary}05)`,
                  }}
                  variants={fadeInUp}
                  whileHover={{ y: -5 }}
                >
                  <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.primary }}>
                    {type.title}
                  </h3>
                  <p className="text-gray-600">{type.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <SectionHeader
              title="Why Mindful Journey?"
              subtitle="The most comprehensive meditation experience available"
            />

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {WHY_US.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex gap-4"
                  variants={slideInLeft}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                    }}
                  >
                    <span className="text-white text-xl font-bold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.dark }}>
                      {item.title}
                    </h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <SectionHeader
              title="Loved by Millions"
              subtitle="Real stories from our community"
            />

            <div className="grid md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((testimonial, index) => (
                <motion.div
                  key={index}
                  className="bg-white p-8 rounded-2xl shadow-lg border-2"
                  style={{ borderColor: COLORS.light }}
                  variants={fadeInUp}
                  whileHover={{ y: -10 }}
                >
                  <StarRating rating={testimonial.rating} />
                  <p className="text-gray-700 my-6 italic">
                    "{testimonial.text}"
                  </p>
                  <div className="border-t pt-4" style={{ borderColor: COLORS.light }}>
                    <p className="font-bold" style={{ color: COLORS.dark }}>
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-gray-500">{testimonial.case}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <SectionHeader
              title="Common Questions"
              subtitle="Everything you need to know about getting started"
            />

            <div className="max-w-4xl mx-auto">
              <Accordion
                items={FAQS.map((faq) => ({
                  title: faq.question,
                  content: faq.answer,
                }))}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 bg-white relative overflow-hidden">
        {showSuccess && <Confetti />}
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <SectionHeader
              title="Start Your Free Trial Today"
              subtitle="No credit card required. Cancel anytime."
            />

            <motion.div
              className="max-w-2xl mx-auto p-8 rounded-2xl shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.secondary}10)`,
              }}
              variants={fadeInUp}
            >
              <AnimatePresence mode="wait">
                {showSuccess ? (
                  <motion.div
                    key="success"
                    className="text-center py-12"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                      }}
                    >
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold mb-4" style={{ color: COLORS.dark }}>
                      Welcome to Mindful Journey!
                    </h3>
                    <p className="text-xl text-gray-600">
                      Check your email for your free trial access link. Your
                      journey to inner peace starts now.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-semibold mb-2"
                        style={{ color: COLORS.dark }}
                      >
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                          formErrors.name
                            ? "border-red-500"
                            : "border-gray-200 focus:border-purple-500"
                        }`}
                        placeholder="Jane Smith"
                      />
                      {formErrors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold mb-2"
                        style={{ color: COLORS.dark }}
                      >
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none transition-colors ${
                          formErrors.email
                            ? "border-red-500"
                            : "border-gray-200 focus:border-purple-500"
                        }`}
                        placeholder="jane@example.com"
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-semibold mb-2"
                        style={{ color: COLORS.dark }}
                      >
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-semibold mb-2"
                        style={{ color: COLORS.dark }}
                      >
                        What brings you to meditation? (Optional)
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
                        placeholder="Tell us about your goals..."
                      />
                    </div>

                    <motion.button
                      type="submit"
                      className="w-full py-4 rounded-full font-bold text-white text-lg disabled:opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Starting Your Trial..." : "Start 7-Day Free Trial"}
                    </motion.button>

                    <p className="text-center text-sm text-gray-500">
                      No credit card required. Cancel anytime during your trial.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        className="py-20 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
        }}
      >
        <FloatingShapes />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold mb-6"
              variants={fadeInUp}
            >
              Your Journey to Inner Peace Starts Now
            </motion.h2>
            <motion.p className="text-xl mb-8" variants={fadeInUp}>
              Join millions finding calm, clarity, and better sleep. Try premium features free for 7 days.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={fadeInUp}
            >
              <button
                onClick={scrollToForm}
                className="px-8 py-4 bg-white rounded-full font-bold hover:bg-gray-100 transition-colors"
                style={{ color: COLORS.primary }}
              >
                Start Free Trial
              </button>
              <button className="px-8 py-4 border-2 border-white rounded-full font-bold hover:bg-white transition-colors hover:text-purple-600">
                Learn More
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <AnimatePresence>
        {showMobileCTA && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl p-4 z-50 md:hidden border-t-4"
            style={{ borderColor: COLORS.primary }}
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            <button
              onClick={scrollToForm}
              className="w-full py-3 rounded-full font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
              }}
            >
              Start Free Trial
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">{FIRM.name}</h3>
              <p className="text-gray-400">
                Bringing mindfulness and meditation to millions worldwide.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <p className="text-gray-400 mb-2">Phone: {FIRM.phone}</p>
              <p className="text-gray-400">Email: {FIRM.email}</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} {FIRM.name}. All rights reserved.
              This is a demo landing page created with StrataLanding.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
