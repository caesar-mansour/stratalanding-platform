"use client";

import { usePathname } from "next/navigation";
import { DemoBuyFooter } from "./DemoBuyFooter";
import { planSlugToPackage } from "@/lib/brand";
// AUDIT 2026-08-12 (P2 PF-03): was importing `demos` from @/app/demos/page and `additionalDemos`
// — ~336 KB of catalog (plus framer-motion and the UI kit, pulled in transitively) shipped to the
// browser on every demo page purely to answer "which tier is this demo?". demo-plans answers the
// same question in ~15 KB with no transitive weight.
import { getDemoPlan } from "@/lib/demo-plans";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export function DemoLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const cleanPath = pathname.replace(/\/+$/, "");
    const pathParts = cleanPath.split("/");
    const demoId = pathParts[2]; // /demos/[id]

    const isIndividualDemo = pathParts.length === 3 && pathParts[1] === "demos" && !!demoId;

    // Look up the demo's tier (lead-page, presence-page, purchase-page)
    const plan = getDemoPlan(demoId);
    // Convert plan slug to package name for brief form (starter/growth/scale)
    const packageName = planSlugToPackage[plan] || "starter";

    if (!isIndividualDemo) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            {/* Demo top bar — above the demo's own header */}
            <div className="sticky top-0 z-[9999] bg-[#0B1B3A] text-white">
                <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between text-xs">
                    <Link
                        href="/demos"
                        className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors font-medium py-2.5 min-h-[44px]"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Back to Demos</span>
                        <span className="sm:hidden">Back</span>
                    </Link>

                    {/* AUDIT 2026-08-12 (P1 SEO-17): demo pages depict invented businesses making
                        concrete claims ("10,000+ Happy Clients", "5.0 on Google (200+ reviews)").
                        With no disclosure those read as real testimonials for a real company.
                        Say plainly what this is — it costs nothing and protects the studio's
                        credibility with the prospect who was sent here. */}
                    <span className="hidden md:inline text-white/50 font-medium tracking-wide uppercase text-[10px]">
                        Sample design — placeholder brand &amp; content
                    </span>

                    <Link
                        href={`/brief?demo=${demoId}&plan=${packageName}`}
                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 min-h-[44px] rounded-full transition-colors border border-white/20"
                    >
                        <FileText className="w-3 h-3" />
                        <span className="hidden sm:inline">Get This Built For You</span>
                        <span className="sm:hidden">Get This Built</span>
                    </Link>

                    {/* AUDIT 2026-08-12: the "Buy Template" CTA is removed. The $149/$299/$499
                        template checkout could not take a payment (PayPal custom_id exceeded the
                        127-char limit) and priced itself from a user-editable ?plan= query param.
                        The studio offer is the CTA now — "Get This Built For You" sits alongside. */}
                </div>
            </div>

            {/* AUDIT 2026-08-12 (P2): was a <main>, nested inside MarketingChrome's
                <main id="main-content"> — two main landmarks on every demo page. */}
            <div className="flex-grow">
                {children}
            </div>
            <DemoBuyFooter templateId={demoId} plan={plan} />
        </div>
    );
}
