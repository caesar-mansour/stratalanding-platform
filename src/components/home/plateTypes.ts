/** Shape of one entry in src/data/plates.json, produced by scripts/plates.cjs. */
export type Plate = {
  id: string;
  label: string;
  industry: string;
  /** Optional live domain, rendered in the plate's chrome bar as cheap proof the work exists. */
  domain?: string;
  src: string;
  mobileSrc: string;
  w: number;
  h: number;
  mobileW: number;
  mobileH: number;
  /** ~570-byte inline data URI. Sub-entropy so it can never be elected LCP. */
  blurUp: string;
  domHex: string;
  layoutHash: string;
};
