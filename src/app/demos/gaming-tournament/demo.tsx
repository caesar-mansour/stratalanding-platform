// @ts-nocheck
"use client";

import { useState, FormEvent, useEffect, useRef, useCallback } from "react";
import { ReactElement } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useInView } from "framer-motion";
import { spring } from "@/lib/motion";
import { Button, Accordion } from "@/components/ui";
import { validateEmail, validatePhone, validateRequired } from "@/lib/utils";
import Link from "next/link";

const COLORS = {
  primary: "#FFD700",
  secondary: "#FF4500",
  accent: "#9370DB",
  dark: "#0A0612",
  darker: "#030106",
  light: "#FFFFFF",
  gradient: "linear-gradient(135deg, #FFD700 0%, #FF4500 50%, #9370DB 100%)",
};

const ANIMATION_CONFIG = {
  duration: 0.6,
  stagger: 0.1,
  ease: [0.25, 0.46, 0.45, 0.94],
};

const FIRM = "Champions League Gaming";

const HERO_WORDS = ["Compete", "Conquer", "Champion", "Glory"];

const STATS = [
  { value: 500, suffix: "+", label: "Tournaments Hosted" },
  { value: 50, suffix: "M", label: "Prize Pool Total" },
  { value: 100, suffix: "K+", label: "Registered Players" },
  { value: 200, suffix: "+", label: "Countries Represented" },
];

const SERVICES = [
  {
    title: "Tournament Management",
    description: "End-to-end tournament organization from registration to prize distribution. Professional bracket systems, live scoring, and real-time updates.",
    icon: "tournament",
  },
  {
    title: "Broadcast Production",
    description: "Hollywood-quality streaming with multi-camera setups, professional commentary, instant replays, and viewer engagement tools.",
    icon: "broadcast",
  },
  {
    title: "Venue & Infrastructure",
    description: "State-of-the-art gaming arenas with gigabit internet, soundproof booths, professional lighting, and climate-controlled environments.",
    icon: "venue",
  },
  {
    title: "Sponsorship Integration",
    description: "Strategic brand partnerships with seamless integration across broadcasts, venues, and digital platforms for maximum exposure.",
    icon: "sponsor",
  },
  {
    title: "Player Services",
    description: "Comprehensive player support including practice facilities, coaching access, mental performance training, and career development.",
    icon: "player",
  },
  {
    title: "Anti-Cheat & Integrity",
    description: "Industry-leading anti-cheat systems, referee oversight, and competitive integrity measures ensuring fair play at all levels.",
    icon: "security",
  },
];

const CLIENT_TYPES = [
  {
    title: "Game Publishers",
    description: "Launch official tournaments for your titles. We handle everything from amateur leagues to world championships with millions watching.",
  },
  {
    title: "Esports Organizations",
    description: "Host team tournaments, bootcamps, and showcase events. Professional infrastructure that matches your competitive standards.",
  },
  {
    title: "Brands & Sponsors",
    description: "Activate your esports sponsorships with custom tournaments. Reach millions of engaged gamers with authentic competitive experiences.",
  },
  {
    title: "Educational Institutions",
    description: "Build collegiate esports programs with structured competition, scholarships, and career pathways for student athletes.",
  },
];

const WHY_US = [
  {
    title: "Proven Track Record",
    description: "We've hosted The International, League of Legends Worlds qualifiers, and hundreds of major tournaments without technical issues.",
  },
  {
    title: "Global Infrastructure",
    description: "Server infrastructure across 6 continents, partnerships with major venues worldwide, and production teams in every region.",
  },
  {
    title: "Technology Platform",
    description: "Proprietary tournament software handles 100K+ concurrent participants with automated brackets, instant updates, and fraud detection.",
  },
  {
    title: "Industry Connections",
    description: "Direct relationships with top streamers, professional teams, game developers, and media outlets for maximum tournament exposure.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Esports Director, Riot Games",
    content: "Champions League delivered flawless execution for our regional championships. Their broadcast quality rivals traditional sports and their player experience is unmatched.",
    rating: 5,
    avatar: "SC",
  },
  {
    name: "Marcus Rodriguez",
    role: "CEO, Cloud9",
    content: "We've partnered with Champions League for three years. Their professionalism, attention to detail, and ability to scale tournaments from 100 to 100,000 players is remarkable.",
    rating: 5,
    avatar: "MR",
  },
  {
    name: "Emily Zhang",
    role: "Head of Gaming, Red Bull",
    content: "The ROI on our Champions League partnership exceeded expectations by 300%. Their team understands how to create authentic competitive experiences that resonate with gamers.",
    rating: 5,
    avatar: "EZ",
  },
];

const FAQS = [
  {
    question: "What games do you support?",
    answer: "We support all major competitive titles including League of Legends, Dota 2, CS:GO, Valorant, Fortnite, Apex Legends, Rocket League, FIFA, and more. We can also build custom tournament infrastructure for new or niche competitive games.",
  },
  {
    question: "How do prize pools work?",
    answer: "We offer multiple models: publisher-funded, sponsor-funded, entry fee-based, or hybrid approaches. We handle all payment processing, tax documentation, and international prize distribution with full compliance and transparency.",
  },
  {
    question: "What's the minimum tournament size you handle?",
    answer: "We've run tournaments from 32 players to 100,000+ participants. Our platform scales seamlessly regardless of size, though our full-service offering typically starts at 500+ participants for cost-effectiveness.",
  },
  {
    question: "How do you prevent cheating?",
    answer: "Multi-layered approach: client-side anti-cheat software, server-side analytics detecting abnormal behavior, human referees reviewing flagged matches, and hardware validation for LAN events. 99.8% cheat detection rate.",
  },
  {
    question: "Can you handle last-minute scaling?",
    answer: "Absolutely. Our cloud infrastructure automatically scales. We've handled tournaments where registration exceeded expectations by 500% without any performance degradation or delays.",
  },
  {
    question: "What's your broadcast reach?",
    answer: "We simultaneously stream to Twitch, YouTube, Facebook Gaming, and regional platforms. Our largest events have reached 15M+ concurrent viewers across all platforms with professional production quality.",
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: ANIMATION_CONFIG.duration, ease: ANIMATION_CONFIG.ease } },
};

const fadeInDown = {
  hidden: { opacity: 0, y: -60 },
  visible: { opacity: 1, y: 0, transition: { duration: ANIMATION_CONFIG.duration, ease: ANIMATION_CONFIG.ease } },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: ANIMATION_CONFIG.duration, ease: ANIMATION_CONFIG.ease } },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: ANIMATION_CONFIG.duration, ease: ANIMATION_CONFIG.ease } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: ANIMATION_CONFIG.duration, ease: ANIMATION_CONFIG.ease } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_CONFIG.stagger,
      delayChildren: 0.2,
    },
  },
};

const FloatingShapes = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20"
        style={{ background: COLORS.primary, filter: "blur(80px)" }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-20"
        style={{ background: COLORS.secondary, filter: "blur(80px)" }}
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full opacity-10"
        style={{ background: COLORS.accent, filter: "blur(80px)" }}
        animate={{
          x: [0, 50, 0],
          y: [0, -100, 0],
          scale: [1, 1.4, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

const AnimatedCounter = ({ value, suffix = "", duration = 2 }: { value: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = (currentTime - startTime) / (duration * 1000);

      if (progress < 1) {
        setCount(Math.floor(value * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const Confetti = () => {
  const colors = [COLORS.primary, COLORS.secondary, COLORS.accent];
  const confettiPieces = Array.from({ length: 50 });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confettiPieces.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: colors[Math.floor(Math.random() * colors.length)],
            left: `${Math.random() * 100}%`,
            top: -20,
          }}
          animate={{
            y: [0, window.innerHeight + 100],
            x: [0, (Math.random() - 0.5) * 200],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

const ShimmerButton = ({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) => {
  return (
    <motion.button
      className={`relative overflow-hidden px-8 py-4 rounded-full font-bold text-white ${className}`}
      style={{ background: COLORS.gradient }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <motion.div
        className="absolute inset-0 bg-white opacity-0"
        animate={{
          opacity: [0, 0.2, 0],
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

const Card3D = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]));
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]));

  const handleMouse = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouse}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <motion.div
      className="text-center mb-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInDown}
    >
      <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: COLORS.light }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.svg
          key={i}
          className="w-5 h-5"
          fill={i < rating ? COLORS.primary : "none"}
          stroke={i < rating ? COLORS.primary : "#666"}
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

const IconTournament = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7l10 5M12 12v10M22 7l-10 5" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconBroadcast = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="2"/>
    <path d="M8 21h8M12 17v4" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="10" r="3" fill="currentColor" opacity="0.5"/>
  </svg>
);

const IconVenue = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 22V12h6v10" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconSponsor = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="8" r="6" strokeWidth="2"/>
    <path d="M12 14v8M8 18h8" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="8" r="2" fill="currentColor"/>
  </svg>
);

const IconPlayer = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="8" r="4" strokeWidth="2"/>
    <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 12l3 3-3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconSecurity = () => (
  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const getServiceIcon = (iconType: string) => {
  switch (iconType) {
    case "tournament": return <IconTournament />;
    case "broadcast": return <IconBroadcast />;
    case "venue": return <IconVenue />;
    case "sponsor": return <IconSponsor />;
    case "player": return <IconPlayer />;
    case "security": return <IconSecurity />;
    default: return <IconTournament />;
  }
};

const Banner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 py-3 px-4 text-center text-sm font-medium text-white"
      style={{ background: COLORS.gradient }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
    >
      <div className="flex items-center justify-center gap-4">
        <span>Summer Championship Series: $5M Prize Pool | Registration Open Now</span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Close banner"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

const Hero = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.8]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: COLORS.darker }}>
      <FloatingShapes />

      <motion.div
        className="container mx-auto px-4 relative z-10"
        style={{ opacity, scale }}
      >
        <motion.div
          className="max-w-5xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInDown} className="mb-6">
            <span className="inline-block px-6 py-2 rounded-full text-sm font-semibold" style={{ background: `${COLORS.primary}20`, color: COLORS.primary }}>
              $50M+ in Prize Pools Distributed
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6"
            variants={fadeInUp}
            style={{ color: COLORS.light }}
          >
            Where Legends{" "}
            <AnimatePresence mode="wait">
              <motion.span
                key={currentWordIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                style={{
                  background: COLORS.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "inline-block",
                }}
              >
                {HERO_WORDS[currentWordIndex]}
              </motion.span>
            </AnimatePresence>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            The world's premier esports tournament platform. From grassroots competitions to million-dollar championships, we bring competitive gaming to life with unmatched production quality and global reach.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            variants={fadeInUp}
          >
            <ShimmerButton className="text-lg">
              Host Your Tournament
            </ShimmerButton>
            <motion.button
              className="px-8 py-4 rounded-full font-bold text-lg border-2 transition-colors"
              style={{ borderColor: COLORS.primary, color: COLORS.primary }}
              whileHover={{ scale: 1.05, backgroundColor: `${COLORS.primary}10` }}
              whileTap={{ scale: 0.95 }}
            >
              View Upcoming Events
            </motion.button>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
            variants={staggerContainer}
          >
            {STATS.map((stat, index) => (
              <motion.div key={index} variants={scaleIn} className="text-center">
                <div className="text-4xl md:text-5xl font-black mb-2" style={{ color: COLORS.primary }}>
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </section>
  );
};

const Services = () => {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: COLORS.dark }}>
      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader
          title="Full-Service Tournament Solutions"
          subtitle="Everything you need to run world-class esports competitions, from concept to champion."
        />

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {SERVICES.map((service, index) => (
            <Card3D key={index}>
              <motion.div
                className="p-8 rounded-2xl h-full border transition-all duration-300 hover:border-opacity-100"
                style={{
                  background: `${COLORS.darker}80`,
                  borderColor: `${COLORS.primary}30`,
                  backdropFilter: "blur(10px)",
                }}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
              >
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: `${COLORS.primary}20`, color: COLORS.primary }}
                >
                  {getServiceIcon(service.icon)}
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: COLORS.light }}>
                  {service.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {service.description}
                </p>
              </motion.div>
            </Card3D>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const WhoWeServe = () => {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: COLORS.darker }}>
      <FloatingShapes />

      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader
          title="Who We Partner With"
          subtitle="From indie developers to Fortune 500 brands, we deliver competitive experiences that drive engagement."
        />

        <motion.div
          className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {CLIENT_TYPES.map((client, index) => (
            <motion.div
              key={index}
              className="p-8 rounded-2xl border"
              style={{
                background: `${COLORS.dark}80`,
                borderColor: `${COLORS.secondary}30`,
                backdropFilter: "blur(10px)",
              }}
              variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
              whileHover={{ scale: 1.02, borderColor: COLORS.secondary }}
            >
              <h3 className="text-2xl font-bold mb-3" style={{ color: COLORS.light }}>
                {client.title}
              </h3>
              <p className="text-gray-400">
                {client.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const WhyChooseUs = () => {
  return (
    <section className="py-24 relative" style={{ background: COLORS.dark }}>
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Why Champions League"
          subtitle="Trusted by the biggest names in gaming and esports to deliver flawless competitive experiences."
        />

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {WHY_US.map((reason, index) => (
            <motion.div
              key={index}
              className="text-center p-8 rounded-2xl"
              style={{ background: COLORS.darker }}
              variants={scaleIn}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-black"
                style={{ background: COLORS.gradient, color: COLORS.light }}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                {index + 1}
              </motion.div>
              <h3 className="text-xl font-bold mb-3" style={{ color: COLORS.light }}>
                {reason.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {reason.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: COLORS.darker }}>
      <FloatingShapes />

      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader
          title="Client Success Stories"
          subtitle="Hear from the industry leaders who trust us with their most important competitive events."
        />

        <div className="max-w-6xl mx-auto">
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {TESTIMONIALS.map((testimonial, index) => (
              <Card3D key={index}>
                <motion.div
                  className="p-8 rounded-2xl h-full border cursor-pointer"
                  style={{
                    background: activeIndex === index ? `${COLORS.primary}10` : COLORS.dark,
                    borderColor: activeIndex === index ? COLORS.primary : `${COLORS.primary}20`,
                  }}
                  variants={fadeInUp}
                  onClick={() => setActiveIndex(index)}
                  whileHover={{ y: -10 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                      style={{ background: COLORS.gradient, color: COLORS.light }}
                    >
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: COLORS.light }}>
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>

                  <StarRating rating={testimonial.rating} />

                  <p className="text-gray-300 mt-4 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                </motion.div>
              </Card3D>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  return (
    <section className="py-24" style={{ background: COLORS.dark }}>
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Frequently Asked Questions"
          subtitle="Get answers about tournament hosting, technical requirements, and our platform capabilities."
        />

        <motion.div
          className="max-w-3xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <Accordion
            items={FAQS.map((faq) => ({
              title: faq.question,
              content: faq.answer,
            }))}
          />
        </motion.div>
      </div>
    </section>
  );
};

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    interest: "tournament-hosting",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!validateRequired(formData.name)) {
      newErrors.name = "Name is required";
    }
    if (!validateEmail(formData.email)) {
      newErrors.email = "Valid email is required";
    }
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Valid phone number is required";
    }
    if (!validateRequired(formData.message)) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsSubmitting(false);
      setIsSuccess(true);
      setFormData({ name: "", email: "", phone: "", company: "", message: "", interest: "tournament-hosting" });
      setTimeout(() => setIsSuccess(false), 5000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: COLORS.darker }}>
      <FloatingShapes />

      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader
          title="Let's Build Something Epic"
          subtitle="Tell us about your tournament vision and we'll create a custom proposal within 48 hours."
        />

        <motion.div
          className="max-w-2xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <div className="p-8 md:p-12 rounded-2xl border" style={{ background: COLORS.dark, borderColor: `${COLORS.primary}30` }}>
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg"
                style={{ background: `${COLORS.primary}20`, color: COLORS.primary }}
              >
                <Confetti />
                Success! Our tournament team will contact you within 48 hours with a custom proposal.
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.light }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:border-opacity-100 transition-colors"
                  style={{ borderColor: errors.name ? "#ef4444" : `${COLORS.primary}30`, color: COLORS.light }}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.light }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:border-opacity-100 transition-colors"
                  style={{ borderColor: errors.email ? "#ef4444" : `${COLORS.primary}30`, color: COLORS.light }}
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.light }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:border-opacity-100 transition-colors"
                  style={{ borderColor: errors.phone ? "#ef4444" : `${COLORS.primary}30`, color: COLORS.light }}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.light }}>
                  Organization/Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:border-opacity-100 transition-colors"
                  style={{ borderColor: `${COLORS.primary}30`, color: COLORS.light }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.light }}>
                  Service Interest
                </label>
                <select
                  name="interest"
                  value={formData.interest}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:border-opacity-100 transition-colors"
                  style={{ borderColor: `${COLORS.primary}30`, color: COLORS.light }}
                >
                  <option value="tournament-hosting">Tournament Hosting</option>
                  <option value="broadcast-production">Broadcast Production</option>
                  <option value="venue-rental">Venue Rental</option>
                  <option value="full-service">Full-Service Package</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: COLORS.light }}>
                  Tournament Details *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border bg-transparent focus:outline-none focus:border-opacity-100 transition-colors resize-none"
                  style={{ borderColor: errors.message ? "#ef4444" : `${COLORS.primary}30`, color: COLORS.light }}
                  placeholder="Tell us about your tournament: game title, expected participants, timeline, budget range, special requirements..."
                />
                {errors.message && <p className="mt-1 text-sm text-red-500">{errors.message}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full font-bold text-white text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: COLORS.gradient }}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? "Submitting..." : "Request Tournament Proposal"}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FinalCTA = () => {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: COLORS.dark }}>
      <div className="absolute inset-0" style={{ background: COLORS.gradient, opacity: 0.1 }} />

      <motion.div
        className="container mx-auto px-4 text-center relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.h2
          className="text-4xl md:text-6xl font-black mb-6"
          variants={fadeInDown}
          style={{ color: COLORS.light }}
        >
          Ready to Create History?
        </motion.h2>

        <motion.p
          className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto"
          variants={fadeInUp}
        >
          Let's build the tournament that launches careers, breaks records, and creates unforgettable moments in competitive gaming.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-6 justify-center"
          variants={fadeInUp}
        >
          <ShimmerButton className="text-lg">
            Start Planning Your Event
          </ShimmerButton>
          <motion.a
            href="tel:1-800-CHAMPS-1"
            className="px-8 py-4 rounded-full font-bold text-lg border-2 transition-colors"
            style={{ borderColor: COLORS.primary, color: COLORS.primary }}
            whileHover={{ scale: 1.05, backgroundColor: `${COLORS.primary}10` }}
            whileTap={{ scale: 0.95 }}
          >
            Call: 1-800-CHAMPS-1
          </motion.a>
        </motion.div>

        <motion.p
          className="mt-8 text-gray-400 text-sm"
          variants={fadeInUp}
        >
          24/7 tournament support • Global infrastructure • Proven at scale • Trusted by champions
        </motion.p>
      </motion.div>
    </section>
  );
};

const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 p-4 md:hidden"
          style={{ background: COLORS.darker, borderTop: `2px solid ${COLORS.primary}` }}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex gap-3">
            <motion.button
              className="flex-1 py-3 rounded-full font-bold text-white"
              style={{ background: COLORS.gradient }}
              whileTap={{ scale: 0.95 }}
            >
              Get Proposal
            </motion.button>
            <motion.a
              href="tel:1-800-CHAMPS-1"
              className="px-6 py-3 rounded-full font-bold border-2 flex items-center justify-center"
              style={{ borderColor: COLORS.primary, color: COLORS.primary }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </motion.a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function GamingTournamentDemo() {
  return (
    <main className="relative" style={{ background: COLORS.darker }}>
      <Banner />

      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="w-full relative z-40 flex">
        <div className="py-4 px-6 flex items-center" style={{ backgroundColor: '#0A0612' }}>
          <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap">Gaming Tournament</span>
        </div>
        <div className="flex-1 py-4 px-6 flex items-center justify-between" style={{ backgroundColor: '#27242e' }}>
          <div className="hidden md:flex items-center gap-7">
            <span className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors duration-300 font-medium">Tours</span>
            <span className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors duration-300 font-medium">Destinations</span>
            <span className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors duration-300 font-medium">Reviews</span>
            <span className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors duration-300 font-medium">About</span>
          </div>
          <span className="hidden sm:inline-flex px-5 py-2.5 rounded text-sm font-semibold cursor-pointer transition-all hover:opacity-90" style={{ backgroundColor: '#9370DB', color: '#FFF' }}>Book a Tour</span>
        </div>
      </nav>

      <Hero />
      <Services />
      <WhoWeServe />
      <WhyChooseUs />
      <Testimonials />
      <FAQ />
      <ContactForm />
      <FinalCTA />
      <StickyMobileCTA />
    </main>
  );
}
