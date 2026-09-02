import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://stratalanding.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/portal",
          "/portal/*",
          "/partner-portal",
          "/partner-portal/*",
          "/times",
          "/times/*",
          "/api",
          "/api/*",
          "/proposal",
          "/proposal/*",
          "/preview",
          "/preview/*",
          "/auth",
          "/auth/*",
          "/login",
          "/banned",
          "/unauthorized",
          "/purchase",
          "/purchase/*",
        ],
      },
      {
        // Block AI training crawlers
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Google-Extended"],
        disallow: "/",
      },
      {
        // Rate-limit aggressive SEO tool crawlers
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot"],
        crawlDelay: 10,
        allow: "/",
        disallow: [
          "/admin",
          "/portal",
          "/api",
          "/auth",
          "/purchase",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
