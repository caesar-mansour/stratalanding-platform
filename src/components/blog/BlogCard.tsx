"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { BlogPost } from "@/lib/blog/posts";

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Link
        href={`/blog/${post.slug}`}
        className="group block bg-white rounded-2xl border border-border p-6 hover:border-accent/30 hover:shadow-lg transition-all duration-300"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
            {post.category}
          </span>
          <span className="text-xs text-text-muted">
            {post.readingTime} min read
          </span>
        </div>

        <h2 className="text-lg font-heading font-bold text-text-primary group-hover:text-accent transition-colors mb-2 line-clamp-2">
          {post.title}
        </h2>

        <p className="text-sm text-text-muted leading-relaxed line-clamp-2 mb-4">
          {post.description}
        </p>

        <div className="flex items-center justify-between">
          <time className="text-xs text-text-muted" dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          <span className="text-sm font-medium text-accent group-hover:translate-x-1 transition-transform">
            Read more &rarr;
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
