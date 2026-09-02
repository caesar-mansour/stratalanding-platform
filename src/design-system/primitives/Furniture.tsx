import type { CSSProperties } from "react";

/** Rule — hairline chart furniture. */
export function Rule({ dim = false, style }: { dim?: boolean; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        width: "100%",
        background: dim ? "var(--os-hairline-dim)" : "var(--os-hairline)",
        ...style,
      }}
    />
  );
}

/** Marginalia — vertical coordinate labels on the field edges (RA/DEC, survey dates). */
export function Marginalia({
  text,
  side = "left",
}: {
  text: string;
  side?: "left" | "right";
}) {
  return (
    <p
      aria-hidden
      className="os-mono-sm pointer-events-none absolute top-1/2 hidden lg:block"
      style={{
        color: "var(--os-starlight-faint)",
        [side]: "16px",
        transform:
          side === "left"
            ? "rotate(-90deg) translateX(50%)"
            : "rotate(90deg) translateX(-50%)",
        transformOrigin: side,
      }}
    >
      {text}
    </p>
  );
}

/** Seam — THE MERIDIAN: the emission divider between worlds. */
export function Seam() {
  return <div aria-hidden className="os-meridian" />;
}
