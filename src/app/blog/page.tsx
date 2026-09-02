"use client";

import { motion } from "framer-motion";
import { getAllPosts, blogCategories } from "@/lib/blog/posts";
import { BlogCard } from "@/components/blog/BlogCard";
import { useState } from "react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import Link from "next/link";

export default function BlogPage() {
  const allPosts = getAllPosts();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filtered =
    activeCategory === "All"
      ? allPosts
      : allPosts.filter((p) => p.category === activeCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <Breadcrumbs items={[{ name: "Blog", href: "/blog" }]} className="mb-8" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-3">
          Blog
        </h1>
        <p className="text-lg text-text-muted mb-8 max-w-2xl">
          Insights on landing page strategy, design, and development. Practical
          guides for businesses building high-performance pages.
        </p>
      </motion.div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-10">
        {["All", ...blogCategories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-sm px-4 py-2 rounded-full border transition-all ${
              activeCategory === cat
                ? "bg-primary text-white border-primary"
                : "bg-white text-text-muted border-border hover:border-accent/30"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filtered.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-text-muted py-12">
          No posts in this category yet. Check back soon!
        </p>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-16 text-center bg-primary rounded-2xl p-10"
      >
        <h2 className="text-2xl font-heading font-bold text-white mb-3">
          Ready to Build Your Landing Page?
        </h2>
        <p className="text-white/70 mb-6 max-w-lg mx-auto">
          Browse 700+ demos, find your starting point, and get a proposal in 24
          hours. No calls needed.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/demos"
            className="bg-white text-primary font-semibold px-6 py-3 rounded-lg hover:bg-white/90 transition-colors"
          >
            Browse Demos
          </Link>
          <Link
            href="/brief"
            className="bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A] text-[#0B1B3A] font-semibold px-6 py-3 rounded-lg transition-all hover:brightness-105 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#3A6A8A]/20"
          >
            Start Project Brief
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
