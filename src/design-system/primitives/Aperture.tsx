import type { ReactNode } from "react";

/**
 * Aperture — the optic (the signature artifact). A perfect circle with
 * crosshair furniture; content inside renders SHARP (the resolve's endpoint).
 * The blur/smear OUTSIDE the optic is the owning band's business (THE RESOLVE
 * move) — the primitive stays still so the poster stands (Law 8).
 */
export function Aperture({
  size = 340,
  label,
  children,
}: {
  size?: number;
  label?: string;
  children: ReactNode;
}) {
  return (
    <figure style={{ width: size }} className="relative m-0">
      <div
        className="relative overflow-hidden"
        style={{
          width: size,
          height: size,
          borderRadius: "var(--os-r-full)",
          border: "1px solid var(--os-hairline)",
          background: "var(--os-plate)",
          boxShadow:
            "0 0 0 1px var(--os-sky), 0 0 60px rgba(34, 211, 238, 0.14), inset 0 0 40px rgba(5, 11, 24, 0.8)",
        }}
      >
        <span
          aria-hidden
          className="absolute bottom-0 left-1/2 top-0"
          style={{ width: 1, background: "var(--os-emission-18)" }}
        />
        <span
          aria-hidden
          className="absolute left-0 right-0 top-1/2"
          style={{ height: 1, background: "var(--os-emission-18)" }}
        />
        <div className="absolute inset-0 grid place-items-center">{children}</div>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: "var(--os-r-full)",
            boxShadow: "inset 0 0 80px rgba(5, 11, 24, 0.85)",
          }}
        />
      </div>
      {label ? (
        <figcaption
          className="os-mono-sm mt-3 text-center"
          style={{ color: "var(--os-starlight-mute)" }}
        >
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
