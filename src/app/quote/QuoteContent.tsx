"use client";

import { useState, FormEvent, useEffect } from "react";
import { motion } from "framer-motion";
import { Button, Input, Textarea, Card } from "@/components/ui";
import { brand } from "@/lib/brand";
import { validateEmail, validateRequired } from "@/lib/utils";
import { trackQuoteView, trackQuoteSubmit, trackFormStart } from "@/lib/analytics";
import { signInWithMagicLink } from "@/lib/auth";
import { SignupForm } from "@/components/auth";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/AnimatedSection";
import {
  FloatingElement,
  RotatingElement,
} from "@/components/motion/ParallaxWrapper";
import Link from "next/link";
const projectTypes = [
  { value: "landing-page", label: "Landing Page" },
  { value: "funnel", label: "Full Funnel (Multiple Pages)" },
  { value: "redesign", label: "Landing Page Redesign" },
  { value: "optimization", label: "Conversion Optimization" },
  { value: "other", label: "Something Else" },
];

const timelines = [
  { value: "asap", label: "ASAP (Rush)" },
  { value: "2-weeks", label: "Within 2 Weeks" },
  { value: "1-month", label: "Within 1 Month" },
  { value: "flexible", label: "Flexible / Planning Ahead" },
];

const budgets = [
  { value: "under-2500", label: "Under $2,500" },
  { value: "2500-5000", label: "$2,500 - $5,000" },
  { value: "5000-10000", label: "$5,000 - $10,000" },
  { value: "over-10000", label: "$10,000+" },
  { value: "not-sure", label: "Not Sure Yet" },
];

const processSteps = [
  {
    step: "1",
    title: "We Review",
    text: "We review your project details within 24 hours",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    step: "2",
    title: "Get Proposal",
    text: "You receive a detailed proposal with scope and pricing",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    step: "3",
    title: "AI Interview",
    text: "Complete a quick AI-powered deep-dive about your brand",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    step: "4",
    title: "We Build",
    text: "If it's a fit, we start building your page",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default function QuoteContent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    website: "",
    projectType: "",
    timeline: "",
    budget: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasStartedForm, setHasStartedForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signupMethod, setSignupMethod] = useState<'password' | 'magic-link'>('password');
  const [loginState, setLoginState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [loginError, setLoginError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    trackQuoteView();
  }, []);

  const handleFormInteraction = () => {
    if (!hasStartedForm) {
      setHasStartedForm(true);
      trackFormStart("quote");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!validateRequired(formData.name)) {
      newErrors.name = "Please enter your name";
    }
    if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.projectType) {
      newErrors.projectType = "Please select a project type";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    setLoginState('sending');
    setLoginError(null);
    const { error } = await signInWithMagicLink(formData.email, '/dashboard');
    if (error) {
      setLoginState('error');
      setLoginError(error.message);
    } else {
      setLoginState('sent');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit quote request");
      }

      trackQuoteSubmit();
      setIsSubmitted(true);
    } catch (error) {
      console.error("Quote submission error:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again or email us directly."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select styling to match Input component
  const selectClasses = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border-2 bg-white text-[#0F172A] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] shadow-sm focus:shadow-md focus:shadow-[#0891B2]/10 hover:border-slate-300 ${
      hasError ? "border-red-400 focus:ring-red-400/30 focus:border-red-500" : "border-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-[#E2E8F0]">
        {/* Animated Background */}
        {!prefersReducedMotion && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" style={{ contain: "content" }}>
            <FloatingElement
              className="absolute -top-20 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-2xl"
              duration={6}
              distance={15}
            />
            <FloatingElement
              className="absolute top-1/2 -left-32 w-64 h-64 bg-[#0B1B3A]/5 rounded-full blur-2xl"
              duration={7}
              distance={20}
              delay={1}
            />
            <FloatingElement
              className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#22D3EE]/5 rounded-full blur-2xl"
              duration={5}
              distance={12}
              delay={0.5}
            />
            <RotatingElement
              className="absolute top-16 right-[12%] w-12 h-12"
              duration={25}
            >
              <div className="w-full h-full border-2 border-accent/20 rounded-lg" />
            </RotatingElement>
            <FloatingElement
              className="absolute top-1/3 right-[18%] w-2.5 h-2.5 bg-accent rounded-full"
              duration={3}
              distance={8}
            />
          </div>
        )}

        <div className="container py-16 md:py-20 relative z-10">
          <div className="max-w-2xl">
            {/* Eyebrow Badge */}
            <AnimatedSection animation="slideFromLeft" delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-5">
                <span className={`w-2 h-2 bg-accent rounded-full ${!prefersReducedMotion ? "sl-pulse" : ""}`} />
                <span className="text-sm font-medium text-primary">Free Quote</span>
              </div>
            </AnimatedSection>

            {/* Headline */}
            <AnimatedSection animation="slideUp" delay={0.2}>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.1] mb-5">
                Tell us about your project.
                <br />
                <span className="text-accent">We&apos;ll handle the rest.</span>
              </h1>
            </AnimatedSection>

            {/* Subheadline */}
            <AnimatedSection animation="blurIn" delay={0.4}>
              <p className="text-lg md:text-xl text-[#475569] leading-relaxed mb-6">
                Get a detailed proposal within 24 hours. No obligation, no spam
                — just a clear plan for{" "}
                <span className="text-primary font-medium">better conversions.</span>
              </p>
            </AnimatedSection>

            {/* Trust Indicators */}
            <AnimatedSection animation="slideUp" delay={0.6}>
              <StaggerContainer
                className="flex flex-wrap items-center gap-x-6 gap-y-2"
                staggerDelay={0.05}
                delayChildren={0.6}
              >
                {[
                  "24h reply",
                  "No obligation",
                  "You own everything",
                  "Fixed pricing",
                ].map((item, i) => (
                  <StaggerItem key={i} animation="slideUp">
                    <div className="flex items-center gap-2 text-primary/70 text-sm">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full" />
                      {item}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Form — 2 columns */}
            <div className="lg:col-span-2">
              <AnimatedSection animation="slideUp" delay={0.1}>
                {isSubmitted ? (
                  <div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center mb-8"
                    >
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-[#0F172A] mb-4">Quote Received!</h2>
                      <p className="text-[#475569] mb-4">
                        Thanks for submitting your project details. We&apos;ll review everything and send
                        you a detailed proposal within 24 hours at{" "}
                        <span className="font-medium text-[#0F172A]">{formData.email}</span>.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-amber-700">
                          Don&apos;t see our email? Check your <span className="font-semibold">spam or junk folder</span> and mark it as &quot;Not Spam.&quot;
                        </p>
                      </div>
                      <div className="bg-[#0891B2]/10 border border-[#0891B2]/20 rounded-lg p-4">
                        <p className="text-sm text-accent font-medium">
                          No payment required now. Review your proposal at your own pace.
                        </p>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className="p-6">
                        {loginState === 'sent' ? (
                          <div className="text-center">
                            <div className="w-12 h-12 bg-[#0891B2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Check Your Email</h3>
                            <p className="text-sm text-[#475569] mb-4">
                              We sent a login link to <span className="font-medium text-[#0F172A]">{formData.email}</span>
                            </p>
                            <p className="text-xs text-[#64748B]">
                              Click the link in your email to access your client dashboard and track your project.
                            </p>
                            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs text-amber-700">
                                Don&apos;t see it? Check your <span className="font-semibold">spam or junk folder</span> and mark it as &quot;Not Spam.&quot;
                              </p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-center mb-6">
                              <div className="w-12 h-12 bg-[#0891B2]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Create Your Account</h3>
                              <p className="text-sm text-[#475569]">
                                Get a client dashboard to track your project, view proposals, and manage payments.
                              </p>
                            </div>

                            <div className="flex bg-[#F1F5F9] rounded-[12px] p-1 mb-6">
                              <button
                                type="button"
                                onClick={() => setSignupMethod('password')}
                                className={`relative flex-1 py-2.5 px-4 text-sm font-medium rounded-[10px] transition-colors ${
                                  signupMethod === 'password'
                                    ? 'bg-white text-[#0F172A] shadow-sm'
                                    : 'text-[#64748B] hover:text-[#475569]'
                                }`}
                              >
                                Password
                              </button>
                              <button
                                type="button"
                                onClick={() => setSignupMethod('magic-link')}
                                className={`relative flex-1 py-2.5 px-4 text-sm font-medium rounded-[10px] transition-colors ${
                                  signupMethod === 'magic-link'
                                    ? 'bg-white text-[#0F172A] shadow-sm'
                                    : 'text-[#64748B] hover:text-[#475569]'
                                }`}
                              >
                                Magic Link
                              </button>
                            </div>

                            {signupMethod === 'password' ? (
                              <SignupForm email={formData.email} name={formData.name} />
                            ) : (
                              <>
                                {loginError && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-red-800">{loginError}</p>
                                  </div>
                                )}
                                <div className="bg-[#F1F5F9] rounded-lg p-3 mb-4 text-center">
                                  <p className="text-sm text-[#64748B]">We&apos;ll send a login link to</p>
                                  <p className="font-medium text-[#0F172A]">{formData.email}</p>
                                </div>
                                <Button onClick={handleCreateAccount} disabled={loginState === 'sending'} className="w-full">
                                  {loginState === 'sending' ? 'Sending...' : 'Send Magic Link'}
                                </Button>
                                <p className="text-xs text-[#64748B] mt-3 text-center">
                                  No password needed. We&apos;ll email you a secure login link.
                                </p>
                              </>
                            )}
                          </>
                        )}
                      </Card>

                      <div className="text-center mt-6">
                        <Link href="/" className="text-sm text-[#64748B] hover:text-accent transition-colors">
                          Back to Home
                        </Link>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <Card variant="elevated" padding="lg">
                    <form onSubmit={handleSubmit} onFocus={handleFormInteraction}>
                      {/* Contact Info */}
                      <div className="mb-8">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-1 h-6 bg-accent rounded-full" />
                          <h2 className="text-lg font-bold text-primary">
                            Contact Information
                          </h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
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
                            placeholder="jane@company.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            error={errors.email}
                            required
                          />
                        </div>
                        <div className="mt-4">
                          <Input
                            label="Website (Optional)"
                            name="website"
                            type="url"
                            placeholder="https://yourcompany.com"
                            value={formData.website}
                            onChange={handleInputChange}
                            hint="If you have an existing site, we'd love to see it"
                          />
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="mb-8">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-1 h-6 bg-accent rounded-full" />
                          <h2 className="text-lg font-bold text-primary">
                            Project Details
                          </h2>
                        </div>

                        {/* Project Type */}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-[#0B1B3A] mb-2">
                            What do you need?{" "}
                            <span className="text-accent ml-1" aria-hidden="true">*</span>
                          </label>
                          <select
                            name="projectType"
                            value={formData.projectType}
                            onChange={handleInputChange}
                            aria-label="Project type"
                            className={selectClasses(!!errors.projectType)}
                          >
                            <option value="">Select project type...</option>
                            {projectTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          {errors.projectType && (
                            <p className="mt-2 text-sm text-red-500" role="alert">
                              {errors.projectType}
                            </p>
                          )}
                        </div>

                        {/* Timeline */}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-[#0B1B3A] mb-2">
                            Timeline
                          </label>
                          <select
                            name="timeline"
                            value={formData.timeline}
                            onChange={handleInputChange}
                            aria-label="Project timeline"
                            className={selectClasses(false)}
                          >
                            <option value="">When do you need this?</option>
                            {timelines.map((timeline) => (
                              <option key={timeline.value} value={timeline.value}>
                                {timeline.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Budget */}
                        <div className="mb-4">
                          <label className="block text-sm font-semibold text-[#0B1B3A] mb-2">
                            Budget Range
                          </label>
                          <select
                            name="budget"
                            value={formData.budget}
                            onChange={handleInputChange}
                            aria-label="Budget range"
                            className={selectClasses(false)}
                          >
                            <option value="">Select budget range...</option>
                            {budgets.map((budget) => (
                              <option key={budget.value} value={budget.value}>
                                {budget.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Notes */}
                        <Textarea
                          label="Project Notes (Optional)"
                          name="notes"
                          placeholder="Tell us more about your project, goals, target audience, or any specific requirements..."
                          value={formData.notes}
                          onChange={handleInputChange}
                          hint="The more context you provide, the better our proposal will be"
                        />
                      </div>

                      {/* Submit */}
                      <motion.div
                        whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Button
                          type="submit"
                          variant="gradient"
                          size="lg"
                          fullWidth
                          loading={isSubmitting}
                        >
                          Get Your Free Quote
                        </Button>
                      </motion.div>

                      {submitError && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                          <p className="text-sm text-red-600">{submitError}</p>
                        </div>
                      )}

                      <p className="text-center text-sm text-[#475569] mt-4 flex items-center justify-center gap-1.5">
                        <svg
                          className="w-4 h-4 text-[#475569]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        Your information is secure and will never be shared.
                      </p>
                    </form>
                  </Card>
                )}
              </AnimatedSection>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* What Happens Next */}
                <AnimatedSection animation="slideFromRight" delay={0.2}>
                  <Card variant="default" padding="lg">
                    <h3 className="font-bold text-primary mb-5 flex items-center gap-2">
                      <span className="w-1 h-5 bg-accent rounded-full" />
                      What Happens Next?
                    </h3>
                    <StaggerContainer className="space-y-5" staggerDelay={0.08} delayChildren={0.3}>
                      {processSteps.map((item) => (
                        <StaggerItem key={item.step} animation="slideUp">
                          <div className="flex gap-3.5">
                            <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 text-accent">
                              {item.icon}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-primary">{item.title}</p>
                              <p className="text-sm text-[#475569] leading-relaxed">{item.text}</p>
                            </div>
                          </div>
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  </Card>
                </AnimatedSection>

                {/* Contact Info */}
                <AnimatedSection animation="slideFromRight" delay={0.35}>
                  <Card variant="default" padding="lg">
                    <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
                      <span className="w-1 h-5 bg-accent rounded-full" />
                      Questions?
                    </h3>
                    <p className="text-sm text-[#475569] mb-4">
                      Reach out via email. We typically respond within 24 hours.
                    </p>
                    <a
                      href={`mailto:${brand.email}`}
                      className="flex items-center gap-3 text-sm font-medium text-primary hover:text-accent transition-colors group"
                    >
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 text-accent group-hover:bg-accent/20 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      {brand.email}
                    </a>
                  </Card>
                </AnimatedSection>

                {/* Trust Badges */}
                <AnimatedSection animation="slideFromRight" delay={0.5}>
                  <Card variant="default" padding="md">
                    <div className="space-y-3">
                      {[
                        "Reply within 24 hours",
                        "No obligation",
                        "You own everything",
                        "Fixed scope & pricing",
                      ].map((text, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <svg
                            className="w-4 h-4 text-green-500 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-sm text-[#475569]">{text}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </AnimatedSection>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
