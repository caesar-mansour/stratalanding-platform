import type { MDXComponents } from "mdx/types";
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableHeader,
    TableCell,
    Blockquote,
    H2,
    H3,
    OrderedList,
    ListItem,
    Paragraph,
    HorizontalRule,
    Strong,
    Anchor
} from "@/components/blog/MDXComponentsClient";

export function useMDXComponents(components: MDXComponents): MDXComponents {
    return {
        ...components,
        table: Table,
        thead: TableHead,
        tbody: TableBody,
        tr: TableRow,
        th: TableHeader,
        td: TableCell,
        blockquote: Blockquote,
        h2: H2,
        h3: H3,
        ol: OrderedList,
        li: ListItem,
        p: Paragraph,
        hr: HorizontalRule,
        strong: Strong,
        a: Anchor,
    };
}
