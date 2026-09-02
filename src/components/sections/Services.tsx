"use client";

import { motion } from "framer-motion";
import { whatWeBuild } from "@/lib/brand";
import { AnimatedSection } from "@/components/motion/AnimatedSection";
import { ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

const iconComponents: Record<string, ReactNode> = {
  design: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  copy: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  code: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  speed: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  integrations: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  analytics: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

// Performance-optimized spring
const smoothSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

export function Services() {
  const prefersReducedMotion = useReducedMotion();

  // Map whatWeBuild items for the bento grid layout
  const items = whatWeBuild;

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container px-4 mx-auto">
        <AnimatedSection animation="slideUp" className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0B1B3A] mb-6">
            Everything included in <br />
            <span className="text-accent">every project.</span>
          </h2>
          <p className="text-[#475569] text-xl max-w-2xl">
            Premium landing pages with design, copy, development, and analytics—all in one package.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[250px] md:auto-rows-[300px]">
          {/* Bento Card 1: Large Code Card */}
          <motion.div
            className="md:col-span-8 bg-[#0B1B3A] rounded-3xl p-8 md:p-12 relative overflow-hidden group will-change-transform"
            whileHover={prefersReducedMotion ? {} : { y: -5 }}
            transition={smoothSpring}
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center text-accent mb-6">
                  {iconComponents[items[2].icon]}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">{items[2].title}</h3>
                <p className="text-white/70 text-lg max-w-md">{items[2].description}</p>
              </div>
            </div>
            {/* Abstract decorations */}
            <motion.div
              className="absolute -right-20 -bottom-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors duration-500"
            />
          </motion.div>

          {/* Bento Card 2: Design Card */}
          <motion.div
            className="md:col-span-4 bg-slate-50 rounded-3xl p-8 relative overflow-hidden group border border-slate-100 will-change-transform"
            whileHover={prefersReducedMotion ? {} : { y: -5 }}
            transition={smoothSpring}
          >
            <div className="w-12 h-12 bg-[#0B1B3A] rounded-xl flex items-center justify-center text-white mb-6">
              {iconComponents[items[0].icon]}
            </div>
            <h3 className="text-2xl font-bold text-[#0B1B3A] mb-4">{items[0].title}</h3>
            <p className="text-[#475569]">{items[0].description}</p>
            <div className="absolute bottom-4 right-4 text-[#0B1B3A]/10 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-500">
              {iconComponents[items[0].icon]}
            </div>
          </motion.div>

          {/* Bento Card 3: Copy Card */}
          <motion.div
            className="md:col-span-5 bg-slate-50 rounded-3xl p-8 relative overflow-hidden group border border-slate-100 will-change-transform"
            whileHover={prefersReducedMotion ? {} : { y: -5 }}
            transition={smoothSpring}
          >
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center text-white mb-6">
              {iconComponents[items[1].icon]}
            </div>
            <h3 className="text-2xl font-bold text-[#0B1B3A] mb-4">{items[1].title}</h3>
            <p className="text-[#475569]">{items[1].description}</p>
          </motion.div>

          {/* Bento Card 4: Analytics */}
          <motion.div
            className="md:col-span-7 bg-gradient-to-br from-accent to-primary rounded-3xl p-8 md:p-12 relative overflow-hidden group text-white will-change-transform"
            whileHover={prefersReducedMotion ? {} : { y: -5 }}
            transition={smoothSpring}
          >
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 backdrop-blur-md">
                {iconComponents[items[5].icon]}
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">{items[5].title}</h3>
              <p className="text-white/80 text-lg max-w-sm">{items[5].description}</p>
            </div>
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
