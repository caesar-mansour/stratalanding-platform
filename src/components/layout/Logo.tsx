"use client";

import { brand } from "@/lib/brand";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface LogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  className?: string;
}

export function Logo({
  showText = false,
  size = "md",
  variant = "dark",
  className = "",
}: LogoProps) {
  const pathname = usePathname();

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const imageWidths = {
    sm: 30,
    md: 38,
    lg: 45,
  };

  const imageHeights = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const textColor = variant === "light" ? "text-white" : "text-primary";

  const handleClick = (e: React.MouseEvent) => {
    // If already on homepage, scroll to top smoothly
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={`inline-flex items-center gap-2.5 ${className}`}
      aria-label={`${brand.name} - Go to homepage`}
    >
      {/* No `priority`: LCP law — zero above-fold preloaded images. The mark
          is fixed chrome in-viewport; it loads immediately without joining
          the pre-LCP graph. Deep-state invert lives in globals (.st chrome). */}
      <Image
        src="/brand/stratalanding.png"
        alt={brand.name}
        width={imageWidths[size]}
        height={imageHeights[size]}
        quality={80}
      />
      {showText && (
        <span
          className={`font-bold ${textSizes[size]} ${textColor}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {brand.name}
        </span>
      )}
    </Link>
  );
}
