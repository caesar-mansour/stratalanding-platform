import type { ReactNode } from "react";

/**
 * BandShell — the Observatory band wrapper (SYSTEM.md primitive #1).
 * Field ground + graticule + the kicker row (mono eyebrow left, mute label
 * right, hairline under). Chart furniture is load-bearing (Law 5).
 */
export function BandShell({
  band,
  kicker,
  aside,
  deep = false,
  className = "",
  children,
}: {
  /** contract id — becomes data-strata-band for section_view tracking */
  band: string;
  /** mono eyebrow, e.g. "BAND 04 — SPEED · THE PHOTOMETER" */
  kicker: string;
  /** right-side mute label, e.g. "LIGHT MEASURED — NEVER PREDICTED" */
  aside?: string;
  /** deepest field ground (floor bands) */
  deep?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-strata-band={band}
      className={`os-graticule relative ${deep ? "os-field-deep" : "os-field"} ${className}`}
    >
      <div className="relative mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <div
          className="flex items-baseline justify-between pb-3"
          style={{ borderBottom: "1px solid var(--os-hairline)" }}
        >
          <p className="os-mono" style={{ color: "var(--os-starlight)" }}>
            {kicker}
          </p>
          {aside ? (
            <p
              className="os-mono-sm hidden sm:block"
              style={{ color: "var(--os-starlight-mute)" }}
            >
              {aside}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
