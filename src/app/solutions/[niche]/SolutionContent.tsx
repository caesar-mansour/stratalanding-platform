"use client";

import { motion } from "framer-motion";
import { Services, ROICalculator } from "@/components/sections";

export default function SolutionContent({ niche }: { niche: string }) {
  const nicheLabel =
    niche.charAt(0).toUpperCase() + niche.slice(1).replace(/-/g, " ");

  return (
    <div className="bg-background">
      <section className="section pt-32 pb-20 border-b border-border">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="inline-block px-3 py-1 bg-accent/10 text-accent text-xs font-bold rounded-full mb-6 uppercase tracking-widest">
              Industry Specific Solutions
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-primary mb-8 leading-tight">
              Higher Conversions for{" "}
              <span className="text-accent">{nicheLabel}</span> Companies
            </h1>
            <p className="text-xl text-text-muted max-w-2xl">
              Generic templates don&apos;t work for {nicheLabel}. We build
              specialized landing pages designed for the unique psychology of
              your {nicheLabel} prospects.
            </p>
          </motion.div>
        </div>
      </section>

      <Services />
      <ROICalculator />

      <section className="section bg-surface">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-primary mb-8">
            Ready to scale your {nicheLabel} lead generation?
          </h2>
          <div className="flex justify-center">
            <a
              href="/brief"
              className="px-8 py-4 bg-primary text-white rounded-full font-bold hover:bg-accent hover:text-primary transition-all shadow-xl"
            >
              Start Your {nicheLabel} Project Brief
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
