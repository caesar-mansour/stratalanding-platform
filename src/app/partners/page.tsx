"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { brand } from "@/lib/brand";
import { Button, Input } from "@/components/ui";
import { trackPartnerView, trackPartnerSignupStart, trackPartnerSignupSubmit } from "@/lib/analytics";

// ─── Data ────────────────────────────────────────────────────────────────────

const commissions = [
  { name: "Presence Page", price: "$2,400", amount: 480, display: "$480", tag: null },
  { name: "Lead Page", price: "$4,800", amount: 960, display: "$960", tag: "Popular" },
  { name: "Purchase Page", price: "$9,600", amount: 1920, display: "$1,920", tag: "Best" },
];

const steps = [
  {
    n: "01", title: "Apply",
    body: "Fill out the form below. We review and activate partner accounts within 48 hours. No fees, no commitments.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  },
  {
    n: "02", title: "Share",
    body: "Get your unique referral link. Every visitor who clicks it is tracked in their browser for 90 days — even if they don't buy immediately.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  },
  {
    n: "03", title: "Earn",
    body: "When your referred client pays their final invoice, we calculate 20% commission and send it to your PayPal. No minimums.",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
];

const audiences = [
  { title: "Web Designers", body: "Refer the projects you don't take on. Turn declined work into passive income.", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg> },
  { title: "Marketing Consultants", body: "When your strategy needs a conversion page to match, send them our way.", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg> },
  { title: "Agencies", body: "Out-of-scope landing page requests become passive income instead of awkward declines.", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg> },
  { title: "Business Coaches", body: "Your clients are building offers. Help them launch with a page that actually converts.", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg> },
];

const faqs = [
  { q: "How long does the cookie last?", a: "90 days. If someone clicks your link today and buys within 90 days, you earn the commission." },
  { q: "When do I get paid?", a: "After the client pays their final invoice in full. We send PayPal payouts within 5 business days." },
  { q: "Is there a minimum payout?", a: "No. Every commission gets paid. The smallest possible commission is $480." },
  { q: "How is my referral tracked?", a: "Your unique link adds a ?ref=CODE parameter. We store it in the visitor's browser for 90 days and attach it to any brief they submit." },
  { q: "What if the client doesn't buy right away?", a: "As long as they submit a brief within 90 days of clicking your link, you get credit when they convert." },
];

const CALC_OPTIONS = [1, 3, 5, 10];

// ─── Counter Hook ────────────────────────────────────────────────────────────

function useCounter(target: number, dur = 1.6) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-80px" });
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / (dur * 1000), 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step); else setCount(target);
    };
    requestAnimationFrame(step);
  }, [inView, target, dur]);
  return { ref, count };
}

// ─── Floating Accent Dots ────────────────────────────────────────────────────

function FloatingDots() {
  return (
    <>
      {[
        { size: 6, top: "15%", left: "8%", delay: 0, dur: 7 },
        { size: 4, top: "30%", right: "12%", delay: 1, dur: 9 },
        { size: 5, top: "60%", left: "15%", delay: 2, dur: 8 },
        { size: 3, top: "75%", right: "20%", delay: 0.5, dur: 10 },
        { size: 4, top: "45%", left: "85%", delay: 1.5, dur: 7.5 },
      ].map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{ width: d.size, height: d.size, top: d.top, left: d.left, right: d.right, background: "#0891B2", opacity: 0.25 }}
          animate={{ y: [0, -20, 0], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: d.dur, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
        />
      ))}
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PartnersPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", company: "", website: "", paypalEmail: "", password: "", confirmPassword: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [calcRefs, setCalcRefs] = useState(3);

  const heroCounter = useCounter(1920);
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });
  const [hasStartedForm, setHasStartedForm] = useState(false);

  // Track partner page view
  useEffect(() => { trackPartnerView(); }, []);

  // Track first form interaction
  const handleFormInteraction = () => {
    if (!hasStartedForm) {
      setHasStartedForm(true);
      trackPartnerSignupStart();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords don't match.");
      setIsSubmitting(false);
      return;
    }
    if (formData.password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setIsSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password, company: formData.company || undefined, website: formData.website || undefined, paypalEmail: formData.paypalEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setReferralCode(data.referralCode);
      setSubmitState("success");
      trackPartnerSignupSubmit();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcAvg = calcRefs * 960;

  return (
    <div className="min-h-screen">

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO — Full viewport, split layout
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden min-h-[100vh] flex items-center bg-[#0B1B3A]">

        {/* Ambient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(8,145,178,0.08) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />
        <motion.div className="absolute rounded-full pointer-events-none" style={{ width: 700, height: 700, top: "-20%", right: "-10%", background: "radial-gradient(circle, rgba(8,145,178,0.15) 0%, transparent 65%)" }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute rounded-full pointer-events-none" style={{ width: 500, height: 500, bottom: "-15%", left: "-8%", background: "radial-gradient(circle, rgba(8,145,178,0.1) 0%, transparent 65%)" }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }} />
        {/* Diagonal gradient line */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(135deg, transparent 0%, transparent 48%, rgba(8,145,178,0.04) 49%, rgba(8,145,178,0.04) 51%, transparent 52%, transparent 100%)",
        }} />
        <FloatingDots />

        <div className="container relative z-10 py-28 md:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">

            {/* Left */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0, 0, 0.2, 1] }}>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-10"
                style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.25)", boxShadow: "0 0 20px rgba(8,145,178,0.08)" }}
              >
                <span className="w-2 h-2 rounded-full bg-[#0891B2] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#22D3EE]">Partner Program</span>
              </motion.div>

              {/* Headline */}
              <h1 className="font-bold leading-[0.95] mb-8" style={{ fontSize: "clamp(52px, 7vw, 88px)" }}>
                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="block text-white">
                  Earn up to
                </motion.span>
                <motion.span
                  ref={heroCounter.ref}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="block"
                  style={{ color: "#22D3EE", textShadow: "0 0 60px rgba(34,211,238,0.3)" }}
                >
                  ${heroCounter.count.toLocaleString()}
                </motion.span>
                <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="block text-white/40" style={{ fontSize: "0.5em", fontWeight: 600, letterSpacing: "0.03em" }}>
                  per referral
                </motion.span>
              </h1>

              {/* Sub */}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-white/55 mb-12 max-w-lg leading-relaxed" style={{ fontSize: 18 }}>
                Refer clients to StrataLanding. Earn a flat 20% commission on every project — paid directly to your PayPal after the final invoice. 90-day tracking, no minimums.
              </motion.p>

              {/* CTAs */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex flex-wrap gap-4 mb-14">
                <Button variant="gradient" size="lg" onClick={scrollToForm}>Apply Now — Free</Button>
                <button
                  onClick={scrollToForm}
                  className="group px-6 py-3.5 rounded-xl font-semibold text-sm text-white/60 transition-all border border-white/10 hover:border-white/20 hover:text-white/80 hover:bg-white/5"
                >
                  See Commissions
                  <span className="inline-block ml-2 transition-transform group-hover:translate-y-0.5">↓</span>
                </button>
              </motion.div>

              {/* Stats chips */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="flex flex-wrap gap-3">
                {[["20%", "Commission"], ["90 days", "Cookie"], ["$0", "Minimum"]].map(([val, label]) => (
                  <div key={label} className="rounded-xl px-5 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                    <div className="font-bold text-lg text-[#22D3EE] leading-tight">{val}</div>
                    <div className="text-[10px] uppercase tracking-widest text-white/35 mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Commission Card */}
            <motion.div
              initial={{ opacity: 0, x: 60, rotateY: -8 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0, 0, 0.2, 1] }}
              className="relative hidden lg:flex items-center justify-center"
              style={{ perspective: 1000 }}
            >
              {/* Glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 70%)", filter: "blur(50px)" }} />
              </div>

              <div className="relative w-full max-w-sm">
                {/* Main glass card */}
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="rounded-[24px] p-7"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(24px)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* AUDIT 2026-08-12 (P2): this card shows invented operational data — "Jane Doe",
                      "Partner since Jan 2025", "$1,920 Latest Commission", "12 Referrals /
                      $8.6k Earned". Unlabelled it reads as a real partner's real earnings, which
                      with zero partners is a fabricated proof claim. Label it plainly. */}
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white/60 border border-white/15">
                    Example dashboard
                  </div>

                  {/* Profile */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-cyan-500/20">JD</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white">Jane Doe</div>
                      <div className="text-[11px] text-white/35">Partner since Jan 2025</div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </div>
                  </div>

                  {/* Commission highlight */}
                  <div className="rounded-2xl p-6 mb-5" style={{ background: "linear-gradient(135deg, rgba(8,145,178,0.12) 0%, rgba(8,145,178,0.04) 100%)", border: "1px solid rgba(8,145,178,0.2)", boxShadow: "inset 0 1px 0 rgba(8,145,178,0.1)" }}>
                    <div className="text-[11px] uppercase tracking-widest text-white/40 mb-2">Latest Commission</div>
                    <div className="font-bold leading-none mb-1" style={{ fontSize: 42, color: "#22D3EE", textShadow: "0 0 30px rgba(34,211,238,0.2)" }}>$1,920</div>
                    <div className="text-xs text-white/35 mt-1.5">Purchase Page · paid in full</div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[["12", "Referrals"], ["$8.6k", "Earned"], ["$7.2k", "Paid"]].map(([val, label]) => (
                      <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="font-bold text-sm text-white">{val}</div>
                        <div className="text-[10px] text-white/30 mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Floating payout toast */}
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.5, type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute -bottom-5 -right-4 rounded-2xl px-5 py-3.5 flex items-center gap-3"
                  style={{ background: "rgba(11,27,58,0.95)", border: "1px solid rgba(8,145,178,0.4)", boxShadow: "0 16px 40px rgba(0,0,0,0.4), 0 0 20px rgba(8,145,178,0.1)", backdropFilter: "blur(12px)" }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#4ADE80" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">PayPal payout sent</div>
                    <div className="text-[11px] text-white/40">$960.00 · just now</div>
                  </div>
                </motion.div>

                {/* Floating click notification */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.2, type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute -top-3 -left-8 rounded-xl px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "rgba(11,27,58,0.95)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
                  <span className="text-[11px] font-semibold text-white/70">+3 clicks today</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          HOW IT WORKS — Timeline
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-gradient-to-br from-[#f0f4f8] via-[#f8fafc] to-[#e8f4f8] relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-1/2 -right-10 w-72 h-72 bg-[#0891B2]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-1/3 w-64 h-64 bg-[#0B1B3A]/3 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/80 rounded-full mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2]" />
              <span className="text-xs font-bold text-[#0B1B3A] uppercase tracking-widest">How It Works</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0B1B3A] mb-4">Three steps. Zero friction.</h2>
            <p className="text-[var(--text-muted)] max-w-md mx-auto">No complicated dashboards. No approvals before you start sharing.</p>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.12 }}
                className="flex gap-6 md:gap-10 items-start"
              >
                {/* Number node */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#0B1B3A] flex items-center justify-center text-white shadow-lg shadow-[#0891B2]/20">
                    {step.icon}
                  </div>
                  {i < steps.length - 1 && <div className="w-px h-16 bg-gradient-to-b from-[#0891B2]/30 to-transparent mt-3" />}
                </div>
                {/* Card */}
                <div className="flex-1 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.04),0_16px_32px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.06),0_24px_48px_rgba(0,0,0,0.08)] transition-shadow duration-300 -mt-1">
                  <div className="text-accent text-xs font-bold tracking-widest uppercase mb-2">Step {step.n}</div>
                  <h3 className="text-xl font-bold text-[#0B1B3A] mb-2">{step.title}</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          COMMISSION CARDS
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-[#0B1B3A] relative overflow-hidden">
        <FloatingDots />
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(8,145,178,0.06) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }} />

        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-6" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.25)" }}>
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#22D3EE]">Commissions</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">What you earn</h2>
            <p className="text-white/50 max-w-lg mx-auto">Flat 20% on every package. The more ambitious the client, the bigger your check.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {commissions.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.12, type: "spring", stiffness: 250, damping: 25 }}
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="relative group rounded-[24px] p-8 cursor-default"
                style={{
                  background: c.tag === "Best" ? "linear-gradient(135deg, rgba(8,145,178,0.12) 0%, rgba(8,145,178,0.04) 100%)" : "rgba(255,255,255,0.03)",
                  border: c.tag === "Best" ? "1.5px solid rgba(8,145,178,0.5)" : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: c.tag === "Best" ? "0 0 50px rgba(8,145,178,0.1), inset 0 1px 0 rgba(8,145,178,0.15)" : "inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                {c.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="rounded-full px-4 py-1 text-[11px] font-bold tracking-wider uppercase shadow-lg"
                      style={{ background: c.tag === "Best" ? "linear-gradient(135deg, #0891B2, #22D3EE)" : "rgba(8,145,178,0.3)", color: "#fff", boxShadow: "0 4px 12px rgba(8,145,178,0.3)" }}>
                      {c.tag === "Best" ? "Highest Payout" : c.tag}
                    </div>
                  </div>
                )}
                <div className="text-sm font-semibold text-white/55 mb-1">{c.name}</div>
                <div className="text-xs text-white/30 mb-8">Project price: {c.price}</div>
                <div className="font-bold leading-none mb-2 group-hover:scale-105 transition-transform origin-left" style={{ fontSize: 56, color: "#22D3EE", textShadow: "0 0 40px rgba(34,211,238,0.15)" }}>{c.display}</div>
                <div className="text-sm text-white/35">per referral · 20%</div>
                {/* Bottom accent line */}
                <div className="mt-8 h-px w-full" style={{ background: c.tag === "Best" ? "linear-gradient(to right, transparent, rgba(8,145,178,0.4), transparent)" : "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)" }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          WHO IT'S FOR
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-gradient-to-br from-[#f0f4f8] via-[#f8fafc] to-[#e8f4f8] relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#0891B2]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/80 rounded-full mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-bold text-[#0B1B3A] uppercase tracking-widest">Who It&apos;s For</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0B1B3A] mb-4">Built for people with clients</h2>
            <p className="text-[var(--text-muted)] max-w-md mx-auto">Anyone whose clients regularly need high-performance landing pages.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {audiences.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[24px] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.04),0_16px_32px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.06),0_24px_48px_rgba(0,0,0,0.08)] hover:border-[#0891B2]/20 transition-all duration-300 cursor-default"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br from-[#0891B2]/10 to-[#0B1B3A]/5 text-accent shadow-inner">
                  {a.icon}
                </div>
                <h3 className="font-bold text-[#0B1B3A] mb-2">{a.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">{a.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SIGN-UP FORM — Split layout
      ═══════════════════════════════════════════════════════════════════════ */}
      <section ref={formRef} className="py-28 md:py-36 bg-[#0B1B3A] relative overflow-hidden">
        <FloatingDots />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 50% at 20% 50%, rgba(8,145,178,0.08) 0%, transparent 60%)",
        }} />

        <div className="container relative z-10">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* Left — Calculator */}
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.25)" }}>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#22D3EE]">Earnings Preview</span>
              </div>
              <h2 className="font-bold mb-4 text-white" style={{ fontSize: "clamp(30px, 4vw, 44px)" }}>How much could you earn?</h2>
              <p className="text-white/45 mb-12 leading-relaxed max-w-md">Based on average commission of $960 per referral. Even one client a month adds up.</p>

              {/* Selector */}
              <div className="mb-10">
                <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Referrals per month</div>
                <div className="flex gap-3">
                  {CALC_OPTIONS.map(n => (
                    <motion.button
                      key={n}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCalcRefs(n)}
                      className="w-16 h-16 rounded-2xl font-bold text-lg transition-all"
                      style={{
                        background: calcRefs === n ? "rgba(8,145,178,0.2)" : "rgba(255,255,255,0.03)",
                        border: calcRefs === n ? "1.5px solid rgba(8,145,178,0.6)" : "1px solid rgba(255,255,255,0.07)",
                        color: calcRefs === n ? "#22D3EE" : "rgba(248,250,252,0.4)",
                        boxShadow: calcRefs === n ? "0 0 20px rgba(8,145,178,0.15), inset 0 1px 0 rgba(8,145,178,0.1)" : "none",
                      }}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Result */}
              <div className="rounded-[24px] p-8" style={{ background: "linear-gradient(135deg, rgba(8,145,178,0.1) 0%, rgba(8,145,178,0.03) 100%)", border: "1px solid rgba(8,145,178,0.2)", boxShadow: "inset 0 1px 0 rgba(8,145,178,0.1)" }}>
                <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Estimated monthly earnings</div>
                <motion.div key={calcAvg} initial={{ scale: 0.92, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="font-bold mb-1.5" style={{ fontSize: 56, color: "#22D3EE", lineHeight: 1, textShadow: "0 0 40px rgba(34,211,238,0.2)" }}>
                  ${calcAvg.toLocaleString()}
                </motion.div>
                <div className="text-sm text-white/30">${(calcAvg * 12).toLocaleString()} / year</div>
                <div className="mt-6 pt-6 grid grid-cols-3 gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  {commissions.map(c => (
                    <div key={c.name}>
                      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{c.name.split(" ")[0]}</div>
                      <div className="font-bold text-[#22D3EE]">${(c.amount * calcRefs).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right — Form */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay: 0.1 }}>
              <div className="rounded-[24px] p-8 lg:p-10" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.2)", backdropFilter: "blur(16px)" }}>
                {submitState === "success" && referralCode ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                      style={{ background: "rgba(8,145,178,0.12)", border: "1px solid rgba(8,145,178,0.35)", boxShadow: "0 0 30px rgba(8,145,178,0.15)" }}>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#22D3EE" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">Application Received</h3>
                    <p className="text-sm text-white/45 mb-8">We&apos;ll activate your account within 48 hours.</p>
                    <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.25)" }}>
                      <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Your Referral Code</div>
                      <div className="font-bold mb-2" style={{ fontSize: 38, color: "#22D3EE", letterSpacing: "0.12em", textShadow: "0 0 30px rgba(34,211,238,0.2)" }}>{referralCode}</div>
                      <div className="text-xs font-mono text-white/30">{brand.url}?ref={referralCode}</div>
                    </div>
                    <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
                      <p className="text-sm text-amber-300 font-medium text-center">Check your email to verify your account, then log in.</p>
                    </div>
                    <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-xs text-white/40 text-center">Don&apos;t see it? Check your <span className="font-semibold text-white/60">spam or junk folder</span> and mark it as &quot;Not Spam.&quot;</p>
                    </div>
                    <p className="text-xs text-white/30">Save your referral code. Once verified and approved, every visitor who clicks your link is tracked for 90 days.</p>
                  </motion.div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-white mb-1">Apply to Partner</h3>
                    <p className="text-sm text-white/35 mb-8">Free. No commitment. Reviewed within 48 hours.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-white/50 mb-2">Full Name *</label>
                          <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} onFocus={handleFormInteraction} placeholder="Jane Smith" required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-white/50 mb-2">Email *</label>
                          <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="jane@email.com" required />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white/50 mb-2">Company / Agency</label>
                        <Input value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} placeholder="Optional" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white/50 mb-2">Website</label>
                        <Input value={formData.website} onChange={e => setFormData(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com (optional)" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-white/50 mb-2">PayPal Email *</label>
                        <Input type="email" value={formData.paypalEmail} onChange={e => setFormData(p => ({ ...p, paypalEmail: e.target.value }))} placeholder="paypal@email.com" required />
                        <p className="text-[11px] text-white/25 mt-2">Commissions are paid directly to this account.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-white/50 mb-2">Password *</label>
                          <Input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-white/50 mb-2">Confirm Password *</label>
                          <Input type="password" value={formData.confirmPassword} onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat password" required />
                        </div>
                      </div>
                      {errorMsg && (
                        <div className="text-sm rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#FCA5A5" }}>{errorMsg}</div>
                      )}
                      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Apply Now — Free"}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-gradient-to-br from-[#f0f4f8] via-[#f8fafc] to-[#e8f4f8] relative overflow-hidden">
        <div className="absolute top-20 right-10 w-64 h-64 bg-[#0891B2]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container max-w-2xl relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm border border-white/80 rounded-full mb-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-bold text-[#0B1B3A] uppercase tracking-widest">FAQ</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0B1B3A]">Questions answered</h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[20px] overflow-hidden cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.04)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(0,0,0,0.06),0_16px_32px_rgba(0,0,0,0.06)] transition-shadow duration-300"
                style={{ borderLeft: openFaq === i ? "3px solid #0891B2" : "3px solid transparent" }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="flex items-center justify-between px-7 py-5">
                  <h3 className="font-semibold text-[#0B1B3A]">{faq.q}</h3>
                  <motion.div animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.2 }} className="text-accent text-xl flex-shrink-0 ml-4 font-light">+</motion.div>
                </div>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? "auto" : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <p className="px-7 pb-6 text-[var(--text-muted)] leading-relaxed">{faq.a}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA BAND
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 text-center bg-[#0B1B3A] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(8,145,178,0.15) 0%, transparent 60%)",
        }} />
        <FloatingDots />
        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
              Ready to earn <span className="text-[#22D3EE]">$480–$1,920</span> per referral?
            </h2>
            <p className="text-white/45 mb-12 max-w-md mx-auto">Apply in under 2 minutes. Start sharing as soon as we activate your account.</p>
            <Button variant="gradient" size="lg" onClick={scrollToForm}>Apply to Partner</Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
