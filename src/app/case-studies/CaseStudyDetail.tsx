"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion/AnimatedSection";

export interface CaseStudyData {
  client: string;
  industry: string;
  challenge: string;
  solution: string;
  testimonial?: {
    quote: string;
    author: string;
    role: string;
    company: string;
  };
  package: string;
  packagePrice?: string;
  timeline: string;
  demoLink: string;
  siteUrl?: string;
  isRealProject?: boolean;
  results: {
    label: string;
    value: string;
    detail?: string;
  }[];
  challengePoints: string[];
  solutionPoints: string[];
}

export function CaseStudyDetail({ data }: { data: CaseStudyData }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sample Project Banner */}
      <div className="bg-[#22D3EE]/10 border-b border-[#22D3EE]/20">
        <div className="container py-2 flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm font-medium text-[#0B1B3A]">
            {data.isRealProject
              ? `Real Project — Built by StrataLanding for ${data.client}`
              : `Sample Project — Results are illustrative. ${data.client} is a fictional company.`}
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative bg-[#0B1B3A] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#22D3EE]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#22D3EE]/3 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="container pt-32 pb-16 relative z-10">
          {/* Back link */}
          <AnimatedSection animation="fadeIn" delay={0.05}>
            <Link
              href="/case-studies"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm mb-8"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              All Case Studies
            </Link>
          </AnimatedSection>

          {/* Industry badge */}
          <AnimatedSection animation="slideUp" delay={0.1}>
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="accent" size="md">
                {data.industry}
              </Badge>
              <span className="text-white/40 text-sm">
                {data.package} &middot; {data.timeline}
              </span>
            </div>
          </AnimatedSection>

          {/* Title */}
          <AnimatedSection animation="slideUp" delay={0.2}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight max-w-4xl">
              {data.client}
            </h1>
          </AnimatedSection>

          {/* Subtitle */}
          <AnimatedSection animation="slideUp" delay={0.3}>
            <p className="text-xl text-white/60 max-w-2xl leading-relaxed">
              {data.challenge.split(".")[0]}.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Overview */}
      <section className="container py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left: Narrative */}
          <div className="lg:col-span-2">
            <AnimatedSection animation="slideUp" delay={0.1}>
              <p className="text-lg text-[#334155] leading-relaxed">
                {data.challenge}
              </p>
            </AnimatedSection>
          </div>

          {/* Right: Quick Facts */}
          <div>
            <AnimatedSection animation="slideFromRight" delay={0.2}>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5 sticky top-24">
                <h3 className="font-bold text-[#0B1B3A] text-sm uppercase tracking-wider">
                  Project Details
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Client", value: data.client },
                    { label: "Industry", value: data.industry },
                    { label: "Package", value: data.packagePrice ? `${data.package} (${data.packagePrice})` : data.package },
                    { label: "Timeline", value: data.timeline },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center py-2 border-b border-[#E2E8F0] last:border-0"
                    >
                      <span className="text-sm text-[#334155]">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-[#0B1B3A]">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                {data.isRealProject && data.siteUrl ? (
                  <a href={data.siteUrl} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="secondary" size="sm" fullWidth>
                      Visit Live Site
                    </Button>
                  </a>
                ) : (
                  <Link href={data.demoLink} className="block">
                    <Button variant="secondary" size="sm" fullWidth>
                      View Live Demo
                    </Button>
                  </Link>
                )}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* The Challenge */}
      <section className="bg-white py-16">
        <div className="container">
          <div className="max-w-3xl">
            <AnimatedSection animation="slideUp" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-[#0B1B3A]/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-[#0B1B3A]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </span>
                <h2 className="text-3xl font-bold text-[#0B1B3A]">
                  The Challenge
                </h2>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="slideUp" delay={0.2}>
              <p className="text-lg text-[#334155] leading-relaxed mb-8">
                {data.challenge}
              </p>
            </AnimatedSection>

            <StaggerContainer
              className="space-y-3"
              staggerDelay={0.06}
              delayChildren={0.3}
            >
              {data.challengePoints.map((point, i) => (
                <StaggerItem key={i} animation="slideFromLeft">
                  <div className="flex items-start gap-3 p-4 bg-[#FEF2F2] rounded-xl border border-[#FECACA]">
                    <svg
                      className="w-5 h-5 text-[#DC2626] mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="text-[#334155]">{point}</span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* Our Solution */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-3xl">
            <AnimatedSection animation="slideUp" delay={0.1}>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-[#22D3EE]/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </span>
                <h2 className="text-3xl font-bold text-[#0B1B3A]">
                  Our Solution
                </h2>
              </div>
            </AnimatedSection>

            <AnimatedSection animation="slideUp" delay={0.2}>
              <p className="text-lg text-[#334155] leading-relaxed mb-8">
                {data.solution}
              </p>
            </AnimatedSection>

            <StaggerContainer
              className="space-y-3"
              staggerDelay={0.06}
              delayChildren={0.3}
            >
              {data.solutionPoints.map((point, i) => (
                <StaggerItem key={i} animation="slideFromLeft">
                  <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0]">
                    <svg
                      className="w-5 h-5 text-[#059669] mt-0.5 shrink-0"
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
                    <span className="text-[#334155]">{point}</span>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-[#0B1B3A] py-20">
        <div className="container">
          <AnimatedSection animation="slideUp" delay={0.1}>
            <div className="text-center mb-12">
              <Badge variant="accent" size="md" className="mb-4">
                {data.isRealProject ? "What Shipped" : "Illustrative Results"}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                {data.isRealProject ? "What We Built" : "The Results"}
              </h2>
            </div>
          </AnimatedSection>

          <StaggerContainer
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            staggerDelay={0.08}
            delayChildren={0.2}
          >
            {data.results.map((result) => (
              <StaggerItem key={result.label} animation="scaleUp">
                <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="text-3xl md:text-4xl font-black text-[#22D3EE] mb-2">
                    {result.value}
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">
                    {result.label}
                  </div>
                  {result.detail && (
                    <div className="text-xs text-white/40">{result.detail}</div>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonial — only when a real, attributable quote exists (audit 2026-08-12) */}
      {data.testimonial && (
      <section className="py-20 bg-white">
        <div className="container">
          <AnimatedSection animation="blurIn" delay={0.1}>
            <div className="max-w-3xl mx-auto text-center">
              {/* Quote mark */}
              <svg
                className="w-12 h-12 text-[#22D3EE]/30 mx-auto mb-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
              </svg>

              {/* AUDIT 2026-08-12: renders only when a REAL, attributable quote exists. Both
                  published case studies previously shipped an invented testimonial while flagged
                  isRealProject, so the "fictional" disclaimer below never appeared. */}
              <blockquote className="text-xl md:text-2xl text-[#0B1B3A] font-medium leading-relaxed mb-8 italic">
                &ldquo;{data.testimonial?.quote}&rdquo;
              </blockquote>

              <div>
                <div className="font-bold text-[#0B1B3A]">
                  {data.testimonial?.author}
                </div>
                <div className="text-sm text-[#334155]">
                  {data.testimonial?.role}, {data.testimonial?.company}
                </div>
              </div>

              {!data.isRealProject && (
                <p className="text-xs text-[#334155]/50 mt-4">
                  * Fictional testimonial for illustration purposes
                </p>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
      )}

      {/* Demo Link + CTA */}
      <section className="bg-[#F8FAFC] py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Demo */}
            <AnimatedSection animation="slideFromLeft" delay={0.1}>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center h-full flex flex-col justify-center">
                <div className="w-12 h-12 rounded-full bg-[#0B1B3A]/5 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-[#0B1B3A]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#0B1B3A] mb-2">
                  {data.isRealProject ? "Visit the Live Site" : "See the Live Demo"}
                </h3>
                <p className="text-sm text-[#334155] mb-6">
                  {data.isRealProject
                    ? "See the actual page we designed and built."
                    : "Explore the actual landing page template built for this type of project."}
                </p>
                {data.isRealProject && data.siteUrl ? (
                  <a href={data.siteUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="md">
                      Visit Live Site
                    </Button>
                  </a>
                ) : (
                  <Link href={data.demoLink}>
                    <Button variant="secondary" size="md">
                      View Demo Page
                    </Button>
                  </Link>
                )}
              </div>
            </AnimatedSection>

            {/* CTA */}
            <AnimatedSection animation="slideFromRight" delay={0.2}>
              <div className="bg-[#0B1B3A] rounded-2xl p-8 text-center h-full flex flex-col justify-center">
                <div className="w-12 h-12 rounded-full bg-[#22D3EE]/10 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-[#22D3EE]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Want a Page Like This?
                </h3>
                <p className="text-sm text-white/60 mb-6">
                  Start your project brief and get a proposal within 24 hours.
                  Fixed scope. No calls required.
                </p>
                <Link href="/brief">
                  <Button variant="gradient" size="md">
                    Start Project Brief
                  </Button>
                </Link>
                <p className="text-xs text-white/40 mt-3">
                  Proposal in 24 hours. Fixed price.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="border-t border-[#E2E8F0] py-8">
        <div className="container flex items-center justify-between">
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 text-[#334155] hover:text-[#0B1B3A] transition-colors text-sm font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All Case Studies
          </Link>
          <Link
            href="/demos"
            className="inline-flex items-center gap-2 text-[#334155] hover:text-[#0B1B3A] transition-colors text-sm font-medium"
          >
            Browse All Demos
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
