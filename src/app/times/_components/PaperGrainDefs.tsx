'use client';

/**
 * Mounts the SVG <filter id="paper-grain"> definition once per page.
 * Used by `.paper-grain::after` in globals.css to give every PaperCard a
 * subtle organic texture without an image asset.
 *
 * Mount once at the top of any view that uses PaperCard. Mounting twice is
 * harmless; the second copy is shadowed by the first.
 */
export function PaperGrainDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: 'absolute' }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="paper-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed="11"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.43
                    0 0 0 0 0.36
                    0 0 0 0 0.20
                    0 0 0 0.18 0"
          />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
