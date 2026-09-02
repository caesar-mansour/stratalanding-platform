"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { spring } from "@/lib/motion";
import { Button, Input } from "@/components/ui";
import { brand } from "@/lib/brand";
import Image from "next/image";

export default function ContactPage() {
  const prefersReducedMotion = useReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        setStatus("sent");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-16 md:py-24">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8F0F8] via-[#D0E0EE] to-[#9ABCD8]" />

      {/* Background Shapes */}
      <motion.div
        className="absolute top-20 right-20 w-80 h-80 bg-white/30 rounded-full blur-3xl"
        animate={prefersReducedMotion ? {} : {
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-20 w-96 h-96 bg-[#3A6A8A]/10 rounded-full blur-3xl"
        animate={prefersReducedMotion ? {} : {
          scale: [1.15, 1, 1.15],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-5xl mx-auto w-full relative z-10">
        <div className="grid md:grid-cols-5 gap-8 items-start">

          {/* Left Side — Info */}
          <motion.div
            className="md:col-span-2 md:pt-8"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring.soft}
          >
            {/* Logo */}
            <div className="mb-6">
              <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center">
                <Image src="/brand/stratalanding.png" alt="StrataLanding" width={32} height={32} />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-[#0B1B3A] mb-4">
              Need Help?
            </h1>
            <p className="text-[#3A5A6A] text-base leading-relaxed mb-8">
              Drop us a message and we&apos;ll get back to you within 24 hours.
            </p>

            {/* Contact Info Cards */}
            <div className="space-y-4">
              <motion.a
                href={`mailto:${brand.email}`}
                className="flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80 hover:bg-white/80 transition-all group"
                whileHover={prefersReducedMotion ? {} : { x: 4 }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#3A6A8A] uppercase tracking-wide">Email</p>
                  <p className="text-sm font-semibold text-[#0B1B3A] group-hover:text-accent transition-colors">{brand.email}</p>
                </div>
              </motion.a>

              <motion.div
                className="flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.2 }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#3A6A8A] uppercase tracking-wide">Response Time</p>
                  <p className="text-sm font-semibold text-[#0B1B3A]">Within 24 hours</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/80"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: 0.3 }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#3A6A8A] uppercase tracking-wide">100% Async</p>
                  <p className="text-sm font-semibold text-[#0B1B3A]">No calls needed</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side — Form */}
          <motion.div
            className="md:col-span-3"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.1 }}
          >
            {status === "sent" ? (
              <motion.div
                className="text-center py-16 bg-white rounded-2xl shadow-xl shadow-[#3A6A8A]/10 border border-white/80"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring.soft}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200/50">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[#0B1B3A] mb-2">Message Sent</h2>
                <p className="text-[#334155] text-sm mb-8">We&apos;ll get back to you within 24 hours.</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="text-sm text-accent hover:underline font-semibold"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-xl shadow-[#3A6A8A]/10 border border-white/80 p-6 md:p-8 space-y-5"
              >
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />

                <div className="w-full">
                  <label className="block text-sm font-semibold text-[#0B1B3A] mb-2">
                    Message <span className="text-accent ml-1">*</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What can we help you with?"
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-[#0F172A] placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] shadow-sm focus:shadow-md focus:shadow-[#0891B2]/10 hover:border-slate-300 resize-none"
                  />
                </div>

                {status === "error" && (
                  <motion.div
                    className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>Something went wrong. Please try again.</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={status === "sending" || !name || !email || !message}
                >
                  {status === "sending" ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
