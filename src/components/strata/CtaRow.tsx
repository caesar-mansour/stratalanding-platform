"use client";

/**
 * THE STRATA CUT — CTA row. One primary label site-wide (brand.cta law),
 * one secondary. Fires trackCtaClick with the band's location id.
 * All six microstates live in tokens.css (.st-btn*).
 */

import Link from "next/link";
import { cta } from "@/lib/brand";
import { trackCtaClick } from "@/lib/analytics";
import { Magnetic } from "@/components/motion/liquid";

export function CtaRow({
  location,
  align = "start",
}: {
  location: string;
  align?: "start" | "center";
}) {
  return (
    <div
      className={`flex flex-wrap gap-3 ${align === "center" ? "justify-center" : ""}`}
    >
      {/* Magnetic self-gates (useInteractive): coarse pointers/reduced get a plain div */}
      <Magnetic strength={0.25}>
        <Link
          href={cta.primary.href}
          className="st-btn st-btn-seam"
          onClick={() => trackCtaClick(location, "primary", cta.primary.href)}
        >
          {cta.primary.label}
        </Link>
      </Magnetic>
      <Magnetic strength={0.2}>
        <Link
          href={cta.secondary.href}
          className="st-btn st-btn-hairline"
          onClick={() => trackCtaClick(location, "secondary", cta.secondary.href)}
        >
          {cta.secondary.label}
        </Link>
      </Magnetic>
    </div>
  );
}
