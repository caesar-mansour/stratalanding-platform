"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface RelatedDemo {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  goalLabel: string;
  href: string;
}

interface RelatedDemosProps {
  demos: RelatedDemo[];
  currentSlug: string;
}

/**
 * Shows 3-4 related demos at the bottom of a demo page.
 * Helps with internal linking and keeps visitors exploring.
 */
export function RelatedDemos({ demos, currentSlug }: RelatedDemosProps) {
  const related = demos
    .filter((d) => d.id !== currentSlug)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <section className="bg-background py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">
          More Demos You Might Like
        </h2>
        <p className="text-text-muted mb-8">
          Browse related landing page templates in this category.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {related.map((demo, i) => (
            <motion.div
              key={demo.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link
                href={demo.href}
                className="group block bg-white rounded-xl border border-border p-5 hover:border-accent/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                    {demo.category}
                  </span>
                  <span className="text-xs text-text-muted">
                    {demo.goalLabel}
                  </span>
                </div>
                <h3 className="font-heading font-semibold text-text-primary group-hover:text-accent transition-colors mb-1">
                  {demo.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                  {demo.description}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/demos"
            className="text-accent hover:underline font-medium text-sm"
          >
            Browse all 700+ demos &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
