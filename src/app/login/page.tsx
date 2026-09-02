'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthTabs, PasswordLoginForm, MagicLinkForm, type AuthMethod } from '@/components/auth';
import { safeClientPath } from '@/lib/safe-redirect';
import Image from 'next/image';

function LoginContent() {
  const searchParams = useSearchParams();
  // SECURITY (audit F77): never push an attacker-controlled redirectTo — validate to an allowlisted
  // same-origin path so `?redirectTo=//evil.com` can't phish users after login.
  const redirectTo = safeClientPath(searchParams.get('redirectTo'));
  const error = searchParams.get('error');
  const verified = searchParams.get('verified');

  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
      {/* Blue-Teal Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A]" />

      {/* Subtle Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Animated Background Shapes */}
      <motion.div
        className="hidden md:block absolute top-20 left-10 w-80 h-80 bg-white/40 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="hidden md:block absolute bottom-20 right-10 w-96 h-96 bg-[#0891B2]/30 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Additional Decorative Elements */}
      <motion.div
        className="hidden md:block absolute top-1/3 right-1/4 w-48 h-48 bg-[#3A6A8A]/25 rounded-full blur-2xl"
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="hidden md:block absolute bottom-1/3 left-1/4 w-56 h-56 bg-white/35 rounded-full blur-2xl"
        animate={{
          y: [0, 20, 0],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white backdrop-blur-sm rounded-2xl p-4 border border-slate-200 shadow-lg shadow-cyan-200/50">
            <Image
              src="/brand/stratalanding.png"
              alt="StrataLanding"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </div>
        </motion.div>

        {/* Card */}
        <div className="bg-white backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#0B1B3A] mb-2">
              Welcome Back
            </h1>
            <p className="text-[#334155] text-sm">
              Sign in to access your project dashboard
            </p>
          </div>

          {verified && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium"
            >
              ✓ Email verified successfully! You can now sign in.
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium"
            >
              {error === 'invalid_token' ? 'Invalid or already-used verification link.' :
               error === 'token_expired' ? 'Verification link has expired. Please request a new one.' :
               error === 'link_expired' ? 'Magic link has expired. Please request a new one.' :
               error === 'invalid_link' ? 'Invalid magic link. Please request a new one.' :
               error === 'auth_error' ? 'Something went wrong during verification. Please try again.' :
               'Authentication failed. Please try again.'}
            </motion.div>
          )}

          <AuthTabs selected={authMethod} onSelect={setAuthMethod} />

          <div className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {authMethod === 'password' ? (
                <motion.div
                  key="password"
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 40, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <PasswordLoginForm redirectTo={redirectTo} />
                </motion.div>
              ) : (
                <motion.div
                  key="magic-link"
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <MagicLinkForm redirectTo={redirectTo} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-600 mt-6 backdrop-blur-sm bg-white/80 rounded-full py-3 px-6 inline-block w-full border border-slate-200">
          Need help?{' '}
          <a
            href="/contact"
            className="text-accent hover:text-[#0B1B3A] font-medium transition-colors hover:underline"
          >
            Contact support
          </a>
        </p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
