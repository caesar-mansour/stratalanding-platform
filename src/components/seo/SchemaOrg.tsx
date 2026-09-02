import {
  schemaGraph,
  organizationSchema,
  websiteSchema,
  professionalServiceSchema,
} from "@/lib/seo/schemas";
import { safeJsonForScript } from "@/lib/html-utils";

interface SchemaOrgProps {
  schemas?: Record<string, unknown>[];
}

export function SchemaOrg({ schemas = [] }: SchemaOrgProps) {
  const graph = schemaGraph(
    organizationSchema(),
    websiteSchema(),
    professionalServiceSchema(),
    ...schemas
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonForScript(graph) }}
    />
  );
}
