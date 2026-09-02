"use client";

/**
 * Skip Link Component - WCAG 2.1 Level A compliance
 * Allows keyboard users to skip navigation and go directly to main content
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-accent focus:text-primary focus:rounded-lg focus:font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
    >
      Skip to main content
    </a>
  );
}
