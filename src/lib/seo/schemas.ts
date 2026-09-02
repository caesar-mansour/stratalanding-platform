import { brand, pricing, pricingFAQ, templatePricing } from "@/lib/brand";

const BASE_URL = brand.url;

// Organization schema — primary entity
export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: brand.name,
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/brand/stratalanding.png`,
      width: 512,
      height: 512,
    },
    image: `${BASE_URL}/opengraph-image`, // audit 2026-08-12: /brand/og-image.png does not exist
    email: brand.email,
    description: brand.description,
    // AUDIT 2026-08-12: a fabricated "San Francisco, CA, US" PostalAddress used to ship here, on
    // every non-standalone page, in machine-readable JSON-LD that Google treats as a factual claim
    // about the business. The studio is not located there. An Organization does not require a
    // postal address — omitting it is both honest and valid. Add a real one if/when there is one.
    areaServed: {
      "@type": "Place",
      name: "Worldwide",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: brand.email,
      availableLanguage: "English",
    },
    sameAs: [brand.social.twitter, brand.social.linkedin],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Landing Page Packages",
      itemListElement: pricing.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        description: tier.description,
        price: tier.price.replace(/[$,]/g, ""),
        priceCurrency: "USD",
        url: `${BASE_URL}/pricing/${tier.slug}`,
      })),
    },
  };
}

// WebSite schema — with SearchAction for sitelinks search box
export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: brand.name,
    url: BASE_URL,
    description: brand.description,
    publisher: { "@id": `${BASE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/demos?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ProfessionalService schema — enhanced
export function professionalServiceSchema() {
  return {
    "@type": "ProfessionalService",
    "@id": `${BASE_URL}/#service`,
    name: brand.name,
    description: brand.description,
    url: BASE_URL,
    provider: { "@id": `${BASE_URL}/#organization` },
    serviceType: [
      "Landing Page Design",
      "Web Development",
      "Conversion Rate Optimization",
      "UI/UX Design",
    ],
    areaServed: "Worldwide",
    priceRange: "$$$",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "2400",
      highPrice: "9600",
      priceCurrency: "USD",
      offerCount: "3",
    },
  };
}

// FAQPage schema — from pricingFAQ data
export function faqPageSchema(
  faqs: readonly { question: string; answer: string }[] = pricingFAQ
) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// Service schema — per pricing tier
export function serviceSchema(tierSlug: string) {
  const tier = pricing.find((p) => p.slug === tierSlug);
  if (!tier) return null;

  return {
    "@type": "Service",
    name: tier.name,
    description: tier.description,
    provider: { "@id": `${BASE_URL}/#organization` },
    url: `${BASE_URL}/pricing/${tier.slug}`,
    areaServed: "Worldwide",
    offers: {
      "@type": "Offer",
      price: tier.price.replace(/[$,]/g, ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: "2026-01-01",
    },
    serviceOutput: tier.features.join("; "),
    termsOfService: `${BASE_URL}/terms`,
  };
}

// BreadcrumbList schema — dynamic per page
export function breadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// WebPage schema — for individual pages
export function webPageSchema(options: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@type": "WebPage",
    "@id": options.url,
    name: options.name,
    description: options.description,
    url: options.url,
    isPartOf: { "@id": `${BASE_URL}/#website` },
    about: { "@id": `${BASE_URL}/#organization` },
    inLanguage: "en-US",
  };
}

// Product schema — for demo template pages
export function demoProductSchema(options: {
  name: string;
  description: string;
  url: string;
  plan: keyof typeof templatePricing;
}) {
  return {
    "@type": "Product",
    name: options.name,
    description: options.description,
    url: options.url,
    brand: { "@id": `${BASE_URL}/#organization` },
    category: "Landing Page Template",
    offers: {
      "@type": "Offer",
      price: templatePricing[options.plan]?.toString() || "149",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: options.url,
    },
  };
}

// HowTo schema — for "How It Works" process section
export function howToSchema() {
  return {
    "@type": "HowTo",
    name: "How to Get a Landing Page Built by StrataLanding",
    description:
      "Get a high-performance landing page designed and built in days. No calls required — fully async process.",
    totalTime: "P14D",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Choose a Demo",
        text: "Browse 700+ landing page demos and find a starting point that fits your goal.",
        url: `${BASE_URL}/demos`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Submit the Brief",
        text: "Fill out the async brief with your offer details and goals. Takes about 10 minutes.",
        url: `${BASE_URL}/brief`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Complete the AI Interview",
        text: "Our AI conducts a deep-dive interview into your brand, audience, and goals.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Get Your Proposal",
        text: "Receive a fixed proposal with scope, timeline, and price within 24 hours.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Review & Revise",
        text: "Review wireframe and messaging, then the final build with tracking. Revise until it's right.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Launch",
        text: "We deploy your page, set up tracking, and provide post-launch support.",
      },
    ],
  };
}

// Article schema — for blog posts
export function articleSchema(options: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  image?: string;
}) {
  return {
    "@type": "Article",
    headline: options.headline,
    description: options.description,
    url: options.url,
    datePublished: options.datePublished,
    dateModified: options.dateModified || options.datePublished,
    author: {
      "@type": "Organization",
      name: brand.name,
      url: BASE_URL,
    },
    publisher: { "@id": `${BASE_URL}/#organization` },
    mainEntityOfPage: options.url,
    ...(options.image && {
      image: {
        "@type": "ImageObject",
        url: options.image,
      },
    }),
    inLanguage: "en-US",
  };
}

// BlogPosting schema — extends Article for blog
export function blogPostingSchema(options: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  image?: string;
  wordCount?: number;
}) {
  return {
    "@type": "BlogPosting",
    headline: options.headline,
    description: options.description,
    url: options.url,
    datePublished: options.datePublished,
    dateModified: options.dateModified || options.datePublished,
    author: {
      "@type": "Organization",
      name: brand.name,
      url: BASE_URL,
    },
    publisher: { "@id": `${BASE_URL}/#organization` },
    mainEntityOfPage: options.url,
    ...(options.image && {
      image: {
        "@type": "ImageObject",
        url: options.image,
      },
    }),
    ...(options.wordCount && { wordCount: options.wordCount }),
    inLanguage: "en-US",
  };
}

// Wrap schemas in a @graph for a single JSON-LD block
export function schemaGraph(
  ...schemas: (Record<string, unknown> | null)[]
) {
  const filtered = schemas.filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@graph": filtered,
  };
}
