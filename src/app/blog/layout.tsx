import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Blog — Landing Page Strategy, Design & Development",
  description:
    "Insights on landing page design, conversion optimization, and web development. Practical guides for businesses building high-performance landing pages.",
  path: "/blog",
  keywords: [
    "landing page blog",
    "conversion optimization",
    "landing page design tips",
    "web design blog",
    "landing page best practices",
  ],
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
