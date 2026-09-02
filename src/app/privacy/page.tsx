import type { Metadata } from "next";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "How StrataLanding collects, uses, and protects your information. Read our privacy policy.",
  alternates: {
    canonical: "https://stratalanding.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-text-primary mb-6">
            Privacy Notice
          </h1>
          <p className="font-body text-text-muted text-lg">
            Effective date: 2026-01-22
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <p className="text-text-muted leading-relaxed mb-8">
              This Privacy Notice explains how Stratalanding (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects and uses information when you visit stratalanding.com or contact us.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Information we collect
            </h2>
            <ul className="space-y-3 text-text-muted mb-8">
              <li>Information you provide: name, email, phone number, company/brand name, project details, and any message you submit through our forms or email.</li>
              <li>Website analytics: pages visited, referring site, UTM campaign parameters, device type and model, browser, operating system, screen size, and interaction events (for example, button clicks or form submissions).</li>
              <li>Your IP address, and the country, city and approximate coordinates our hosting provider derives from it. We store these alongside your analytics session. IP addresses are retained for a limited period and then purged.</li>
              <li>Cookies: small files used for basic website functionality and analytics.</li>
            </ul>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              How we use your information
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">We use information to:</p>
            <ul className="space-y-3 text-text-muted mb-8">
              <li>respond to inquiries and provide quotes;</li>
              <li>deliver our services and communicate about your project;</li>
              <li>improve the website experience and measure performance;</li>
              <li>prevent abuse and maintain security.</li>
            </ul>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Sharing and third parties
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              We do not sell personal information. We may share limited information with service providers that help us operate and improve our website and deliver services (for example: hosting, analytics, automation tools, email services, and CRM tools). These providers are only used as needed to run the business.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Payments
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              Payments are processed by PayPal. We never see or store your card or bank details — PayPal handles them under its own privacy policy and security practices. We retain a record of each transaction (amount, currency, date and PayPal&rsquo;s transaction reference) for accounting purposes and to resolve any dispute.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Cookies and analytics
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              We may use analytics to understand how visitors use the website and to improve content and performance. You can limit cookies via your browser settings. Note that some site features may not function properly if cookies are disabled.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Data retention
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">We keep personal information only as long as needed for:</p>
            <ul className="space-y-3 text-text-muted mb-8">
              <li>providing services,</li>
              <li>maintaining business records, and</li>
              <li>security/legal compliance (where applicable).</li>
            </ul>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Your choices
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              You can request access, correction, or deletion of your information by emailing: {brand.email}.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Children
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              Stratalanding is not intended for children under 13.
            </p>

            <h2 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mt-12 mb-4">
              Contact
            </h2>
            <p className="text-text-muted leading-relaxed mb-8">
              For privacy questions, contact: {brand.email}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
