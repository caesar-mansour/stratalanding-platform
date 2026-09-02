"use client";

/**
 * SP4 — THE REGISTRATION's one beat (motion score: SNAP, 120ms platen).
 * The rewrite headline starts with its C plate nudged off; when the sheet
 * crosses the trigger line it SLAMS into register — once per session.
 *
 * SSR/no-JS/reduced-motion/Tier-A render the REGISTERED still (the thesis
 * still argues: weak = misregistered forever, rewrite = in register).
 * This island only ever ADDS the offset on capable clients, then removes
 * it — the default state is always the finished poster.
 */

import { useEffect } from "react";
import { useStrataTier } from "../tier";

const LATCH = "pr_registered";

export function RegistrationSnap() {
  const tier = useStrataTier();

  useEffect(() => {
    if (tier !== "B") return;
    let killed = false;

    const target = document.querySelector<HTMLElement>("[data-registration-snap]");
    if (!target) return;

    try {
      if (sessionStorage.getItem(LATCH)) return; // seen this session — stay registered
    } catch {
      /* private mode: play it */
    }

    // already near view (deep link) → leave the registered still alone
    if (target.getBoundingClientRect().top < window.innerHeight * 1.2) return;

    // arm the misregister (client-only; SSR never carries the offset)
    target.style.setProperty("--misreg-x", "6px");
    target.style.setProperty("--misreg-y", "5px");
    target.removeAttribute("data-registered");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || killed) continue;
          target.setAttribute("data-registered", "");
          try {
            sessionStorage.setItem(LATCH, "1");
          } catch {
            /* ignore */
          }
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -38% 0px", threshold: 0.1 }
    );
    io.observe(target);

    return () => {
      killed = true;
      io.disconnect();
    };
  }, [tier]);

  return null;
}
