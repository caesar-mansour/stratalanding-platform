import { NextResponse } from "next/server";

/**
 * Template checkout is DISABLED (founder decision, 2026-08-12).
 *
 * AUDIT 2026-08-12 — this endpoint carried two P0 defects and could never have taken a payment:
 *
 *  P0-10  `custom_id` packed type + plan + templateId + fullName + email + phone + company into
 *         JSON. PayPal Orders v2 caps custom_id at 127 characters; a realistic payload measured
 *         175 (a minimal-but-real one still measured 131), so order creation 400s for every real
 *         buyer. The flow was never run end to end.
 *
 *  P0-9   `plan` came straight from a user-editable `?plan=` query parameter and was used verbatim
 *         to price the order. The capture-side amount check compared against that same
 *         client-supplied value, so it validated the tampered price against itself — `?plan=`
 *         swapping bought a $499 template for $149.
 *
 * Rather than half-fix a product line that is not launching, the endpoint is closed and the demo
 * CTAs now point at /brief (the studio offer we can actually fulfil). If the template store is
 * ever revived: persist buyer details in a server-side row and put only its id in custom_id, and
 * derive plan + price from `templateId` server-side — never from the request.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Template purchases are not available. Please start a project brief instead.", href: "/brief" },
    { status: 410 },
  );
}
