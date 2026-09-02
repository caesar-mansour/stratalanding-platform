"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // In development, NEVER run a service worker. A cache-first SW serves stale
    // JS/CSS bundles, so code changes silently stop showing up. Actively remove
    // any SW a prior production visit registered, and wipe its caches.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[SW] Registration failed:", err);
    });
  }, []);

  return null;
}
