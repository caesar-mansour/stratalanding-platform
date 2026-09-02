"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface DemoData {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  industry: string;
  goal: string;
  href: string;
  desktopImg: string;
  mobileImg?: string;
}

export interface SourceRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const WINDOW_TRANSITION = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

export function DemoPreviewExpandModal({
  demo,
  onClose,
  reducedMotion,
}: {
  demo: DemoData | null;
  sourceRect: SourceRect | null;
  onClose: () => void;
  reducedMotion: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (!demo) setIframeLoaded(false);
  }, [demo]);

  useEffect(() => {
    if (demo) {
      triggerRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => closeRef.current?.focus(), 100);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
  }, [demo]);

  // Failsafe: always restore scroll on unmount (covers navigation edge cases)
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!demo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [demo, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {demo && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9998] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={WINDOW_TRANSITION}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Window panel — true fullscreen */}
          <motion.div
            className="fixed inset-3 sm:inset-6 z-[9999] bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: 8 }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.97, y: 4 }
            }
            transition={
              reducedMotion ? { duration: 0.08 } : WINDOW_TRANSITION
            }
          >
            {/* Top bar */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FCA5A5]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FDE68A]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#86EFAC]" />
              <div className="ml-2 flex-1 h-6 bg-white rounded-md border border-[#E2E8F0] flex items-center px-3">
                <svg className="w-3.5 h-3.5 text-[#64748B] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs text-[#64748B] truncate">stratalanding.com{demo.href}</span>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                className="ml-2 w-7 h-7 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F1F5F9] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] flex-shrink-0"
                aria-label="Close preview"
              >
                <svg className="w-3.5 h-3.5 text-[#475569]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Live iframe — interactive, scrollable */}
            <div className="flex-1 relative bg-white overflow-hidden">
              {!iframeLoaded && (
                <div className="absolute inset-0 bg-[#F1F5F9] animate-pulse z-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]" />
                </div>
              )}
              <iframe
                src={demo.href}
                title={`${demo.title} — live preview`}
                className={`w-full h-full border-0 transition-opacity duration-300 ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={(e) => {
                  try {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument?.body) setIframeLoaded(true);
                  } catch {
                    // Blocked — shimmer stays
                  }
                }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
