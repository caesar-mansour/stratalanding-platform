"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

// Styled table components
export function Table({ children }: { children: ReactNode }) {
    return (
        <motion.div
            className="my-8 overflow-hidden rounded-2xl border border-border shadow-lg"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">{children}</table>
            </div>
        </motion.div>
    );
}

export function TableHead({ children }: { children: ReactNode }) {
    return <thead className="bg-primary text-white">{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
    return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
    return (
        <tr className="transition-colors hover:bg-accent/5">{children}</tr>
    );
}

export function TableHeader({ children }: { children: ReactNode }) {
    return (
        <th className="px-6 py-4 text-sm font-bold uppercase tracking-wider">
            {children}
        </th>
    );
}

export function TableCell({ children }: { children: ReactNode }) {
    const content = String(children);
    const isPositive = content.includes("+");
    const isNegative = content.includes("-") && content.includes("%");
    const isBold = content.startsWith("**") && content.endsWith("**");

    let className = "px-6 py-4 text-sm text-text-muted";

    if (isBold || isPositive || isNegative) {
        className = `px-6 py-4 text-sm font-bold ${isPositive ? "text-green-600" : isNegative ? "text-green-600" : "text-primary"}`;
    }

    return <td className={className}>{children}</td>;
}

export function Blockquote({ children }: { children: ReactNode }) {
    return (
        <motion.blockquote
            className="my-8 relative pl-6 py-4 border-l-4 border-accent bg-accent/5 rounded-r-2xl italic text-primary"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <div className="absolute -left-3 -top-3 text-accent/20 text-6xl font-serif">&quot;</div>
            {children}
        </motion.blockquote>
    );
}

export function H2({ children }: { children: ReactNode }) {
    return (
        <motion.h2
            className="text-2xl md:text-3xl font-bold text-primary mt-12 mb-6 pb-3 border-b border-border"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
        >
            {children}
        </motion.h2>
    );
}

export function H3({ children }: { children: ReactNode }) {
    return (
        <motion.h3
            className="text-xl md:text-2xl font-bold text-primary mt-10 mb-4"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
        >
            {children}
        </motion.h3>
    );
}

export function OrderedList({ children }: { children: ReactNode }) {
    return (
        <motion.ol
            className="my-6 space-y-4 list-none counter-reset-item"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            {children}
        </motion.ol>
    );
}

export function ListItem({ children }: { children: ReactNode }) {
    return (
        <motion.li
            className="flex gap-4 items-start text-text-muted leading-relaxed pl-0"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
        >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-sm font-bold flex items-center justify-center mt-0.5">
                ✓
            </span>
            <span>{children}</span>
        </motion.li>
    );
}

export function Paragraph({ children }: { children: ReactNode }) {
    return (
        <motion.p
            className="text-text-muted leading-relaxed mb-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
        >
            {children}
        </motion.p>
    );
}

export function HorizontalRule() {
    return (
        <motion.hr
            className="my-12 border-none h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
        />
    );
}

export function Strong({ children }: { children: ReactNode }) {
    return <strong className="font-bold text-primary">{children}</strong>;
}

export function Anchor({ href, children }: { href?: string; children: ReactNode }) {
    const isInternal = href?.startsWith("/");
    return (
        <motion.a
            href={href}
            className="text-accent font-medium hover:underline underline-offset-4 inline-flex items-center gap-1 transition-colors"
            whileHover={{ x: 2 }}
            target={isInternal ? undefined : "_blank"}
            rel={isInternal ? undefined : "noopener noreferrer"}
        >
            {children}
            {!isInternal && (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            )}
        </motion.a>
    );
}
