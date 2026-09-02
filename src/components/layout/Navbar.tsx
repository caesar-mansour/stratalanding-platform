"use client";

/**
 * THE STRATA CUT — the navigation bar.
 *
 * Chrome states (fixed elements are the ONLY things that recolor — bands
 * paint their own backgrounds, zero page-wide theme flips):
 *   clear    — top of the page: transparent over bone paper
 *   scrolled — bone glass + hairline
 *   deep     — below the water table (homepage): ink glass + deep hairline
 * Every other route: scrolled paper, always. Transitions are 200ms
 * color-only — no height change, no re-layout, zero CLS.
 *
 * Deep detection: IO on [data-strata-water] (the water-table band sentinel).
 * Until S3 mounts it, the homepage simply never goes deep.
 */

import { navigation } from "@/lib/brand";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { Logo } from "./Logo";
import { smoothScrollTo } from "@/components/motion/SmoothScroll";

type NavMode = "clear" | "scrolled" | "deep";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [belowWater, setBelowWater] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";

  // scrolled flag (state clear → scrolled)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // below-water flag: the water-table sentinel (homepage) or a route-level
  // force marker (dark routes like /pricing keep deep chrome throughout)
  useEffect(() => {
    if (document.querySelector("[data-nav-force-deep]")) {
      setBelowWater(true);
      return;
    }
    if (!isHome) {
      setBelowWater(false);
      return;
    }
    // The chrome belongs to whatever band is under it. A band declares its own
    // ground and the nav follows: it goes ink-dark only while a dark band is
    // behind it, and returns to paper over the light ones.
    //
    // Two selectors, because two homepage systems mark their dark bands
    // differently: the strata bands used [data-strata-act="ink"], and the
    // northline sections use [data-tone="dark"] — which is the same attribute
    // the scroll engine reads for its own tone tracking, so a section declares
    // its ground exactly once and both the engine and the nav honour it.
    const acts = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-strata-act="ink"], [data-tone="dark"]'
      )
    );
    if (!acts.length) {
      setBelowWater(false);
      return;
    }
    const inView = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target);
          else inView.delete(e.target);
        }
        setBelowWater(inView.size > 0);
      },
      { rootMargin: "-64px 0px -70% 0px", threshold: 0 }
    );
    acts.forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, [isHome, pathname]);

  const mode: NavMode = belowWater
    ? "deep"
    : scrolled || !isHome
    ? "scrolled"
    : "clear";
  const onDeep = mode === "deep";

  // mobile sheet: scroll lock + Esc + basic focus containment
  useEffect(() => {
    if (!menuOpen) return;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      setMenuOpen(false);
      const hashIndex = href.indexOf("#");
      if (hashIndex !== -1) {
        e.preventDefault();
        e.stopPropagation();
        const hash = href.slice(hashIndex + 1);
        requestAnimationFrame(() => {
          const el = document.getElementById(hash);
          if (el) smoothScrollTo(el, -88);
          window.history.replaceState(null, "", href);
        });
        return;
      }
      if (href === "/" && pathname === "/") {
        e.preventDefault();
        smoothScrollTo(0);
      }
    },
    [pathname]
  );

  const primary = navigation.main.find((i) => "isPrimary" in i && i.isPrimary);
  const links = navigation.main.filter((i) => !("isPrimary" in i && i.isPrimary));

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      data-nav-deep={onDeep || undefined}
    >
      <nav
        aria-label="Main"
        className="h-16 transition-colors duration-200"
        style={{
          /* PRESSRUN: scrolled = paper glass (ink chrome); deep = the ink
             room's navy glass. */
          backgroundColor:
            mode === "clear"
              ? "transparent"
              : mode === "deep"
              ? "rgba(10, 23, 48, 0.86)"
              : "rgba(246, 243, 236, 0.88)",
          backdropFilter: mode === "clear" ? undefined : "blur(12px)",
          WebkitBackdropFilter: mode === "clear" ? undefined : "blur(12px)",
          borderBottom:
            mode === "clear"
              ? "1px solid transparent"
              : mode === "deep"
              ? "1px solid rgba(246, 243, 236, 0.16)"
              : "1px solid rgba(11, 27, 58, 0.14)",
        }}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center px-6 lg:px-10">
          {/* logo — ink on paper; bone in the ink room */}
          <Logo size="md" variant={onDeep ? "light" : "dark"} />

          {/* desktop links */}
          <div className="ml-10 hidden items-center gap-7 md:flex">
            {links.map((item) => {
              const isHash = item.href.includes("#");
              const Tag = isHash ? "a" : Link;
              const active = pathname === item.href;
              return (
                <Tag
                  key={item.href}
                  href={item.href}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                    handleLinkClick(e, item.href)
                  }
                  className="st-nav-link"
                  data-active={active || undefined}
                >
                  {item.label}
                </Tag>
              );
            })}
          </div>

          {/* right cluster */}
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/login"
              onClick={(e) => handleLinkClick(e, "/login")}
              className="st-nav-link hidden md:block"
            >
              Portal
            </Link>
            {primary && (
              <Link
                href={primary.href}
                onClick={(e) => handleLinkClick(e, primary.href)}
                className="st-btn st-btn-seam hidden !h-9 px-4 !text-[14px] md:inline-flex"
              >
                {primary.label}
              </Link>
            )}

            {/* mobile: compact CTA + hamburger */}
            {primary && (
              <Link
                href={primary.href}
                onClick={(e) => handleLinkClick(e, primary.href)}
                className="st-btn st-btn-seam !h-9 px-3.5 !text-[13px] md:hidden"
              >
                {primary.label}
              </Link>
            )}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className="relative block h-4 w-[18px]">
                <span
                  className={cn(
                    "st-nav-bar absolute left-0 top-0 h-0.5 w-full transition-transform duration-200",
                    menuOpen && "translate-y-[7px] rotate-45 !bg-[#0B1B3A]"
                  )}
                />
                <span
                  className={cn(
                    "st-nav-bar absolute left-0 top-[7px] h-0.5 w-full transition-opacity duration-150",
                    menuOpen && "opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "st-nav-bar absolute left-0 top-[14px] h-0.5 w-full transition-transform duration-200",
                    menuOpen && "-translate-y-[7px] -rotate-45 !bg-[#0B1B3A]"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* mobile sheet — a proof sheet */}
      {menuOpen && (
        <div
          ref={sheetRef}
          className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-[#F6F3EC] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="mx-auto flex min-h-full max-w-6xl flex-col px-6 pb-8 pt-6">
            <div className="flex flex-col">
              {links.map((item) => {
                const isHash = item.href.includes("#");
                const Tag = isHash ? "a" : Link;
                return (
                  <Tag
                    key={item.href}
                    href={item.href}
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) =>
                      handleLinkClick(e, item.href)
                    }
                    className="border-b border-[rgba(11,27,58,0.14)] py-5 text-[22px] font-medium tracking-[-0.01em] text-[#0B1B3A]"
                  >
                    {item.label}
                  </Tag>
                );
              })}
              <Link
                href="/login"
                onClick={(e) => handleLinkClick(e, "/login")}
                className="border-b border-[rgba(11,27,58,0.14)] py-5 text-[22px] font-medium tracking-[-0.01em] text-[#0B1B3A]"
              >
                Portal
              </Link>
            </div>
            {primary && (
              <Link
                href={primary.href}
                onClick={(e) => handleLinkClick(e, primary.href)}
                className="st-btn st-btn-seam mt-auto w-full"
              >
                {primary.label}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
