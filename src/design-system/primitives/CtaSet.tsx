import Link from "next/link";
import { cta } from "@/lib/brand";

/**
 * CtaSet — the ONE label pair (SYSTEM.md Law 10 / brand.cta), Observatory dress.
 * Primary = emission-bordered (never a cyan fill — Law 1); secondary = hairline.
 * Six microstates live in tokens.css (.os-btn-em / .os-btn-hair).
 * NOTE: bands that need analytics use the strata CtaRow (client) re-skinned with
 * these classes; this primitive is the presentational contract for new surfaces.
 */
export function CtaSet({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      <Link href={cta.primary.href} className="os-btn os-btn-em">
        {cta.primary.label}
      </Link>
      <Link href={cta.secondary.href} className="os-btn os-btn-hair">
        {cta.secondary.label}
      </Link>
    </div>
  );
}
