"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSpring, useInView } from "framer-motion";
import { Button } from "@/components/ui";
import { AnimatedSection } from "@/components/motion/AnimatedSection";

// Optimized animated counter - only animates when value changes
function AnimatedValue({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false });
  const springValue = useSpring(0, { stiffness: 80, damping: 20 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      springValue.set(value);
    }
  }, [isInView, value, springValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [springValue]);

  return (
    <span ref={ref}>
      {prefix}{Math.floor(displayValue).toLocaleString()}{suffix}
    </span>
  );
}

export function ROICalculator() {
  const [traffic, setTraffic] = useState(5000);
  const [currentCR, setCurrentCR] = useState(1);
  const [customerValue, setCustomerValue] = useState(500);

  const stats = useMemo(() => {
    const targetCR = 3.5;
    const currentLeads = (traffic * currentCR) / 100;
    const projectedLeads = (traffic * targetCR) / 100;
    const currentRevenue = currentLeads * customerValue;
    const projectedRevenue = projectedLeads * customerValue;
    const revenueUplift = projectedRevenue - currentRevenue;

    return {
      currentLeads: Math.floor(currentLeads),
      projectedLeads: Math.floor(projectedLeads),
      revenueUplift: Math.floor(revenueUplift),
    };
  }, [traffic, currentCR, customerValue]);

  return (
    <section className="py-24 bg-[#0B1B3A] text-white overflow-hidden relative">
      <div className="container px-4 mx-auto relative z-10">
        <AnimatedSection animation="slideUp" className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Calculate your{" "}
            <span className="text-accent">Conversion Uplift</span>
          </h2>
          <p className="text-white/80 text-lg">
            See how much revenue you&apos;re leaving on the table with a standard landing page vs. one built with Conversion Architecture.
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Inputs */}
          <AnimatedSection animation="slideFromLeft" className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm">
            <div className="space-y-8">
              <div>
                <div className="flex flex-col sm:flex-row justify-between mb-2 sm:mb-4 gap-1">
                  <label className="text-sm font-medium text-slate-300">Monthly Traffic</label>
                  <span className="text-accent font-bold">{traffic.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="50000"
                  step="500"
                  value={traffic}
                  onChange={(e) => setTraffic(Number(e.target.value))}
                  aria-label="Monthly Traffic"
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between mb-2 sm:mb-4 gap-1">
                  <label className="text-sm font-medium text-slate-300">Current Conversion Rate (%)</label>
                  <span className="text-accent font-bold">{currentCR}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={currentCR}
                  onChange={(e) => setCurrentCR(Number(e.target.value))}
                  aria-label="Current Conversion Rate"
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              <div>
                <div className="flex flex-col sm:flex-row justify-between mb-2 sm:mb-4 gap-1">
                  <label className="text-sm font-medium text-slate-300">Avg. Customer Value ($)</label>
                  <span className="text-accent font-bold">${customerValue.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={customerValue}
                  onChange={(e) => setCustomerValue(Number(e.target.value))}
                  aria-label="Average Customer Value"
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
            </div>
          </AnimatedSection>

          {/* Results */}
          <AnimatedSection animation="slideFromRight" className="relative">
            <div className="bg-accent/90 text-primary p-10 rounded-3xl shadow-2xl shadow-accent/20 border border-white/20">
              <p className="text-sm font-bold uppercase tracking-wider mb-2 opacity-70">
                Projected Monthly Growth
              </p>
              <h3 className="text-5xl md:text-7xl font-bold mb-8">
                +$<AnimatedValue value={stats.revenueUplift} />
              </h3>

              <div className="grid grid-cols-2 gap-6 border-t border-[#0B1B3A]/10 pt-8">
                <div>
                  <p className="text-sm opacity-70 mb-1">Current Leads</p>
                  <p className="text-2xl font-bold">
                    <AnimatedValue value={stats.currentLeads} />
                  </p>
                </div>
                <div>
                  <p className="text-sm opacity-70 mb-1">Projected Leads</p>
                  <p className="text-2xl font-bold text-white bg-primary inline-block px-3 py-1 rounded-lg">
                    <AnimatedValue value={stats.projectedLeads} />
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <Button className="w-full py-6 text-lg bg-primary text-white hover:bg-primary/90 border-none shadow-xl transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]">
                  Get My Full Strategy Report
                </Button>
                <p className="text-center text-sm text-primary/70 mt-8">
                  * Based on conservative industry benchmarks. Your actual results
                  may vary significantly based on offer strength.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
