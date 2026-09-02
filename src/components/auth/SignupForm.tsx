"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signUpWithPassword } from "@/lib/auth";
import { Button, PasswordInput } from "@/components/ui";

interface SignupFormProps {
  email: string;
  name?: string;
  redirectTo?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SignupForm({ email, name, redirectTo = "/portal", onSuccess, onCancel }: SignupFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await signUpWithPassword(email, password, name);

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("An account with this email already exists. Please sign in instead.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setIsSuccess(true);
      onSuccess?.();
      // Only redirect if no email verification needed (e.g. existing magic-link user setting password)
      if (!data?.needsVerification) {
        router.push(redirectTo);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
          Check your email
        </h3>
        <p className="text-sm text-[#475569]">
          We sent a verification link to{" "}
          <span className="font-medium text-[#0F172A]">{email}</span>
        </p>
        <p className="text-xs text-[#64748B] mt-2">
          Click the link in your email to activate your account, then you can sign in.
        </p>
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            Don&apos;t see it? Check your <span className="font-semibold">spam or junk folder</span> and mark it as &quot;Not Spam.&quot;
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="bg-[#F1F5F9] rounded-lg p-3 mb-4">
        <p className="text-xs text-[#64748B]">Creating account for</p>
        <p className="font-medium text-[#0F172A]">{email}</p>
      </div>

      <PasswordInput
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Create a password"
        required
        autoComplete="new-password"
        hint="At least 8 characters"
      />

      {password && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  passwordStrength >= level
                    ? level <= 1
                      ? "bg-red-500"
                      : level <= 2
                      ? "bg-orange-500"
                      : level <= 3
                      ? "bg-yellow-500"
                      : "bg-green-500"
                    : "bg-[#E2E8F0]"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-[#64748B]">
            {passwordStrength <= 1 && "Weak password"}
            {passwordStrength === 2 && "Fair password"}
            {passwordStrength === 3 && "Good password"}
            {passwordStrength >= 4 && "Strong password"}
          </p>
        </div>
      )}

      <PasswordInput
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm your password"
        required
        autoComplete="new-password"
        error={confirmPassword && password !== confirmPassword ? "Passwords do not match" : undefined}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          disabled={isLoading || !password || !confirmPassword}
        >
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </div>
    </motion.form>
  );
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(strength, 4);
}
