import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostBySlug, getAllSlugs } from "@/lib/blog/posts";
import { brand, seo } from "@/lib/brand";
import { schemaGraph, blogPostingSchema, breadcrumbSchema } from "@/lib/seo/schemas";
import { BlogPostView } from "@/components/blog/BlogPost";
import { safeJsonForScript } from "@/lib/html-utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const url = `${brand.url}/blog/${slug}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags.join(", "),
    alternates: { canonical: url },
    openGraph: {
      title: `${post.title} | ${brand.name}`,
      description: post.description,
      url,
      siteName: brand.name,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | ${brand.name}`,
      description: post.description,
      site: seo.twitter.handle,
      creator: seo.twitter.handle,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const schemas = schemaGraph(
    blogPostingSchema({
      headline: post.title,
      description: post.description,
      url: `${brand.url}/blog/${slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      author: post.author,
      wordCount: post.content.split(/\s+/).length,
    }),
    breadcrumbSchema([
      { name: "Home", url: brand.url },
      { name: "Blog", url: `${brand.url}/blog` },
      { name: post.title, url: `${brand.url}/blog/${slug}` },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(schemas) }}
      />
      <BlogPostView post={post} />
    </>
  );
}
