// @ts-nocheck
"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Card, Accordion, Badge } from "@/components/ui";
import { validateEmail } from "@/lib/utils";
import Link from "next/link";
import { FloatingParticles } from "@/components/motion/FloatingParticles";
import { spring } from "@/lib/motion";
import { TiltCard } from "@/components/motion/MagneticButton";

// Demo-specific constants
const product = {
  name: "FlowSync",
  tagline: "Team collaboration, finally simplified",
  description: "The all-in-one workspace that replaces your scattered tools with one seamless experience.",
};

const features = [
  {
    title: "Smart Task Management",
    description: "AI-powered task organization that learns how your team works and adapts to your workflow.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Real-Time Collaboration",
    description: "Work together seamlessly with instant sync, live cursors, and in-context comments.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: "Unified Communication",
    description: "Messages, video calls, and async updates in one place. No more switching between apps.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: "Powerful Integrations",
    description: "Connect with 100+ tools you already use. Sync data automatically, no manual work.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
];

const betaTestimonials = [
  {
    quote: "Finally, a tool that actually reduces our meeting time instead of creating more overhead.",
    author: "Alex C.",
    role: "Engineering Lead",
    company: "Series A Startup",
  },
  {
    quote: "We replaced 4 different tools with FlowSync. Our team is more aligned than ever.",
    author: "Maria S.",
    role: "Operations Manager",
    company: "Growing Agency",
  },
  {
    quote: "The AI features are genuinely useful, not just a gimmick. It&apos;s like having a smart assistant.",
    author: "Tom K.",
    role: "Product Manager",
    company: "Tech Company",
  },
];

const faqs = [
  {
    id: "1",
    question: "When is the official launch?",
    answer: "We&apos;re planning to launch in Q2 2025. Waitlist members will get early access 2 weeks before the public launch, plus exclusive founding member pricing that&apos;s locked in for life.",
  },
  {
    id: "2",
    question: "What does early access include?",
    answer: "Early access members get full access to all features, direct communication with our team for feedback, and influence over our product roadmap. You&apos;ll also get our best pricing tier, permanently.",
  },
  {
    id: "3",
    question: "How is FlowSync different from other tools?",
    answer: "Most tools solve one problem well but create fragmentation. FlowSync is built from the ground up to be an all-in-one workspace—tasks, docs, communication, and integrations that actually work together. Plus, our AI isn&apos;t bolted on; it&apos;s woven into everything.",
  },
  {
    id: "4",
    question: "What&apos;s the pricing going to be?",
    answer: "We&apos;ll have a generous free tier for small teams. Paid plans will start around $10/user/month, but early access members lock in founding pricing at $6/user/month for life.",
  },
  {
    id: "5",
    question: "Can I migrate my existing data?",
    answer: "Absolutely. We&apos;re building migration tools for popular platforms like Notion, Asana, Monday, and Slack. For early access users, we&apos;ll even help you migrate manually if needed.",
  },
  {
    id: "6",
    question: "Is my data secure?",
    answer: "Security is foundational, not an afterthought. We&apos;re SOC 2 Type II compliant, use end-to-end encryption for sensitive data, and give you full control over data retention and access policies.",
  },
];

const stats = [
  { value: "2,400+", label: "On the waitlist" },
  { value: "150+", label: "Beta testers" },
  { value: "32%", label: "Time saved (avg)" },
];

export default function SaaSWaitlistDemo() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [waitlistPosition, setWaitlistPosition] = useState(0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setWaitlistPosition(Math.floor(Math.random() * 500) + 2400);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Demo Banner */}
{/* Hero Section */}

      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="w-full relative z-40" style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #22D3EE, #22D3EE)' }}>
              {/* logo icon */}
              <span className="text-base">F</span>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">FlowSync</span>
          </div>
          <div className="hidden md:flex items-center gap-7">
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</span>
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300" onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}>Pricing</span>
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300" onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Testimonials</span>
            <span className="text-sm text-white/60 hover:text-white cursor-pointer transition-colors duration-300" onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="px-4 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white cursor-pointer transition-all border border-white/10 hover:border-white/25 hover:bg-white/5" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</span>
            <span className="px-5 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #22D3EE, #22D3EE)' }} onClick={() => document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth' })}>Start Free Trial</span>
          </div>
        </div>
      </nav>

      <section className="relative bg-white overflow-hidden">
        <FloatingParticles count={15} color="accent" size="sm" speed="slow" className="opacity-40" />

        <div className="container py-20 md:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Coming Soon Badge */}
            <motion.div
              className="inline-flex items-center gap-2 bg-[#22D3EE]/10 border border-[#22D3EE]/30 rounded-full px-4 py-2 mb-6"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={spring.bouncy}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22D3EE] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22D3EE]"></span>
              </span>
              <span className="text-sm font-medium text-[#0B1B3A]">Launching Q2 2025</span>
            </motion.div>

            {/* Logo */}
            <motion.div
              className="flex items-center justify-center gap-3 mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              <motion.div
                className="w-12 h-12 bg-[#0B1B3A] rounded-[12px] flex items-center justify-center"
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={spring.snappy}
              >
                <svg className="w-7 h-7 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </motion.div>
              <span className="text-2xl font-bold text-[#0F172A]">{product.name}</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0F172A] leading-tight mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.dramatic, delay: 0.2 }}
            >
              {product.tagline}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-lg md:text-xl text-[#475569] mb-10 leading-relaxed max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: 0.3 }}
            >
              {product.description} Join the waitlist for early access and exclusive founding member pricing.
            </motion.p>

            {/* Email Form */}
            {isSubmitted ? (
              <motion.div
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px] p-8 max-w-md mx-auto"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring.bouncy}
              >
                <motion.div
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring.superBouncy, delay: 0.2 }}
                >
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">You&apos;re on the list!</h3>
                <p className="text-[#475569] mb-4">
                  Your position: <span className="font-bold text-[#0B1B3A]">#{waitlistPosition}</span>
                </p>
                <p className="text-sm text-[#475569]">
                  We&apos;ll email you at <span className="font-medium">{email}</span> when it&apos;s your turn.
                </p>
              </motion.div>
            ) : (
              <motion.form
                onSubmit={handleSubmit}
                className="max-w-md mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.4 }}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Enter your work email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      error={error}
                      className="text-center sm:text-left"
                    />
                  </div>
                  <Button type="submit" loading={isSubmitting} size="lg">
                    Join Waitlist
                  </Button>
                </div>
                <p className="mt-4 text-sm text-[#475569]">
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  No spam. Unsubscribe anytime. We respect your inbox.
                </p>
              </motion.form>
            )}

            {/* Stats */}
            <motion.div
              className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-[#E2E8F0]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: 0.5 }}
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring.bouncy, delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-2xl md:text-3xl font-bold text-[#0B1B3A]">{stat.value}</div>
                  <div className="text-sm text-[#475569]">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-[#22D3EE]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0B1B3A]/5 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Problem Section */}
      <section className="section bg-[#F8FAFC] relative overflow-hidden">
        <motion.div
          className="absolute top-0 right-0 w-72 h-72 bg-red-500/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={spring.bouncy}
            >
              <Badge variant="muted" className="mb-4">The Problem</Badge>
            </motion.div>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={spring.dramatic}
            >
              Your Team Is Drowning in Tools
            </motion.h2>
            <motion.p
              className="text-lg text-[#475569] leading-relaxed mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.1 }}
            >
              Slack for chat. Asana for tasks. Notion for docs. Google Meet for calls.
              Loom for async video. Calendar for scheduling. The list goes on.
              <strong className="text-[#0F172A]"> Context switching is killing your productivity.</strong>
            </motion.p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  stat: "5+",
                  label: "Apps per team member",
                  description: "Average number of tools teams juggle daily",
                },
                {
                  stat: "23min",
                  label: "Lost per app switch",
                  description: "Time to regain focus after switching context",
                },
                {
                  stat: "40%",
                  label: "Time wasted",
                  description: "Searching for information across tools",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40, rotateY: -15 }}
                  whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.bouncy, delay: i * 0.15 }}
                >
                  <TiltCard tiltStrength={8} glareEnabled>
                    <Card variant="default" padding="lg" className="text-center">
                      <motion.div
                        className="text-3xl font-bold text-[#0B1B3A] mb-1"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ ...spring.superBouncy, delay: 0.3 + i * 0.1 }}
                      >
                        {item.stat}
                      </motion.div>
                      <div className="font-medium text-[#0F172A] mb-2">{item.label}</div>
                      <div className="text-sm text-[#475569]">{item.description}</div>
                    </Card>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solution/Features Section */}
      <section id="features" className="section bg-white relative overflow-hidden">
        <FloatingParticles count={10} color="primary" size="sm" speed="slow" className="opacity-30" />

        <div className="container relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <Badge variant="accent" className="mb-4">The Solution</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              One Workspace. Zero Chaos.
            </h2>
            <p className="text-lg text-[#475569] max-w-2xl mx-auto">
              {product.name} brings everything together in one intelligent workspace.
              No more switching. No more searching. Just flow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, y: 0, x: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.1 }}
              >
                <TiltCard className="h-full" tiltStrength={5} glareEnabled>
                  <Card variant="default" padding="lg" className="flex gap-5 h-full">
                    <motion.div
                      className="w-14 h-14 bg-[#0B1B3A] rounded-[12px] flex items-center justify-center text-[#22D3EE] flex-shrink-0"
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={spring.snappy}
                    >
                      {feature.icon}
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{feature.title}</h3>
                      <p className="text-[#475569] leading-relaxed">{feature.description}</p>
                    </div>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          {/* Product Preview Placeholder */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...spring.dramatic, delay: 0.2 }}
          >
            <TiltCard tiltStrength={3} glareEnabled>
              <motion.div
                className="aspect-video bg-gradient-to-br from-[#0B1B3A] to-[#0B1B3A]/80 rounded-[24px] flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.02 }}
                transition={spring.snappy}
              >
                {/* Animated glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#22D3EE]/0 via-[#22D3EE]/20 to-[#22D3EE]/0"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />
                <div className="text-center text-white/50 relative z-10">
                  <motion.svg
                    className="w-20 h-20 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    whileHover={{ scale: 1.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </motion.svg>
                  <p>Product Demo Video Placeholder</p>
                </div>
              </motion.div>
            </TiltCard>
          </motion.div>
        </div>
      </section>

      {/* Early Access Benefits */}
      <section id="pricing" className="section bg-[#0B1B3A] relative overflow-hidden">
        <FloatingParticles count={15} color="accent" size="sm" speed="slow" className="opacity-20" />

        {/* Animated background shapes */}
        <motion.div
          className="absolute top-1/4 -left-20 w-80 h-80 bg-[#22D3EE]/10 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" as const }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" as const }}
        />

        <div className="container relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              Why Join the Waitlist?
            </motion.h2>
            <motion.p
              className="text-lg text-white/70"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Early access members get exclusive perks
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: "Founding Member Pricing",
                description: "$6/user/month locked in forever (vs. $10 at launch)",
                icon: "💰",
              },
              {
                title: "2-Week Head Start",
                description: "Access before public launch to get your team set up",
                icon: "⚡",
              },
              {
                title: "Direct Input",
                description: "Shape the product roadmap with your feedback",
                icon: "🎯",
              },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.15 }}
              >
                <TiltCard tiltStrength={10} glareEnabled>
                  <Card variant="default" padding="lg" className="text-center bg-white h-full">
                    <motion.div
                      className="text-4xl mb-4"
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ ...spring.superBouncy, delay: 0.2 + i * 0.15 }}
                      whileHover={{ scale: 1.2, rotate: 10 }}
                    >
                      {benefit.icon}
                    </motion.div>
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{benefit.title}</h3>
                    <p className="text-sm text-[#475569]">{benefit.description}</p>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="testimonials" className="section bg-white relative overflow-hidden">
        <div className="container">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              What Beta Testers Say
            </h2>
            <p className="text-lg text-[#475569]">
              Real feedback from teams already using {product.name}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {betaTestimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.15 }}
              >
                <TiltCard className="h-full" tiltStrength={6} glareEnabled>
                  <Card variant="default" padding="lg" className="h-full">
                    <motion.div
                      className="flex mb-4"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {[1, 2, 3, 4, 5].map((j) => (
                        <motion.svg
                          key={j}
                          className="w-5 h-5 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ ...spring.superBouncy, delay: 0.4 + i * 0.1 + j * 0.05 }}
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </motion.svg>
                      ))}
                    </motion.div>
                    <blockquote className="text-[#0F172A] mb-4 leading-relaxed">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <div className="border-t border-[#E2E8F0] pt-4">
                      <p className="font-semibold text-[#0F172A]">{testimonial.author}</p>
                      <p className="text-sm text-[#475569]">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="section bg-[#F8FAFC] relative overflow-hidden">
        <motion.div
          className="absolute -top-20 -right-20 w-64 h-64 bg-[#22D3EE]/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={spring.dramatic}
            >
              <motion.h2
                className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: 0.1 }}
              >
                Frequently Asked Questions
              </motion.h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.2 }}
            >
              <Accordion items={faqs} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-white relative overflow-hidden">
        <FloatingParticles count={10} color="primary" size="sm" speed="slow" className="opacity-20" />

        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#22D3EE]/5 via-transparent to-[#0B1B3A]/5"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />

        <div className="container relative z-10">
          <motion.div
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              Ready to Simplify Your Workflow?
            </motion.h2>
            <motion.p
              className="text-lg text-[#475569] mb-8"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.2 }}
            >
              Join {stats[0].value} others waiting for the future of team collaboration.
            </motion.p>

            <AnimatePresence mode="wait">
              {isSubmitted ? (
                <motion.p
                  className="text-[#22D3EE] font-medium"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={spring.bouncy}
                >
                  You&apos;re already on the list! We&apos;ll be in touch soon.
                </motion.p>
              ) : (
                <motion.form
                  onSubmit={handleSubmit}
                  className="max-w-md mx-auto"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.soft, delay: 0.3 }}
                >
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        type="email"
                        placeholder="Enter your work email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        error={error}
                      />
                    </div>
                    <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                      <Button type="submit" loading={isSubmitting} size="lg">
                        Get Early Access
                      </Button>
                    </motion.div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      {!isSubmitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 md:hidden z-40">
          <Button
            fullWidth
            onClick={() => document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Join the Waitlist
          </Button>
        </div>
      )}

      {/* Bottom Padding for Mobile CTA */}
      {!isSubmitted && <div className="h-20 md:hidden" />}
    </div>
  );
}
