"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { planLabels } from "@/lib/brand";

/* ─── Global iframe loading queue — max 2 at a time ─── */
let activeLoads = 0;
const MAX_CONCURRENT = 2;
const queue: (() => void)[] = [];

function requestIframeLoad(cb: () => void) {
  if (activeLoads < MAX_CONCURRENT) {
    activeLoads++;
    cb();
  } else {
    queue.push(cb);
  }
}

function onIframeLoaded() {
  activeLoads--;
  if (queue.length > 0 && activeLoads < MAX_CONCURRENT) {
    activeLoads++;
    queue.shift()!();
  }
}

/* ─── Deterministic color from string ─── */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* 12 premium gradient pairs — muted, sophisticated tones */
const GRADIENTS = [
  { from: "#0B1B3A", to: "#1E3A5F", light: "#3A6A8A" },
  { from: "#1A2744", to: "#2D4A6E", light: "#5A8AAA" },
  { from: "#0F2440", to: "#1B3D5C", light: "#4A7A9A" },
  { from: "#162032", to: "#253B54", light: "#4E7590" },
  { from: "#0D1F3C", to: "#1C3654", light: "#3E6580" },
  { from: "#142638", to: "#2A4560", light: "#5B8BA5" },
  { from: "#111D2E", to: "#1F3650", light: "#456D88" },
  { from: "#0E2235", to: "#1D3B58", light: "#4B7898" },
  { from: "#182D45", to: "#2B4C6A", light: "#6090AD" },
  { from: "#0C1A30", to: "#1A3250", light: "#3D6585" },
  { from: "#132840", to: "#264560", light: "#527A95" },
  { from: "#10253D", to: "#233F5C", light: "#4D7590" },
];

/* ─── Preview card — gradient poster, no fake browser ─── */
function PreviewCard({
  href,
  title,
  plan,
  hovered,
}: {
  href: string;
  title: string;
  plan: string;
  hovered: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [loaded, setLoaded] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const h = hashCode(href);
  const grad = GRADIENTS[h % GRADIENTS.length];
  const shortTitle = title.replace(/ Landing Page$/i, "").replace(/ Demo$/i, "");

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / 1280);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!hovered || canRender || isMobile) return;
    requestIframeLoad(() => setCanRender(true));
  }, [hovered, canRender, isMobile]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onIframeLoaded();
  }, []);

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-[#E2E8F0]">
      <div
        ref={containerRef}
        className="aspect-[16/9] relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 50%, ${grad.light} 100%)`,
        }}
      >
        {/* Decorative elements */}
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-15"
          style={{ background: grad.light }}
        />
        <div
          className="absolute bottom-4 left-4 w-20 h-20 rounded-full opacity-10"
          style={{ background: grad.light }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-8"
          style={{ background: `radial-gradient(circle, ${grad.light} 0%, transparent 70%)` }}
        />

        {/* Title overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div
            className="text-white/90 font-bold text-lg leading-tight drop-shadow-sm"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
          >
            {shortTitle}
          </div>
          <div className="text-white/80 text-xs mt-1 font-medium">
            stratalanding.com{href}
          </div>
        </div>

        {/* Hover overlay — hidden on mobile, shown on desktop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] hidden md:flex flex-col items-center justify-center gap-2 transition-all duration-300",
            hovered && !loaded ? "opacity-100" : "opacity-0 pointer-events-none",
            loaded && "!opacity-0 !pointer-events-none"
          )}
        >
          {canRender && !loaded && (
            <>
              <div className="w-8 h-8 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/80 text-xs font-medium">Loading preview...</span>
            </>
          )}
          {!canRender && (
            <>
              <svg className="w-8 h-8 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white/90 text-xs font-semibold">Hover to preview</span>
            </>
          )}
        </div>

        {/* Mobile tap overlay — subtle "Tap to view" indicator */}
        <div className="absolute inset-0 flex md:hidden items-end justify-center pb-14">
          <span className="px-3 py-1.5 text-[11px] font-medium text-white/80 bg-black/30 rounded-full backdrop-blur-sm">
            Tap to view
          </span>
        </div>

        {/* Live iframe — fades in on top of everything */}
        {canRender && (
          <iframe
            src={href}
            title={`${title} — desktop preview`}
            loading="lazy"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1280,
              height: 720,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
              border: "none",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.5s ease",
            }}
            onLoad={handleLoad}
            tabIndex={-1}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Exported card preview block ─── */
export function DemoCardPreview({
  href,
  title,
  plan,
  goalLabel,
}: {
  href: string;
  title: string;
  plan: string;
  goalLabel: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative p-4 pb-4 bg-gradient-to-b from-[#F1F5F9]/60 to-transparent"
      onMouseEnter={() => setHovered(true)}
    >
      {/* Preview card — lifts on hover */}
      <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
        <PreviewCard href={href} title={title} plan={plan} hovered={hovered} />
      </div>

      {/* Goal badge — top left */}
      <div className="absolute top-6 left-6 z-20">
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/80 text-[#0F172A] backdrop-blur-sm shadow-sm">
          {goalLabel}
        </span>
      </div>

      {/* Plan badge — top right */}
      <div className="absolute top-6 right-6 z-20">
        <span
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-full backdrop-blur-sm shadow-sm",
            plan === "presence-page" && "bg-emerald-100 text-emerald-700",
            plan === "lead-page" && "bg-blue-100 text-blue-700",
            plan === "purchase-page" && "bg-purple-100 text-purple-700"
          )}
        >
          {planLabels[plan]}
        </span>
      </div>
    </div>
  );
}
