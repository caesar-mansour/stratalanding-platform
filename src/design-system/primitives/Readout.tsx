import type { ReactNode } from "react";

/**
 * Readout — the big-number instrument (the 292MS pattern).
 * value renders in display face at instrument scale; emission variant glows.
 */
export function Readout({
  label,
  value,
  unit,
  note,
  emission = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: ReactNode;
  emission?: boolean;
}) {
  return (
    <div>
      <p className="os-mono-sm" style={{ color: "var(--os-starlight-mute)" }}>
        {label}
      </p>
      <p
        style={{
          marginTop: 14,
          fontFamily: "var(--os-font-display)",
          fontSize: "clamp(3.4rem, 5.8vw, 5.25rem)",
          lineHeight: 1,
          color: emission ? "var(--os-emission)" : "var(--os-starlight)",
          textShadow: emission ? "0 0 46px rgba(34, 211, 238, 0.45)" : undefined,
        }}
      >
        {value}
        {unit ? <small style={{ fontSize: "0.42em" }}>{unit}</small> : null}
      </p>
      {note ? (
        <p
          className="os-mono-sm"
          style={{ marginTop: 12, lineHeight: 1.8, color: "var(--os-starlight-mute)" }}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
