/**
 * THE LEDGER HEAD.
 *
 * The single most identity-carrying component on the page. It opens every
 * static section and appears nine times:
 *
 *   ◆  THE SYSTEM  ————————————————————  THREE PAGES · ONE JOB EACH
 *
 * Four parts, in order: the cyan diamond (9px — the brand mark, used here and
 * as the marquee separator, nowhere else), the section name in mono uppercase,
 * a 1px rule that DRAWS left-to-right as the section enters view, and a
 * right-hand meta line.
 *
 * It is full-bleed: the negative margin escapes the 34px page gutter so the
 * rule runs edge to edge and the page reads as a ledger rather than a card
 * grid. `--nl-gutter` drives both sides, so changing the gutter can't
 * desynchronise them.
 *
 * The rule carries [data-rule], which is a CSS scroll-driven animation
 * (animation-timeline: view()). It must therefore NEVER be given a data-anim
 * key — one writer per element, or the running animation fights the engine's
 * inline transform. See NLEngine.ts.
 */

interface LedgerHeadProps {
  /** Section name, left of the rule. Rendered uppercase by .nl-mono. */
  label: string;
  /** The right-hand meta line. Rendered uppercase. */
  meta?: string;
  /**
   * Parallax depth for the whole head, read by the engine's [data-para] pass.
   * 0.045 is the source's value; pass null to pin it.
   */
  para?: number | null;
}

export function LedgerHead({ label, meta, para = 0.045 }: LedgerHeadProps) {
  return (
    <div
      {...(para == null ? {} : { "data-para": String(para) })}
      className="nl-bleed mb-[72px] flex items-center gap-[18px] pt-[22px]"
      style={{ paddingLeft: "var(--nl-gutter)", paddingRight: "var(--nl-gutter)" }}
    >
      <span aria-hidden className="text-[9px] leading-none" style={{ color: "var(--nl-accent)" }}>
        ◆
      </span>
      <span className="nl-mono" style={{ color: "var(--nl-ink)" }}>
        {label}
      </span>
      {/* Draws with scroll. transform-origin pins the growth to the left. */}
      <span
        data-rule="1"
        aria-hidden
        className="block h-px flex-1 origin-left"
        style={{ background: "var(--nl-r18)" }}
      />
      {meta ? (
        <span className="nl-mono hidden md:block" style={{ color: "var(--nl-meta)" }}>
          {meta}
        </span>
      ) : null}
    </div>
  );
}
