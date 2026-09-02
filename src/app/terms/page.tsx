import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${brand.name}. Read our terms and conditions for using our landing page services.`,
  alternates: {
    canonical: `${brand.url}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-text-primary mb-6">
            Terms of Service
          </h1>
          <p className="font-body text-text-muted text-lg">
            Last updated: January 2026
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Acceptance of Terms
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              By accessing or using {brand.name}&rsquo;s services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Services
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              {brand.name} provides landing page design, development, and conversion optimization services. The specific deliverables, timeline, and pricing are outlined in individual project proposals and agreements.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Intellectual Property
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              Upon full payment, you receive ownership rights to the custom work created specifically for your project. We retain the right to showcase work in our portfolio unless otherwise agreed in writing.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Payment Terms
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              Payment terms are specified in individual project agreements. Typically, we require a 50% deposit to begin work, with the balance due upon completion. Late payments may result in project delays or service suspension.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Refund Policy
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              If you are not satisfied with our work:
            </p>
            <ul className="space-y-2 text-text-muted mb-4">
              <li><strong>Before final delivery:</strong> You may request a refund of up to 50% of the total project cost. The deposit (50%) is retained to cover work already completed.</li>
              <li><strong>After final delivery:</strong> No refunds are available once the project has been delivered and final payment has been made.</li>
            </ul>
            <p className="text-text-muted leading-relaxed mb-8">
              We are committed to your satisfaction and will work with you through all included revision rounds before any refund is considered. Contact us at {brand.email} to discuss any concerns.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Revisions and Changes
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              Each project includes revision rounds based on your selected package:
            </p>
            <ul className="space-y-2 text-text-muted mb-4">
              <li><strong>Presence Page ($2,400):</strong> 6 revision rounds</li>
              <li><strong>Lead Page ($4,800):</strong> Unlimited revisions</li>
              <li><strong>Purchase Page ($9,600):</strong> Unlimited revisions + 14-day post-launch support</li>
            </ul>
            <p className="text-text-muted leading-relaxed mb-4">
              Each revision round covers all feedback submitted together. For packages with limited rounds, additional revisions beyond the included amount may incur additional charges as quoted separately.
            </p>
            <p className="text-text-muted leading-relaxed mb-8">
              For packages that include unlimited revisions, all revision requests must be submitted within 30 days of project launch. After this 30-day window, revisions follow the standard per-round pricing outlined in your project agreement.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              {brand.name} is not liable for any indirect, incidental, or consequential damages arising from the use of our services. Our total liability is limited to the amount paid for the specific service in question.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Termination
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              Either party may terminate a project with written notice. In case of termination, you will be billed for all work completed up to the termination date.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Contact Us
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              If you have questions about these Terms of Service, please contact us at {brand.email}.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
