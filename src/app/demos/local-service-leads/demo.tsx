// @ts-nocheck
"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Card, Accordion, Badge } from "@/components/ui";
import { cn, validateEmail, validatePhone, validateRequired } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { TiltCard } from "@/components/motion/MagneticButton";
import { FloatingParticles } from "@/components/motion/FloatingParticles";


// Demo-specific constants
const clinic = {
  name: "Radiance Aesthetics",
  tagline: "Where Science Meets Beauty",
  phone: "(555) 123-4567",
  location: "Beverly Hills, CA",
};

const services = [
  {
    name: "Botox & Fillers",
    description: "Natural-looking results that enhance your features",
    price: "From $350",
  },
  {
    name: "Laser Skin Rejuvenation",
    description: "Advanced treatments for smoother, younger-looking skin",
    price: "From $500",
  },
  {
    name: "Body Contouring",
    description: "Non-invasive fat reduction and skin tightening",
    price: "From $800",
  },
  {
    name: "Medical Facials",
    description: "Clinical-grade treatments for lasting results",
    price: "From $200",
  },
];

const stats = [
  { value: "15+", label: "Years Experience" },
  { value: "10,000+", label: "Happy Clients" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "5★", label: "Google Rating" },
];

const testimonials = [
  {
    quote:
      "I was nervous about getting fillers for the first time, but Dr. Chen made me feel completely at ease. The results look so natural—my friends just say I look 'refreshed' without knowing what I did!",
    author: "Michelle T.",
    treatment: "Lip Fillers",
    rating: 5,
  },
  {
    quote:
      "After years of dealing with acne scars, I finally found a solution. The laser treatments have transformed my skin. I actually look forward to video calls now.",
    author: "David R.",
    treatment: "Laser Resurfacing",
    rating: 5,
  },
  {
    quote:
      "The team at Radiance is incredible. They listened to my concerns and created a treatment plan that fit my budget. Worth every penny.",
    author: "Jennifer L.",
    treatment: "Botox + Facial",
    rating: 5,
  },
];

const faqs = [
  {
    id: "1",
    question: "How long do results typically last?",
    answer:
      "Results vary by treatment. Botox typically lasts 3-4 months, dermal fillers can last 6-18 months depending on the area and product used, and laser treatments often provide long-lasting results with proper skincare maintenance. During your consultation, we'll give you specific timelines for your recommended treatments.",
  },
  {
    id: "2",
    question: "Is there any downtime after treatments?",
    answer:
      "Most of our treatments have minimal to no downtime. For injectables, you can return to normal activities immediately—just avoid strenuous exercise for 24 hours. Laser treatments may require 2-5 days of healing depending on the intensity. We'll provide detailed aftercare instructions for your specific treatment.",
  },
  {
    id: "3",
    question: "How do I know which treatment is right for me?",
    answer:
      "That's exactly what our free consultation is for. We'll assess your skin, discuss your goals, and recommend a personalized treatment plan. There's no pressure—many clients come in just to learn about their options.",
  },
  {
    id: "4",
    question: "Are the treatments safe?",
    answer:
      "Absolutely. All our treatments are FDA-approved and performed by licensed medical professionals. Dr. Chen has over 15 years of experience and has performed thousands of successful procedures. We prioritize safety above all else.",
  },
  {
    id: "5",
    question: "What are your payment options?",
    answer:
      "We accept all major credit cards, HSA/FSA cards, and offer flexible financing through CareCredit with 0% APR options available. We believe everyone deserves to feel confident in their skin.",
  },
  {
    id: "6",
    question: "How soon can I see results?",
    answer:
      "Injectable results are often visible immediately, though optimal results appear after 1-2 weeks once any swelling subsides. Laser treatments show progressive improvement over 4-6 weeks as your skin heals and produces new collagen.",
  },
];

const process = [
  {
    step: 1,
    title: "Book Your Consultation",
    description: "Free, no-pressure consultation to discuss your goals",
  },
  {
    step: 2,
    title: "Personalized Plan",
    description: "We create a custom treatment plan for your needs",
  },
  {
    step: 3,
    title: "Expert Treatment",
    description: "Performed by board-certified professionals",
  },
  {
    step: 4,
    title: "Ongoing Support",
    description: "Follow-up care and maintenance planning",
  },
];

export default function LocalServiceLeadsDemo() {
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    treatment: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!validateRequired(formData.name)) {
      newErrors.name = "Please enter your name";
    }
    if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!validatePhone(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (!formData.treatment) {
      newErrors.treatment = "Please select a treatment";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (formStep === 1 && validateStep1()) {
      setFormStep(2);
    }
  };

  const handleBack = () => {
    setFormStep(1);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      setIsSubmitting(true);
      // Simulate submission
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}

      {/* ============================================ */}
      {/* NAVIGATION */}
      {/* ============================================ */}
      <nav className="w-full relative z-40" style={{ backgroundColor: '#edfbfe' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm" style={{ backgroundColor: '#22D3EE' }}>R</div>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#116a77' }}>Radiance Aesthetics</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm font-medium px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200" style={{ color: '#116a77' }} onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Services</span>
            <span className="text-sm font-medium px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200" style={{ color: '#116a77' }} onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}>Process</span>
            <span className="text-sm font-medium px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200" style={{ color: '#116a77' }} onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}>Reviews</span>
            <span className="text-sm font-medium px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200" style={{ color: '#116a77' }} onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</span>
          </div>
          <span className="hidden sm:inline-flex px-5 py-2.5 rounded-full text-sm font-bold text-white cursor-pointer transition-all shadow-md hover:shadow-lg hover:scale-[1.02]" style={{ backgroundColor: '#22D3EE' }} onClick={() => document.getElementById('consultation-form')?.scrollIntoView({ behavior: 'smooth' })}>Get a Quote</span>
        </div>
      </nav>

      <section className="relative bg-white overflow-hidden">
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
                className="inline-flex items-center gap-2 bg-[#22D3EE]/10 border border-[#22D3EE]/30 rounded-full px-4 py-2 mb-6"
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
                <span className="text-sm font-medium text-[#0B1B3A]">Board-Certified Specialists</span>
              </motion.div>

              <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0F172A] leading-tight mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.dramatic, delay: 0.1 }}
              >
                Look Younger, Feel Confident—
                <motion.span
                  className="text-[#22D3EE]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Without Surgery
                </motion.span>
              </motion.h1>

              <motion.p
                className="text-lg text-[#475569] mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.2 }}
              >
                Beverly Hills&apos; premier aesthetic clinic. From subtle enhancements to
                complete transformations, our medical experts deliver natural-looking
                results you&apos;ll love.
              </motion.p>

              {/* Quick Stats */}
              <motion.div
                className="grid grid-cols-4 gap-4 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.3 }}
              >
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.bouncy, delay: 0.4 + i * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <div className="text-2xl font-bold text-[#0B1B3A]">{stat.value}</div>
                    <div className="text-xs text-[#475569]">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.5 }}
              >
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" onClick={() => document.getElementById('consultation-form')?.scrollIntoView({ behavior: 'smooth' })}>
                    Book Free Consultation
                  </Button>
                </motion.div>
                <a href={`tel:${clinic.phone}`}>
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {clinic.phone}
                    </Button>
                  </motion.div>
                </a>
              </motion.div>

              {/* Trust Line */}
              <motion.p
                className="mt-6 text-sm text-[#475569]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <svg className="w-4 h-4 inline-block mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Free consultation. No obligation. Financing available.
              </motion.p>
            </div>

            {/* Hero Image Placeholder */}
            <motion.div
              className="relative hidden lg:block"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.dramatic, delay: 0.3 }}
            >
              <TiltCard className="h-full" tiltStrength={8} glareEnabled>
                <div className="aspect-[4/5] bg-gradient-to-br from-[#F8FAFC] to-[#E2E8F0] rounded-[24px] flex items-center justify-center">
                  <div className="text-center text-[#475569]">
                    <motion.svg
                      className="w-16 h-16 mx-auto mb-4 opacity-30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </motion.svg>
                    <p className="text-sm">Hero Image Placeholder</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="bg-[#F8FAFC] border-y border-[#E2E8F0] py-8 overflow-hidden">
        <div className="container">
          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 md:gap-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    className="w-8 h-8 rounded-full bg-[#0B1B3A]/10 border-2 border-white"
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...spring.superBouncy, delay: 0.2 + i * 0.08 }}
                  />
                ))}
              </div>
              <span className="text-sm text-[#475569]">10,000+ happy clients</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: 0.3 }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.svg
                  key={i}
                  className="w-5 h-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  initial={{ opacity: 0, scale: 0, rotate: -180 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.superBouncy, delay: 0.4 + i * 0.08 }}
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </motion.svg>
              ))}
              <span className="text-sm text-[#475569] ml-1">5.0 on Google (200+ reviews)</span>
            </motion.div>
            <motion.div
              className="text-sm text-[#475569]"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.bouncy, delay: 0.5 }}
            >
              Featured in <span className="font-semibold text-[#0F172A]">Vogue</span> & <span className="font-semibold text-[#0F172A]">Elle</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section (PAS Framework) */}
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
              <Badge variant="muted" className="mb-4">The Problem</Badge>
            </motion.div>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={spring.dramatic}
            >
              Tired of Looking Tired?
            </motion.h2>
            <motion.p
              className="text-lg text-[#475569] leading-relaxed mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.1 }}
            >
              Fine lines appearing earlier than expected. Skin that&apos;s lost its glow.
              Stubborn areas that won&apos;t respond to skincare alone. You&apos;re not alone&mdash;and
              you don&apos;t have to settle.
            </motion.p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              {[
                {
                  title: "Aging Signs",
                  description: "Wrinkles, volume loss, and skin laxity that make you look older than you feel",
                },
                {
                  title: "Skin Concerns",
                  description: "Acne scars, sun damage, uneven tone, or texture issues affecting your confidence",
                },
                {
                  title: "Body Goals",
                  description: "Stubborn fat or loose skin that diet and exercise can't seem to fix",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.bouncy, delay: i * 0.15 }}
                >
                  <TiltCard tiltStrength={8} glareEnabled>
                    <Card variant="outlined" padding="md" className="h-full">
                      <motion.h3
                        className="font-semibold text-[#0F172A] mb-2"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        {item.title}
                      </motion.h3>
                      <p className="text-sm text-[#475569]">{item.description}</p>
                    </Card>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="services" className="section bg-[#F8FAFC] relative overflow-hidden">
        <FloatingParticles count={10} color="primary" size="sm" speed="slow" className="opacity-30" />

        <div className="container relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <Badge variant="accent" className="mb-4">The Solution</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              Advanced Treatments. Natural Results.
            </h2>
            <p className="text-lg text-[#475569] max-w-2xl mx-auto">
              Our board-certified team uses the latest techniques and technology to help
              you achieve your aesthetic goals—without surgery, with minimal downtime.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.1 }}
              >
                <TiltCard className="h-full" tiltStrength={6} glareEnabled>
                  <Card variant="default" padding="lg" className="text-center h-full">
                    <motion.div
                      className="w-14 h-14 bg-[#22D3EE]/10 rounded-full flex items-center justify-center mx-auto mb-4"
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(34, 211, 238, 0.2)" }}
                      transition={spring.snappy}
                    >
                      <motion.svg
                        className="w-7 h-7 text-[#22D3EE]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </motion.svg>
                    </motion.div>
                    <h3 className="font-semibold text-[#0F172A] mb-2">{service.name}</h3>
                    <p className="text-sm text-[#475569] mb-3">{service.description}</p>
                    <p className="text-sm font-semibold text-[#22D3EE]">{service.price}</p>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="section bg-white relative overflow-hidden">
        <div className="container">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
              Your Journey to Confidence
            </h2>
            <p className="text-lg text-[#475569]">
              Four simple steps to looking and feeling your best
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {process.map((item, i) => (
              <motion.div
                key={i}
                className="relative text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.15 }}
              >
                {/* Connector Line */}
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
                    className="w-16 h-16 bg-[#0B1B3A] rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 relative z-10"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...spring.superBouncy, delay: i * 0.15 }}
                    whileHover={{ scale: 1.1, backgroundColor: "#22D3EE" }}
                  >
                    {item.step}
                  </motion.div>
                  <h3 className="font-semibold text-[#0F172A] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#475569]">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="section bg-[#0B1B3A] relative overflow-hidden">
        <FloatingParticles count={15} color="accent" size="sm" speed="slow" className="opacity-20" />

        <div className="container relative z-10">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={spring.dramatic}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Real People. Real Results.
            </h2>
            <p className="text-lg text-white/70">
              Don&apos;t just take our word for it
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.bouncy, delay: i * 0.15 }}
              >
                <TiltCard className="h-full" tiltStrength={6} glareEnabled>
                  <Card variant="default" padding="lg" className="bg-white h-full">
                    <motion.div
                      className="flex mb-3"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {[...Array(testimonial.rating)].map((_, j) => (
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
                      <p className="text-sm text-[#475569]">{testimonial.treatment}</p>
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
          className="absolute -top-20 -left-20 w-64 h-64 bg-[#22D3EE]/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#0B1B3A]/5 rounded-full blur-3xl"
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
                Common Questions
              </motion.h2>
              <motion.p
                className="text-lg text-[#475569]"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.soft, delay: 0.2 }}
              >
                Everything you need to know before your visit
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...spring.soft, delay: 0.3 }}
            >
              <Accordion items={faqs} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Consultation Form */}
      <section id="consultation-form" className="section bg-white relative overflow-hidden">
        <FloatingParticles count={10} color="accent" size="sm" speed="slow" className="opacity-20" />

        {/* Animated decorations */}
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
          <div className="max-w-xl mx-auto">
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
                Book Your Free Consultation
              </motion.h2>
              <motion.p
                className="text-[#475569]"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...spring.soft, delay: 0.2 }}
              >
                Takes 30 seconds. No obligation. Our team will reach out within 24 hours.
              </motion.p>
            </motion.div>

            <AnimatePresence mode="wait">
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={spring.bouncy}
                >
                  <Card variant="default" padding="lg" className="text-center">
                    <motion.div
                      className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ ...spring.superBouncy, delay: 0.2 }}
                    >
                      <motion.svg
                        className="w-8 h-8 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </motion.svg>
                    </motion.div>
                    <motion.h3
                      className="text-xl font-semibold text-[#0F172A] mb-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      You&apos;re All Set!
                    </motion.h3>
                    <motion.p
                      className="text-[#475569] mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      Thank you, {formData.name}! We&apos;ve received your consultation request. Our team will call you within 24 hours to schedule your visit.
                    </motion.p>
                    <motion.p
                      className="text-sm text-[#475569]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      Questions? Call us at <a href={`tel:${clinic.phone}`} className="text-[#22D3EE] font-medium">{clinic.phone}</a>
                    </motion.p>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...spring.soft, delay: 0.3 }}
                >
                  <TiltCard tiltStrength={3} glareEnabled>
                    <Card variant="elevated" padding="lg">
                      {/* Progress Indicator */}
                      <div className="flex items-center justify-center gap-2 mb-8">
                        <div className={cn(
                          "w-3 h-3 rounded-full transition-colors",
                          formStep >= 1 ? "bg-[#22D3EE]" : "bg-[#E2E8F0]"
                        )} />
                        <div className="w-12 h-0.5 bg-[#E2E8F0]">
                          <div className={cn(
                            "h-full bg-[#22D3EE] transition-all",
                            formStep >= 2 ? "w-full" : "w-0"
                          )} />
                        </div>
                        <div className={cn(
                          "w-3 h-3 rounded-full transition-colors",
                          formStep >= 2 ? "bg-[#22D3EE]" : "bg-[#E2E8F0]"
                        )} />
                      </div>

                      <form onSubmit={handleSubmit}>
                        {formStep === 1 && (
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
                              label="Email Address"
                              name="email"
                              type="email"
                              placeholder="jane@example.com"
                              value={formData.email}
                              onChange={handleInputChange}
                              error={errors.email}
                              required
                            />
                            <Button type="button" onClick={handleNext} fullWidth size="lg">
                              Continue
                            </Button>
                          </div>
                        )}

                        {formStep === 2 && (
                          <div className="space-y-4">
                            <Input
                              label="Phone Number"
                              name="phone"
                              type="tel"
                              placeholder="(555) 123-4567"
                              value={formData.phone}
                              onChange={handleInputChange}
                              error={errors.phone}
                              required
                            />
                            <div>
                              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                                Treatment Interest <span className="text-red-500">*</span>
                              </label>
                              <select
                                name="treatment"
                                value={formData.treatment}
                                onChange={handleInputChange}
                                className={cn(
                                  "w-full px-4 py-3 rounded-[12px] border bg-white text-[#0F172A] transition-all duration-200",
                                  "focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent",
                                  errors.treatment ? "border-red-500" : "border-[#E2E8F0]"
                                )}
                              >
                                <option value="">Select a treatment...</option>
                                {services.map((service, i) => (
                                  <option key={i} value={service.name}>{service.name}</option>
                                ))}
                                <option value="other">Not sure / Multiple</option>
                              </select>
                              {errors.treatment && (
                                <p className="mt-2 text-sm text-red-500">{errors.treatment}</p>
                              )}
                            </div>
                            <div className="flex gap-3">
                              <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
                                Back
                              </Button>
                              <Button type="submit" loading={isSubmitting} className="flex-1" size="lg">
                                Book Consultation
                              </Button>
                            </div>
                          </div>
                        )}
                      </form>

                      <p className="text-center text-xs text-[#475569] mt-6">
                        <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Your information is secure and will never be shared.
                      </p>
                    </Card>
                  </TiltCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-[#0B1B3A] relative overflow-hidden">
        <FloatingParticles count={15} color="accent" size="sm" speed="slow" className="opacity-15" />

        {/* Animated decorations */}
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
            Ready to Transform?
          </motion.h2>
          <motion.p
            className="text-lg text-white/70 mb-8 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring.soft, delay: 0.1 }}
          >
            Join thousands of satisfied clients who&apos;ve discovered their best selves at {clinic.name}.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring.bouncy, delay: 0.2 }}
          >
            <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
              <Button variant="accent" size="lg" onClick={() => document.getElementById('consultation-form')?.scrollIntoView({ behavior: 'smooth' })}>
                Book Free Consultation
              </Button>
            </motion.div>
            <a href={`tel:${clinic.phone}`}>
              <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="lg" className="text-white hover:bg-white/10">
                  Call {clinic.phone}
                </Button>
              </motion.div>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 md:hidden z-40">
        <div className="flex gap-3">
          <a href={`tel:${clinic.phone}`} className="flex-1">
            <Button variant="secondary" fullWidth>
              <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </Button>
          </a>
          <Button className="flex-1" onClick={() => document.getElementById('consultation-form')?.scrollIntoView({ behavior: 'smooth' })}>
            Book Now
          </Button>
        </div>
      </div>

      {/* Bottom Padding for Mobile CTA */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
