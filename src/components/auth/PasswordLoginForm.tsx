"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signInWithPassword, getAAL, getMFAFactors } from "@/lib/auth";
import { Button, Input, PasswordInput } from "@/components/ui";

interface PasswordLoginFormProps {
  redirectTo?: string;
}

export function PasswordLoginForm({ redirectTo = "/portal" }: PasswordLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await signInWithPassword(email, password);

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Please verify your email before signing in.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      if (data.user) {
        // Check if user has MFA enabled
        const { factors } = await getMFAFactors();

        if (factors.length > 0) {
          // User has MFA, check current assurance level
          const { currentLevel } = await getAAL();

          if (currentLevel === "aal1") {
            // Need to complete 2FA
            router.push(`/auth/verify-2fa?redirectTo=${encodeURIComponent(redirectTo)}`);
            return;
          }
        }

        // Smart redirect: client portal first (revenue), partner portal if affiliate-only
        let dest = redirectTo;
        if (data.isClient) {
          dest = '/portal';
        } else if (data.isAffiliate) {
          dest = '/partner-portal';
        }
        router.push(dest);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
        autoComplete="email"
      />

      <PasswordInput
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        autoComplete="current-password"
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
        disabled={isLoading || !email || !password}
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>

      <div className="text-center">
        <a
          href="/auth/forgot-password"
          className="text-sm text-accent hover:text-[#0B1B3A] font-medium transition-colors hover:underline"
        >
          Forgot your password?
        </a>
      </div>
    </form>
  );
}
