"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type AuthMethod = "password" | "magic-link";

interface AuthTabsProps {
  selected: AuthMethod;
  onSelect: (method: AuthMethod) => void;
}

export function AuthTabs({ selected, onSelect }: AuthTabsProps) {
  return (
    <div className="flex bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl p-1.5 mb-6 shadow-inner">
      <button
        type="button"
        onClick={() => onSelect("password")}
        className={cn(
          "relative flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200",
          selected === "password"
            ? "text-white"
            : "text-slate-600 hover:text-slate-800"
        )}
      >
        {selected === "password" && (
          <motion.div
            layoutId="auth-tab-bg"
            className="absolute inset-0 bg-gradient-to-r from-[#0B1B3A] to-[#0891B2] rounded-lg shadow-lg"
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
        )}
        <span className="relative z-10">Password</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect("magic-link")}
        className={cn(
          "relative flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200",
          selected === "magic-link"
            ? "text-white"
            : "text-slate-600 hover:text-slate-800"
        )}
      >
        {selected === "magic-link" && (
          <motion.div
            layoutId="auth-tab-bg"
            className="absolute inset-0 bg-gradient-to-r from-[#0B1B3A] to-[#0891B2] rounded-lg shadow-lg"
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
        )}
        <span className="relative z-10">Magic Link</span>
      </button>
    </div>
  );
}
