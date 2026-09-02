import type { Metadata } from "next";
import { CaseStudyDetail } from "../CaseStudyDetail";

export const metadata: Metadata = {
  title: "VIP High Class Case Study | StrataLanding",
  description:
    "How we built a dark-luxury landing page for a premium chauffeur service in Dubai, designed to drive WhatsApp and phone bookings for weddings, airport transfers, and VIP events.",
};

const data = {
  client: "VIP High Class",
  industry: "Luxury Transportation",
  isRealProject: true,
  siteUrl: "https://viphighclass.com",
  challenge:
    "VIP High Class is a premium private car and chauffeur service operating in Dubai, offering wedding transportation, airport transfers, VIP event transport, city tours, and corporate travel. They needed a landing page that matched the luxury positioning of their brand — think black-tie, not budget. The page had to drive direct bookings through WhatsApp and phone calls, since their high-touch clientele expects immediate, personal service rather than filling out forms.",
  solution:
    "We designed a dark-luxury landing page with a black and gold color scheme that immediately communicates premium quality. Built on Next.js with smooth scroll animations, the page showcases their Mercedes fleet, services, and trust signals across 8 carefully structured sections. Every CTA drives to either a direct phone call or WhatsApp — zero friction, zero forms. The design targets affluent individuals, wedding couples, and corporate clients in the Dubai market.",
  // AUDIT 2026-08-12: invented testimonial removed — no attributable quote exists for this build.
  package: "Lead Page",
  // AUDIT 2026-08-12: packagePrice removed — this was a real build but not a paid $4,800 engagement.
  timeline: "6 business days",
  demoLink: "/demos/local-service-leads",
  results: [
    { label: "CTA Channels", value: "2", detail: "Phone + WhatsApp direct booking" },
    { label: "Sections", value: "8", detail: "Full luxury showcase funnel" },
    { label: "Fleet Cards", value: "3", detail: "Vehicle showcase with specs" },
    { label: "Available", value: "24/7", detail: "Always-on booking capability" },
  ],
  challengePoints: [
    "No professional online presence — nothing to send an enquiry to, and nothing to compare against competitors with polished sites",
    "Luxury brand positioning required a premium dark aesthetic — no generic templates would work",
    "Dubai market expects WhatsApp-first communication — needed direct booking without forms",
    "Had to showcase a premium fleet (Mercedes V 250, luxury sedans) in a way that builds desire",
    "Multi-service offering (weddings, airports, events, tours, corporate) needed clear navigation without clutter",
  ],
  solutionPoints: [
    "Dark-luxury design system: pure black (#000) background with gold (#D4AF37) accents — instantly communicates premium",
    "Built on Next.js with smooth scroll-triggered animations that feel cinematic and high-end",
    "Zero-friction conversion: every CTA drives directly to phone call or WhatsApp — no forms, no signups, no barriers",
    "Fleet showcase section with hover-zoom vehicle cards showing specs, capacity, and features",
    "Trust strip rendering the operator's own supplied credentials — years in service, client volume, availability",
    "Responsive design optimised mobile-first, since the phone and WhatsApp CTAs are tapped, not clicked",
  ],
};

export default function VIPHighClassCaseStudy() {
  return <CaseStudyDetail data={data} />;
}
