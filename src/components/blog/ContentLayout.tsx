"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ReactNode, useRef } from "react";
import { Button } from "@/components/ui";
import Link from "next/link";
import { FloatingParticles } from "@/components/motion/FloatingParticles";
import { spring } from "@/lib/motion";

interface ContentLayoutProps {
    children: ReactNode;
    metadata: {
        title: string;
        description: string;
        date: string;
        category: string;
        image?: string;
    };
}

export function ContentLayout({ children, metadata }: ContentLayoutProps) {
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"],
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

    return (
        <article className="pb-24">
            {/* Hero Header */}
            <header
                ref={heroRef}
                className="relative bg-primary text-white overflow-hidden pt-32 pb-32"
            >
                {/* Background effects */}
                <div className="absolute inset-0">
                    <FloatingParticles count={20} color="accent" size="sm" speed="slow" className="opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/50 to-primary" />
                    <div
                        className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl sl-float"
                        style={{ '--sl-d': '30px', '--sl-dur': '20s' } as React.CSSProperties}
                    />
                    <div
                        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl sl-float"
                        style={{ '--sl-d': '25px', '--sl-dur': '15s', '--sl-delay': '3s' } as React.CSSProperties}
                    />
                </div>

                <motion.div
                    className="container max-w-4xl relative z-10"
                    style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={spring.dramatic}
                        className="text-center"
                    >
                        {/* Category Badge */}
                        <motion.div
                            className="inline-block px-4 py-2 bg-accent/20 backdrop-blur-sm border border-accent/30 text-accent text-xs font-bold rounded-full mb-8 uppercase tracking-widest"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ ...spring.bouncy, delay: 0.2 }}
                        >
                            {metadata.category}
                        </motion.div>

                        {/* Title */}
                        <motion.h1
                            className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...spring.dramatic, delay: 0.3 }}
                        >
                            {metadata.title}
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            className="text-xl md:text-2xl text-white/80 mb-10 leading-relaxed max-w-3xl mx-auto"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...spring.soft, delay: 0.4 }}
                        >
                            {metadata.description}
                        </motion.p>

                        {/* Meta info */}
                        <motion.div
                            className="flex items-center justify-center gap-6 text-sm text-white/60"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{metadata.date}</span>
                            </div>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>8 min read</span>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Bottom curve */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto">
                        <path
                            d="M0 60V30C360 0 1080 0 1440 30V60H0Z"
                            fill="white"
                        />
                    </svg>
                </div>
            </header>

            {/* Main Content */}
            <div className="container max-w-3xl -mt-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="bg-white rounded-3xl shadow-xl border border-border p-8 md:p-12"
                >
                    {children}
                </motion.div>

                {/* Footer / CTA */}
                <motion.footer
                    className="mt-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 text-white p-10 md:p-14">
                        {/* Background decoration */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-accent rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl" />
                        </div>

                        <div className="relative z-10 text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={spring.bouncy}
                            >
                                <h3 className="text-3xl md:text-4xl font-black mb-4">
                                    Ready to be our next success story?
                                </h3>
                                <p className="text-white/70 mb-10 max-w-lg mx-auto text-lg">
                                    We apply the same conversion framework used in this case study to every project we take on.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Link href="/quote">
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            transition={spring.snappy}
                                        >
                                            <Button size="lg" className="bg-accent text-primary hover:bg-accent/90 shadow-lg">
                                                Get a Custom Proposal
                                            </Button>
                                        </motion.div>
                                    </Link>
                                    <Link href="/case-studies">
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            transition={spring.snappy}
                                        >
                                            <Button variant="ghost" size="lg" className="text-white border-white/30 hover:bg-white/10">
                                                Back to Case Studies
                                            </Button>
                                        </motion.div>
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.footer>
            </div>
        </article>
    );
}
