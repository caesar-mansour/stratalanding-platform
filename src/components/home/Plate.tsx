import type { Plate as PlateData } from "@/components/home/plateTypes";

/**
 * THE PLATE — the one component that carries the page.
 *
 * StrataLanding sells landing pages built for OTHER brands, so every product
 * visual it shows is somebody else's colour system, forever. None of the 16
 * reference sites has this problem — they all show their own product in their
 * own palette. Linear says it outright: "UI mockups rendered in the same dark
 * palette as the marketing site, creating a seamless visual loop where the
 * product IS the hero." That loop is permanently unavailable to us, and it is
 * why an earlier hero read as "a foreign object pasted onto a dark rectangle."
 *
 * The answer, found in the only two genuine studio sites in the library
 * (carlbeaverson.com and Websmith Studio): MOUNT THE WORK LIKE A PRINT.
 *   white plate on warm paper · 32px mat on all four sides · one hairline frame
 *   · no shadow · the client's pixels never touch the page, they touch our mat.
 *
 * The studio's identity then lives in the mat, the frame and the caption format,
 * which are CONSTANT — not in the imagery, which can never be constant.
 *
 * Build this once and never vary it for emphasis. Varied thumbnail size is the
 * loudest marketplace tell in the corpus; emphasise by position instead.
 */

type PlateVariant = "page" | "part";

export function Plate({
  plate,
  variant = "page",
  /** Show the client's real domain in the chrome bar. `page` only. */
  showChrome,
  /** Fade the bottom edge to hint at scrollable content. */
  fadeBottom = false,
  className = "",
  priority = false,
}: {
  plate: PlateData;
  variant?: PlateVariant;
  showChrome?: boolean;
  fadeBottom?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const chrome = showChrome ?? variant === "page";
  /*
   * CROP DISCIPLINE — one ratio per class, forever.
   *   page = 16:9, the top band of a real client page
   *   part = 4:3, ONE component
   *
   * 16:9 rather than 16:10, and the reason is the fold. At 1440 wide, 16:10 is
   * 900px tall, which pushed the plate 60px past a 1300px viewport and made the
   * fold cut straight through the middle of a word in the CLIENT's headline —
   * which reads as a bug, not as a deliberate crop. 16:9 is 810px, so the
   * client's own hero resolves fully above the fold and the mask does the
   * fading. A fold-crop only works when it lands somewhere intentional.
   *
   * `part` is the workhorse: a 4:3 component crop admits roughly a quarter of
   * the foreign luminance a full-page crop does, at zero design cost.
   */
  const ratio = variant === "page" ? 16 / 9 : 4 / 3;

  return (
    <figure className={`one-plate one-plate--${variant} ${className}`}>
      <div className="one-plate__mat">
        {chrome && (
          /*
           * The chrome bar is drawn on purpose (Warp draws macOS traffic lights
           * deliberately). It does two jobs: it says "this is a real web page,
           * not a graphic", and it carries the live domain, which is the cheapest
           * possible proof that the work exists.
           */
          <div className="one-plate__chrome">
            <span className="one-plate__dots" aria-hidden="true">
              <i /><i /><i />
            </span>
            {plate.domain && <span className="one-plate__url">{plate.domain}</span>}
          </div>
        )}
        <div
          className={`one-plate__window ${fadeBottom ? "is-faded" : ""} ${chrome ? "has-chrome" : ""}`}
          style={{ aspectRatio: String(ratio) }}
        >
          {/*
            The inline blur-up ships in the HTML at ~570 bytes, so the plate is
            composed at first paint for ZERO image requests and zero CLS. It is
            sub-entropy on purpose (~0.004 bits/px, far under Chrome's 0.05 bpp
            threshold) so it cannot be elected LCP and steal it from the SSR
            headline.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="one-plate__blur" src={plate.blurUp} alt="" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="one-plate__shot"
            src={plate.src}
            width={plate.w}
            height={plate.h}
            alt={`${plate.label} — a landing page built by the studio`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
          />
        </div>
      </div>

      {/*
        The caption sits BELOW the plate on the canvas, never over the capture —
        the capture already contains the client's own H1 at its top-left, which
        is exactly where an overlay would land.
        Its 32px indent aligns it to the CAPTURE's left edge rather than the
        plate's. That indent is the difference between correct and premium.
      */}
      {/*
        A 4-cell mono caption grid docked inside the mat, on its own hairline —
        not a single floating line. "Fonts In Use puts labels and metadata
        directly beneath every thumbnail." Four cells buy four legible marks
        where one line bought one, at zero colour and zero elevation.
      */}
      <figcaption className="one-plate__cap">
        {[
          ["Client", plate.label],
          ["Sector", plate.industry],
          ["Build", "Lead Page"],
          ["Showcase", "Not a client"],
        ].map(([k, v]) => (
          <span key={k} className="one-plate__capCell">
            <span className="one-plate__capK">{k}</span>
            <span className="one-plate__capV">{v}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
