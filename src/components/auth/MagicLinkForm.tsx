"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signInWithMagicLink } from "@/lib/auth";
import { Button, Input } from "@/components/ui";

interface MagicLinkFormProps {
  redirectTo?: string;
}

export function MagicLinkForm({ redirectTo = "/portal" }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await signInWithMagicLink(email, redirectTo);

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-6"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200/50">
          <svg
            className="w-8 h-8 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#0B1B3A] mb-2">
          Check your email
        </h3>
        <p className="text-slate-600 text-sm">
          We&apos;ve sent a magic link to <strong className="text-accent">{email}</strong>
        </p>
        <p className="text-slate-500 mt-2 text-xs">
          Click the link in your email to sign in. The link expires in 1 hour.
        </p>
        <button
          type="button"
          onClick={() => setIsSubmitted(false)}
          className="mt-6 text-sm text-accent hover:text-[#0B1B3A] font-medium transition-colors hover:underline"
        >
          Use a different email
        </button>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        hint="We'll send you a secure link to sign in"
        autoComplete="email"
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-2"
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </motion.div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isLoading || !email}
      >
        {isLoading ? "Sending link..." : "Send magic link"}
      </Button>

      <p className="text-center text-xs text-slate-500">
        No password required. Check your email for a secure login link.
      </p>
    </form>
  );
}
