// @ts-nocheck
"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Button, Input, Card, Accordion, Badge } from "@/components/ui";
import { cn, validateEmail, validateRequired, validatePhone } from "@/lib/utils";
import Link from "next/link";
import { FloatingParticles } from "@/components/motion/FloatingParticles";
import { spring } from "@/lib/motion";
import { TiltCard } from "@/components/motion/MagneticButton";

// Demo-specific constants
const agency = {
  name: "SalonGrowth",
  tagline: "We Help Beauty Salons Get More Clients",
  description: "The marketing agency exclusively for salon owners who want predictable growth.",
};

const results = [
  {
    salon: "Luxe Hair Studio",
    location: "Miami, FL",
    metric: "3.2x",
    description: "increase in new client bookings",
    timeframe: "In 90 days",
  },
  {
    salon: "Glow Aesthetics",
    location: "Austin, TX",
    metric: "$47K",
    description: "additional monthly revenue",
    timeframe: "After 6 months",
  },
  {
    salon: "The Beauty Bar",
    location: "Chicago, IL",
    metric: "89%",
    description: "booking rate from leads",
    timeframe: "Consistent results",
  },
];

const services = [
  {
    title: "Local SEO Domination",
    description: "Own the first page of Google when people search for salons in your area. We optimize your presence so you're found first.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Social Media That Converts",
    description: "Strategic content that builds your brand and drives bookings—not just likes. We handle everything from strategy to posting.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    title: "Paid Ads That Pay Back",
    description: "Facebook and Instagram ads targeted to your ideal clients in your area. We manage your budget like it&apos;s our own.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Reputation Management",
    description: "More 5-star reviews, automated follow-ups, and a system that turns happy clients into your best marketing.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

const process = [
  {
    step: 1,
    title: "Strategy Call",
    description: "We learn about your salon, your goals, and your ideal clients",
  },
  {
    step: 2,
    title: "Custom Plan",
    description: "We build a marketing roadmap tailored to your salon",
  },
  {
    step: 3,
    title: "Launch",
    description: "We implement everything while you focus on your clients",
  },
  {
    step: 4,
    title: "Grow",
    description: "Watch your calendar fill up with new appointments",
  },
];

const testimonials = [
  {
    quote: "Before SalonGrowth, I was posting randomly on Instagram and hoping for the best. Now I have a predictable stream of new clients every week. They understand the salon industry in a way other agencies don't.",
    author: "Jessica M.",
    role: "Owner",
    salon: "Luxe Hair Studio",
    image: null,
  },
  {
    quote: "I was skeptical about hiring a marketing agency, but they paid for themselves in the first month. The ROI tracking they provide makes it easy to see exactly where my money is going.",
    author: "Amanda R.",
    role: "Founder",
    salon: "Glow Aesthetics",
    image: null,
  },
  {
    quote: "My Google reviews went from 23 to over 150 in six months. I'm now the top-rated salon in my area, and I didn't have to do anything—they handled it all.",
    author: "Nicole T.",
    role: "Owner",
    salon: "The Beauty Bar",
    image: null,
  },
];

const faqs = [
  {
    id: "1",
    question: "Do you only work with hair salons?",
    answer: "We work with all beauty businesses—hair salons, nail salons, spas, med spas, lash studios, barbershops, and aesthetic clinics. Our strategies are tailored to the beauty industry but customized for your specific services.",
  },
  {
    id: "2",
    question: "How much do your services cost?",
    answer: "Our packages start at $1,500/month for growing salons and scale based on your needs and goals. During our strategy call, we'll recommend a package based on your situation and budget. No pressure, no hard sell.",
  },
  {
    id: "3",
    question: "How quickly will I see results?",
    answer: "Most clients see an uptick in inquiries within the first 2-4 weeks. Significant, consistent growth typically happens within 60-90 days as our strategies compound. We set realistic expectations during our call.",
  },
  {
    id: "4",
    question: "Do I need a big marketing budget?",
    answer: "Not necessarily. We can work with ad budgets as low as $500/month to start. What matters more is having a solid strategy. Many salons waste money on ads without a system—we fix that first.",
  },
  {
    id: "5",
    question: "What makes you different from other agencies?",
    answer: "We ONLY work with beauty businesses. We know what works in this industry because it&apos;s all we do. Generic agencies apply cookie-cutter strategies. We understand seasonal trends, booking psychology, and what makes salon clients tick.",
  },
  {
    id: "6",
    question: "What if it doesn't work?",
    answer: "Our contracts are month-to-month after the first 90 days. If you're not seeing results, you can leave. But honestly? Our client retention rate is over 90% because our strategies work.",
  },
];

const calendarSlots = [
  { day: "Mon", date: "15", times: ["10:00 AM", "2:00 PM", "4:00 PM"] },
  { day: "Tue", date: "16", times: ["9:00 AM", "11:00 AM", "3:00 PM"] },
  { day: "Wed", date: "17", times: ["10:00 AM", "1:00 PM", "4:00 PM"] },
  { day: "Thu", date: "18", times: ["9:00 AM", "2:00 PM", "5:00 PM"] },
  { day: "Fri", date: "19", times: ["10:00 AM", "12:00 PM", "3:00 PM"] },
];

export default function AgencyNicheDemo() {
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    salonName: "",
    currentRevenue: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSlotSelect = (day: string, time: string) => {
    setSelectedSlot({ day, time });
  };

  const handleNext = () => {
    if (!selectedSlot) {
      return;
    }
    setBookingStep(2);
  };

  const handleBack = () => {
    setBookingStep(1);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!validateRequired(formData.name)) newErrors.name = "Please enter your name";
    if (!validateEmail(formData.email)) newErrors.email = "Please enter a valid email";
    if (!validatePhone(formData.phone)) newErrors.phone = "Please enter a valid phone number";
    if (!validateRequired(formData.salonName)) newErrors.salonName = "Please enter your salon name";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Demo Banner */}
{/* Hero Section */}

      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="w-full relative z-40" style={{ backgroundColor: '#0F172A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-px h-6 bg-white/20"></div>
              <span className="text-lg font-semibold text-white tracking-tight">SalonGrowth</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <span className="text-sm text-white/65 hover:text-white cursor-pointer transition-colors duration-300 font-medium" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Services</span>
              <span className="text-sm text-white/65 hover:text-white cursor-pointer transition-colors duration-300 font-medium" onClick={() => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</span>
              <span className="text-sm text-white/65 hover:text-white cursor-pointer transition-colors duration-300 font-medium" onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Results</span>
              <span className="text-sm text-white/65 hover:text-white cursor-pointer transition-colors duration-300 font-medium" onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <span className="px-4 py-2 rounded text-sm font-medium text-white/80 hover:text-white cursor-pointer transition-all border border-white/20 hover:border-white/40" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>Contact</span>
              <span className="px-5 py-2 rounded text-sm font-semibold cursor-pointer transition-all hover:opacity-90" style={{ backgroundColor: '#22D3EE', color: '#111' }} onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>Get a Quote</span>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative bg-[#F8FAFC] overflow-hidden">
        <FloatingParticles count={15} color="accent" size="sm" speed="slow" className="opacity-40" />

        {/* Background decoration */}
        <motion.div
          className="absolute top-1/4 -left-32 w-96 h-96 bg-[#22D3EE]/5 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" as const }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#0B1B3A]/5 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" as const }}
        />

        <div className="container py-16 md:py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Trust Badge */}
              <motion.div
                className="inline-flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-full px-4 py-2 mb-6"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={spring.bouncy}
              >
                <motion.svg
                  className="w-5 h-5 text-[#22D3EE]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </motion.svg>
                <span className="text-sm font-medium text-[#0B1B3A]">The #1 Marketing Agency for Salons</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0F172A] leading-tight mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.dramatic, delay: 0.1 }}
              >
                {agency.tagline}
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                className="text-lg text-[#475569] mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.2 }}
              >
                We help salon owners fill their chairs with high-quality clients every single week.
                No more slow days, no more guessing—just predictable growth.
              </motion.p>

              {/* Social Proof Snippet */}
              <motion.div
                className="flex items-center gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.3 }}
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-10 h-10 rounded-full bg-[#0B1B3A]/10 border-2 border-white flex items-center justify-center text-xs font-medium text-[#0B1B3A]"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring.superBouncy, delay: 0.4 + i * 0.1 }}
                    >
                      {["JM", "AR", "NT", "KL"][i - 1]}
                    </motion.div>
                  ))}
                </div>
                <div className="text-sm text-[#475569]">
                  <span className="font-semibold text-[#0F172A]">100+ salons</span> trust us with their marketing
                </div>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
                    Book Your Free Strategy Call
                  </Button>
                </motion.div>
                <p className="mt-4 text-sm text-[#475569]">
                  30-minute call. No obligation. Get a custom growth plan.
                </p>
              </motion.div>
            </div>

            {/* Results Preview */}
            <div className="space-y-4">
              {results.map((result, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring.bouncy, delay: 0.3 + i * 0.15 }}
                >
                  <TiltCard tiltStrength={5} glareEnabled>
                    <Card variant="default" padding="md" className="flex items-center gap-4">
                      <motion.div
                        className="w-16 h-16 bg-[#22D3EE]/10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(34, 211, 238, 0.2)" }}
                        transition={spring.snappy}
                      >
                        <span className="text-2xl font-bold text-[#0B1B3A]">{result.metric}</span>
                      </motion.div>
                      <div>
                        <p className="font-semibold text-[#0F172A]">{result.description}</p>
                        <p className="text-sm text-[#475569]">{result.salon} • {result.timeframe}</p>
                      </div>
                    </Card>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section bg-white relative overflow-hidden">
        <motion.div
          className="absolute top-0 left-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -translate-x-1/2"
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
              <Badge variant="muted" className="mb-4">Sound Familiar?</Badge>
            </motion.div>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={spring.dramatic}
            >
              Tired of Inconsistent Bookings?
            </motion.h2>
            <motion.p
              className="text-lg text-[#475569] leading-relaxed mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.1 }}
            >
              You&apos;re great at what you do—cutting hair, doing lashes, making people feel beautiful.
              But marketing? That&apos;s another story.
            </motion.p>

            <div className="grid md:grid-cols-2 gap-6 text-left">
              {[
                "Posting on social media but not getting bookings",
                "Depending on referrals that come unpredictably",
                "Spending money on ads that don't seem to work",
                "Watching competitors get clients that should be yours",
                "Not knowing what's actually working (or not)",
                "Too busy with clients to figure out marketing",
              ].map((problem, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.bouncy, delay: i * 0.08 }}
                >
                  <motion.svg
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    initial={{ scale: 0, rotate: -180 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...spring.superBouncy, delay: 0.1 + i * 0.08 }}
                  >
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </motion.svg>
                  <span className="text-[#475569]">{problem}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="services" className="section bg-[#F8FAFC] relative overflow-hidden">
        <FloatingParticles count={10} color="primary" size="sm" speed="slow" className="opacity-30" />

        <motion.div
          className="absolute top-1/4 -right-32 w-96 h-96 bg-[#22D3EE]/5 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity }}
        />

        <div className="container relative z-10">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={spring.bouncy}
            >
              <Badge variant="accent" className="mb-4">The Solution</Badge>
            </motion.div>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              Marketing That Actually Works for Salons
            </motion.h2>
            <motion.p
              className="text-lg text-[#475569] max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.2 }}
            >
              We&apos;ve helped 100+ salons grow their businesses with proven strategies. No guesswork, just results.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, y: 0, x: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.1 }}
              >
                <TiltCard tiltStrength={6} glareEnabled>
                  <Card variant="default" padding="lg" className="flex gap-5 h-full">
                    <motion.div
                      className="w-14 h-14 bg-[#0B1B3A] rounded-[12px] flex items-center justify-center text-[#22D3EE] flex-shrink-0"
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={spring.snappy}
                    >
                      {service.icon}
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{service.title}</h3>
                      <p className="text-[#475569] leading-relaxed">{service.description}</p>
                    </div>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="work" className="section bg-white relative overflow-hidden">
        <motion.div
          className="absolute -top-32 left-1/2 w-64 h-64 bg-[#22D3EE]/5 rounded-full blur-3xl -translate-x-1/2"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
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
              className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              How It Works
            </motion.h2>
            <motion.p
              className="text-lg text-[#475569]"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.2 }}
            >
              From strategy call to full chairs&mdash;here&apos;s the journey
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {process.map((item, i) => (
              <motion.div
                key={i}
                className="text-center relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.15 }}
              >
                {i < process.length - 1 && (
                  <motion.div
                    className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-[#E2E8F0]"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 + 0.3, duration: 0.5 }}
                    style={{ originX: 0 }}
                  />
                )}
                <div className="relative">
                  <motion.div
                    className="w-16 h-16 bg-[#22D3EE] rounded-full flex items-center justify-center text-[#0B1B3A] font-bold text-xl mx-auto mb-4 relative z-10"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...spring.superBouncy, delay: i * 0.15 }}
                    whileHover={{ scale: 1.1, backgroundColor: "#0B1B3A", color: "#22D3EE" }}
                  >
                    {item.step}
                  </motion.div>
                  <motion.h3
                    className="font-semibold text-[#0F172A] mb-2"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    {item.title}
                  </motion.h3>
                  <p className="text-sm text-[#475569]">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="section bg-[#0B1B3A] relative overflow-hidden">
        <FloatingParticles count={15} color="accent" size="sm" speed="slow" className="opacity-20" />

        <motion.div
          className="absolute top-1/4 -left-20 w-80 h-80 bg-[#22D3EE]/10 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
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
              Salon Owners Love Working With Us
            </motion.h2>
            <motion.p
              className="text-lg text-white/70"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Real results from real salon owners
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50, rotateX: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.15 }}
              >
                <TiltCard tiltStrength={8} glareEnabled>
                  <Card variant="default" padding="lg" className="bg-white h-full">
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
                          initial={{ opacity: 0, scale: 0, rotate: -180 }}
                          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
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
                      <p className="text-sm text-[#475569]">{testimonial.role}, {testimonial.salon}</p>
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
        <motion.div
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#0B1B3A]/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 10, repeat: Infinity }}
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

      {/* Booking Section */}
      <section id="booking" className="section bg-white relative overflow-hidden">
        <FloatingParticles count={10} color="accent" size="sm" speed="slow" className="opacity-20" />

        <motion.div
          className="absolute top-1/4 -left-20 w-80 h-80 bg-[#22D3EE]/5 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#0B1B3A]/5 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto">
            <motion.div
              className="text-center mb-10"
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
                Book Your Free Strategy Call
              </motion.h2>
              <motion.p
                className="text-[#475569]"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.soft, delay: 0.2 }}
              >
                30 minutes. No sales pitch. Just a custom growth plan for your salon.
              </motion.p>
            </motion.div>

            {isSubmitted ? (
              <Card variant="default" padding="lg" className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">You&apos;re Booked!</h3>
                <p className="text-[#475569] mb-4">
                  Your strategy call is confirmed for <strong>{selectedSlot?.day}</strong> at <strong>{selectedSlot?.time}</strong>.
                </p>
                <p className="text-sm text-[#475569]">
                  Check your email at <span className="font-medium">{formData.email}</span> for the calendar invite and Zoom link.
                </p>
              </Card>
            ) : (
              <Card variant="elevated" padding="lg">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <div className={cn("flex items-center gap-2", bookingStep >= 1 ? "text-[#0B1B3A]" : "text-[#475569]")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium", bookingStep >= 1 ? "bg-[#22D3EE] text-[#0B1B3A]" : "bg-[#E2E8F0]")}>1</div>
                    <span className="text-sm font-medium hidden sm:inline">Pick a Time</span>
                  </div>
                  <div className="w-8 h-0.5 bg-[#E2E8F0]">
                    <div className={cn("h-full bg-[#22D3EE] transition-all", bookingStep >= 2 ? "w-full" : "w-0")} />
                  </div>
                  <div className={cn("flex items-center gap-2", bookingStep >= 2 ? "text-[#0B1B3A]" : "text-[#475569]")}>
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium", bookingStep >= 2 ? "bg-[#22D3EE] text-[#0B1B3A]" : "bg-[#E2E8F0]")}>2</div>
                    <span className="text-sm font-medium hidden sm:inline">Your Details</span>
                  </div>
                </div>

                {bookingStep === 1 && (
                  <div>
                    <p className="text-sm text-[#475569] text-center mb-6">Select a time that works for you</p>
                    <div className="grid grid-cols-5 gap-3 mb-6">
                      {calendarSlots.map((slot) => (
                        <div key={slot.day} className="text-center">
                          <div className="text-xs text-[#475569] mb-1">{slot.day}</div>
                          <div className="text-lg font-semibold text-[#0F172A] mb-3">{slot.date}</div>
                          <div className="space-y-2">
                            {slot.times.map((time) => (
                              <button
                                key={time}
                                onClick={() => handleSlotSelect(slot.day, time)}
                                className={cn(
                                  "w-full py-2 px-1 text-xs rounded-[8px] border transition-all",
                                  selectedSlot?.day === slot.day && selectedSlot?.time === time
                                    ? "bg-[#0B1B3A] text-white border-[#0B1B3A]"
                                    : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#0B1B3A]"
                                )}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button fullWidth disabled={!selectedSlot} onClick={handleNext}>
                      Continue
                    </Button>
                  </div>
                )}

                {bookingStep === 2 && (
                  <form onSubmit={handleSubmit}>
                    <p className="text-sm text-[#475569] text-center mb-6">
                      Selected: <span className="font-medium text-[#0F172A]">{selectedSlot?.day} at {selectedSlot?.time}</span>
                    </p>
                    <div className="space-y-4">
                      <Input
                        label="Your Name"
                        name="name"
                        placeholder="Jane Smith"
                        value={formData.name}
                        onChange={handleInputChange}
                        error={errors.name}
                        required
                      />
                      <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="jane@salon.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        error={errors.email}
                        required
                      />
                      <Input
                        label="Phone"
                        name="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.phone}
                        onChange={handleInputChange}
                        error={errors.phone}
                        required
                      />
                      <Input
                        label="Salon Name"
                        name="salonName"
                        placeholder="Your Salon Name"
                        value={formData.salonName}
                        onChange={handleInputChange}
                        error={errors.salonName}
                        required
                      />
                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-2">
                          Monthly Revenue (Optional)
                        </label>
                        <select
                          name="currentRevenue"
                          value={formData.currentRevenue}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-[12px] border border-[#E2E8F0] bg-white text-[#0F172A]"
                        >
                          <option value="">Select range...</option>
                          <option value="under-10k">Under $10,000</option>
                          <option value="10k-25k">$10,000 - $25,000</option>
                          <option value="25k-50k">$25,000 - $50,000</option>
                          <option value="50k-100k">$50,000 - $100,000</option>
                          <option value="over-100k">Over $100,000</option>
                        </select>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
                          Back
                        </Button>
                        <Button type="submit" loading={isSubmitting} className="flex-1">
                          Book My Call
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                <p className="text-center text-xs text-[#475569] mt-6">
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Your information is 100% secure and will never be shared.
                </p>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-[#0B1B3A] relative overflow-hidden">
        <FloatingParticles count={15} color="accent" size="sm" speed="slow" className="opacity-15" />

        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-[#22D3EE]/10 rounded-full blur-3xl"
          animate={{ x: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], scale: [1.2, 1, 1.2] }}
          transition={{ duration: 12, repeat: Infinity }}
        />

        <div className="container text-center relative z-10">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            Ready to Fill Your Chairs?
          </motion.h2>
          <motion.p
            className="text-lg text-white/70 mb-8 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring.soft, delay: 0.1 }}
          >
            Join 100+ salon owners who&apos;ve transformed their businesses with predictable, consistent growth.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring.bouncy, delay: 0.2 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <Button variant="accent" size="lg" onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
                Book Your Free Strategy Call
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      {!isSubmitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 md:hidden z-40">
          <Button fullWidth onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}>
            Book Free Strategy Call
          </Button>
        </div>
      )}

      {/* Bottom Padding for Mobile CTA */}
      {!isSubmitted && <div className="h-20 md:hidden" />}
    </div>
  );
}
