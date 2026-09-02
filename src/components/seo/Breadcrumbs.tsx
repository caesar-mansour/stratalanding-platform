"use client";

import Link from "next/link";
import { brand } from "@/lib/brand";
import { breadcrumbSchema, schemaGraph } from "@/lib/seo/schemas";
import { safeJsonForScript } from "@/lib/html-utils";

interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Visual breadcrumb navigation + JSON-LD structured data.
 * Renders both a user-visible breadcrumb trail and schema.org markup.
 */
export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const fullItems = [{ name: "Home", href: "/" }, ...items];

  const schemaItems = fullItems.map((item) => ({
    name: item.name,
    url: `${brand.url}${item.href === "/" ? "" : item.href}`,
  }));

  const schema = schemaGraph(breadcrumbSchema(schemaItems));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(schema) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`text-sm text-text-muted ${className}`}
      >
        <ol className="flex items-center gap-1.5 flex-wrap">
          {fullItems.map((item, i) => (
            <li key={item.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-border" aria-hidden="true">
                  /
                </span>
              )}
              {i === fullItems.length - 1 ? (
                <span className="text-text-primary font-medium" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-accent transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
