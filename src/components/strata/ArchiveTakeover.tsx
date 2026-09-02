"use client";

/**
 * THE STRATA CUT — the Archive takeover: pull a slab from the drawer and
 * the specimen goes LIVE. Mechanics ported verbatim from night/Takeover
 * (dependency-free measured-rect FLIP, portal, lenis stop/start, iframe
 * mounts on open, destroyed on close). Restyled: bedrock backdrop,
 * phosphor signal chrome (LIVE law). Tier B only — callers render plain
 * links elsewhere. z-ladder: takeover 90 (nav 50, rail 40, depth 55).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function measure(el: Element | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export interface ArchiveTakeoverProps {
  slug: string;
  screenshot: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
  onOpen?: () => void;
}

export function ArchiveTakeover({
  slug,
  screenshot,
  alt,
  children,
  className,
  onOpen,
}: ArchiveTakeoverProps) {
  const originRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<
    "closed" | "opening" | "open" | "closing"
  >("closed");
  const [rect, setRect] = useState<Rect | null>(null);

  const lockScroll = (lock: boolean) => {
    document.documentElement.style.overflow = lock ? "hidden" : "";
    // pause hook for LivingWater (the sim parks while the takeover is open)
    if (lock) document.body.setAttribute("data-takeover", "");
    else document.body.removeAttribute("data-takeover");
    const lenis = (
      window as unknown as {
        __lenis?: { stop: () => void; start: () => void };
      }
    ).__lenis;
    if (lenis) (lock ? lenis.stop : lenis.start).call(lenis);
  };

  const open = useCallback(() => {
    const r = measure(originRef.current);
    if (!r) return;
    setRect(r);
    setState("opening");
    lockScroll(true);
    window.dispatchEvent(new CustomEvent("sl-takeover-open"));
    onOpen?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setState("open"));
    });
  }, [onOpen]);

  const close = useCallback(() => {
    const r = measure(originRef.current);
    setRect(
      r && r.top > -r.height && r.top < window.innerHeight
        ? r
        : {
            top: window.innerHeight * 0.4,
            left: window.innerWidth * 0.3,
            width: window.innerWidth * 0.4,
            height: window.innerHeight * 0.2,
          }
    );
    setState("closing");
    window.setTimeout(() => {
      setState("closed");
      lockScroll(false);
      window.dispatchEvent(new CustomEvent("sl-takeover-close"));
    }, 580);
  }, []);

  useEffect(() => {
    if (state === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  useEffect(
    () => () => {
      document.documentElement.style.overflow = "";
      window.dispatchEvent(new CustomEvent("sl-takeover-close"));
    },
    []
  );

  const expanded = state === "open";
  const showPortal = state !== "closed";

  const frameStyle: React.CSSProperties = expanded
    ? { top: "3vh", left: "3vw", width: "94vw", height: "94vh" }
    : rect
      ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      : {};

  return (
    <>
      <button
        ref={originRef}
        type="button"
        onClick={open}
        className={className}
        aria-label={`Open the live ${slug} page`}
        style={{ visibility: showPortal ? "hidden" : undefined }}
      >
        {children}
      </button>

      {showPortal &&
        createPortal(
          <div
            className="fixed inset-0 z-[90]"
            role="dialog"
            aria-modal="true"
            aria-label={alt}
          >
            {/* the archive goes dark */}
            <div
              onClick={close}
              className={`absolute inset-0 bg-[#05070D]/[0.96] transition-opacity duration-500 ${
                expanded ? "opacity-100" : "opacity-0"
              }`}
              style={{ contain: "strict" }}
            />
            {/* the travelling slab */}
            <div
              className="fixed overflow-hidden border border-[rgba(234,242,247,0.16)] bg-[#05070D] transition-all duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={frameStyle}
            >
              <Image
                src={screenshot}
                alt=""
                fill
                className={`object-cover object-top transition-opacity duration-700 ${
                  expanded ? "opacity-0" : "opacity-100"
                }`}
                sizes="94vw"
                quality={70}
              />
              {(state === "opening" || state === "open") && (
                <iframe
                  src={`/demos/${slug}`}
                  title={alt}
                  className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-700 ${
                    expanded ? "opacity-100" : "opacity-0"
                  }`}
                  loading="eager"
                />
              )}
              {/* the live signal bar — phosphor, because it's ALIVE */}
              {expanded && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-3 bg-[#05070D]/85 py-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#22D3EE]"
                    aria-hidden
                  />
                  <span
                    className="text-[10px] tracking-[0.2em] text-[#EAF2F7]"
                    style={{ fontFamily: "var(--font-strata-mono)" }}
                  >
                    LIVE PAGE — CLICK THROUGH IT · ESC RETURNS TO THE ARCHIVE
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Return to the archive"
                className="absolute right-3 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full text-[rgba(234,242,247,0.7)] transition-colors duration-150 hover:text-[#EAF2F7]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
