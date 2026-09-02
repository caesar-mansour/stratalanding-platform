import type { ReactNode } from "react";

/** Plate — the instrument panel (photometer cells, catalog ledger frames). */
export function Plate({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`os-plate ${className}`}>{children}</div>;
}
