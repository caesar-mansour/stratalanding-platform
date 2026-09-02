"use client";

/**
 * CutSection — the band shell. Applies THE CUT grammar (IO adds .is-cut
 * once; tokens.css runs SCORE + OPEN) and, when given an analyticsId,
 * fires the contracted section_view. RSC bands compose content as children.
 */

import { useRef } from "react";
import { useCut, useSectionView } from "./tier";

export function CutSection({
  band,
  id,
  analyticsId,
  className = "",
  children,
}: {
  band: string;
  id?: string;
  analyticsId?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useCut(ref);
  useSectionView(ref, analyticsId);

  return (
    <section ref={ref} id={id} data-strata-band={band} className={className}>
      {children}
    </section>
  );
}
