/**
 * Sections barrel — post-STRATA sweep (2026-07-18).
 * The homepage is composed of strata bands (src/components/strata/bands/);
 * only sections with live non-homepage consumers survive here:
 *   Services + ROICalculator → /solutions/[niche]
 *   PricingDetail            → /pricing/<plan> routes
 * (DemoPreviewExpandModal is imported directly by /demos, not via barrel.)
 */
export { Services } from "./Services";
export { PricingDetail } from "./PricingDetail";
export { ROICalculator } from "./ROICalculator";
