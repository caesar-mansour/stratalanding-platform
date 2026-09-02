'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { SpotlightCard, Pressable } from '@/app/admin/_components/motion';

// Only allow same-origin paths starting with a single "/" — never "//host"
// (protocol-relative) and never "http(s)://" (full external URLs). Defaults
// to /admin if the param is missing or unsafe.
function sanitizeNext(raw: string | null): string {
  if (!raw) return '/admin';
  if (!raw.startsWith('/')) return '/admin';
  if (raw.startsWith('//')) return '/admin';
  return raw;
}

function AdminLoginInner() {
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams?.get('next') ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, code: code || undefined }),
      });

      if (response.ok) {
        router.push(next);
        router.refresh();
      } else {
        // If 2FA is enabled (audit F28), the server asks for the authenticator code.
        const data = await response.json().catch(() => ({}));
        if (data?.needsCode) {
          setNeedsCode(true);
          setError(code ? 'Invalid 2FA code. Try again.' : 'Enter the 6-digit code from your authenticator app.');
        } else {
          setError('Invalid access token');
        }
        setShakeKey((k) => k + 1);
      }
    } catch {
      setError('Authentication failed');
      setShakeKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 -mt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo + branding */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8F0F8] to-[#9ABCD8] flex items-center justify-center shadow-lg shadow-[#3A6A8A]/15 mb-4 border border-[#9ABCD8]/30">
            <Image
              src="/brand/stratalanding.png"
              alt="StrataLanding"
              width={40}
              height={42}
              unoptimized
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-[#1A3A5A]">Admin Access</h1>
          <p className="text-sm text-[#1A3A5A]/50 mt-1">Enter your token to continue</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.div
            key={shakeKey}
            animate={shakeKey > 0 ? { x: [-8, 8, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
          >
          <SpotlightCard
            padded={false}
            radius={220}
            className="bg-white/70 backdrop-blur-md rounded-2xl border border-[#9ABCD8]/30 shadow-xl shadow-[#3A6A8A]/8 p-7"
          >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="token"
                className="block text-xs font-semibold text-[#1A3A5A]/60 uppercase tracking-wider mb-2"
              >
                Access Token
              </label>
              <input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#9ABCD8]/30 bg-white/80 text-[#1A3A5A] placeholder-[#9ABCD8]/60 focus:border-accent focus:ring-2 focus:ring-accent/25 outline-none transition-all text-sm"
                placeholder="Enter admin token"
                autoFocus
                required
              />
            </div>

            {needsCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label
                  htmlFor="code"
                  className="block text-xs font-semibold text-[#1A3A5A]/60 uppercase tracking-wider mb-2"
                >
                  2FA Code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl border border-[#9ABCD8]/30 bg-white/80 text-[#1A3A5A] placeholder-[#9ABCD8]/60 focus:border-accent focus:ring-2 focus:ring-accent/25 outline-none transition-all text-sm tracking-[0.3em] text-center"
                  placeholder="000000"
                  autoFocus
                />
              </motion.div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Pressable
              as="button"
              type="submit"
              disabled={isLoading || !token || (needsCode && code.length !== 6)}
              className="w-full flex items-center justify-center bg-gradient-to-r from-[#0B1B3A] to-[#1A3A5A] text-white py-3 px-6 rounded-xl font-medium text-sm hover:from-[#1A3A5A] hover:to-[#2A4A6A] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#0B1B3A]/15"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </Pressable>
          </form>
          </SpotlightCard>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-[#1A3A5A]/30 mt-6"
        >
          StrataLanding Admin Panel
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
