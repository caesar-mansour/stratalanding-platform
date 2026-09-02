"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { BlogPost as BlogPostType } from "@/lib/blog/posts";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

/**
 * Simple markdown-ish content renderer.
 * Handles: ## headings, ### headings, **bold**, - lists, | tables, links, paragraphs.
 */
function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={i}
          className="text-2xl font-heading font-bold text-text-primary mt-10 mb-4"
        >
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={i}
          className="text-xl font-heading font-semibold text-text-primary mt-8 mb-3"
        >
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Table rows
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => !l.includes("---"));
      if (rows.length > 0) {
        const headerCells = rows[0]
          .split("|")
          .filter((c) => c.trim())
          .map((c) => c.trim());
        const bodyRows = rows.slice(1);
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {headerCells.map((cell, ci) => (
                    <th
                      key={ci}
                      className="border border-border px-4 py-2 text-left font-semibold bg-background"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => {
                  const cells = row
                    .split("|")
                    .filter((c) => c.trim())
                    .map((c) => c.trim());
                  return (
                    <tr key={ri}>
                      {cells.map((cell, ci) => (
                        <td key={ci} className="border border-border px-4 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // List items
    if (line.trim().startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="list-disc pl-6 my-4 space-y-2">
          {listItems.map((item, li) => (
            <li key={li} className="text-text-muted leading-relaxed">
              <InlineContent text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      elements.push(<hr key={i} className="my-8 border-border" />);
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p key={i} className="text-text-muted leading-relaxed my-4">
        <InlineContent text={line} />
      </p>
    );
    i++;
  }

  return elements;
}

/** Handles bold, links, and inline code */
function InlineContent({ text }: { text: string }) {
  // Process **bold**, [links](/url), and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="text-text-primary font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <Link
              key={i}
              href={linkMatch[2]}
              className="text-accent hover:underline"
            >
              {linkMatch[1]}
            </Link>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="text-sm bg-background px-1.5 py-0.5 rounded font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </>
  );
}

export function BlogPostView({ post }: { post: BlogPostType }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto px-4 py-16"
    >
      <Breadcrumbs
        items={[
          { name: "Blog", href: "/blog" },
          { name: post.title, href: `/blog/${post.slug}` },
        ]}
        className="mb-8"
      />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
            {post.category}
          </span>
          <span className="text-sm text-text-muted">
            {post.readingTime} min read
          </span>
        </div>

        <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-4 leading-tight">
          {post.title}
        </h1>

        <p className="text-lg text-text-muted leading-relaxed mb-4">
          {post.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span>By {post.author}</span>
          <span>&bull;</span>
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
      </header>

      <div className="prose-strata">{renderContent(post.content)}</div>

      <footer className="mt-16 pt-8 border-t border-border">
        <div className="flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-text-muted bg-background px-3 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>

        <Link
          href="/blog"
          className="text-accent hover:underline font-medium"
        >
          &larr; Back to all posts
        </Link>
      </footer>
    </motion.article>
  );
}
