"use client";

/**
 * FRONT 1 — THE LIVING PRESS, the job slot (skeleton). PRESS BOOK §J.
 * The visitor sets their business name in type; the press job persists to
 * sessionStorage and downstream set pieces print it (SP4 headline, SP10
 * masthead, SP9 order slip — wired at P3/P4). Client-only, nothing is ever
 * sent anywhere (§J5); text nodes only, XSS-safe by construction. Empty =
 * the machine idles on defaults, every surface reverts.
 */

import { useEffect, useState } from "react";

const KEY = "press_job";

export function readPressJob(): { name: string } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.name === "string" && p.name.trim() ? { name: p.name } : null;
  } catch {
    return null;
  }
}

export function PressJobSlot() {
  const [name, setName] = useState("");
  const [set, setSet] = useState(false);

  useEffect(() => {
    const job = readPressJob();
    if (job) {
      setName(job.name);
      setSet(true);
    }
  }, []);

  const commit = () => {
    const clean = name.trim().slice(0, 40);
    if (!clean) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ name: clean }));
      window.dispatchEvent(new CustomEvent("press:set", { detail: { name: clean } }));
    } catch {
      /* private mode — the press idles */
    }
    setSet(true);
  };

  return (
    <div
      className="flex flex-1 flex-wrap items-center gap-4 border px-5 py-4 lg:ml-auto lg:max-w-[640px]"
      style={{
        borderColor: "rgba(246,243,236,.25)",
        background: "rgba(246,243,236,.08)",
      }}
    >
      <label
        htmlFor="press-job-name"
        className="st-mono-sm shrink-0"
        style={{ color: "rgba(246,243,236,.6)" }}
      >
        YOUR BUSINESS
      </label>
      <input
        id="press-job-name"
        type="text"
        maxLength={40}
        value={name}
        placeholder="Set it in type"
        onChange={(e) => {
          setName(e.target.value);
          setSet(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="st-mono min-w-0 flex-1 bg-transparent px-1 py-1.5 outline-none"
        style={{
          borderBottom: "2px solid #22D3EE",
          color: "#F6F3EC",
          letterSpacing: "0.08em",
        }}
      />
      <button
        type="button"
        onClick={commit}
        aria-pressed={set}
        className="st-mono-sm shrink-0 border-2 px-4 py-2.5 transition-colors duration-150"
        style={{
          borderColor: "#22D3EE",
          color: set ? "#F6F3EC" : "#22D3EE",
          background: set ? "rgba(34,211,238,.14)" : "transparent",
          boxShadow: "0 0 22px rgba(34,211,238,.25)",
          letterSpacing: "0.16em",
        }}
      >
        {set ? "SET ●" : "SET IT IN TYPE →"}
      </button>
    </div>
  );
}
