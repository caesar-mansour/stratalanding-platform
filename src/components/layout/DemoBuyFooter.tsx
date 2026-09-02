"use client";

import { brand, planSlugToPackage } from "@/lib/brand";
import { Button } from "@/components/ui/Button";
import { FileText, ShieldCheck, Zap, Clock } from "lucide-react";
import Link from "next/link";

export function DemoBuyFooter({ templateId, plan }: { templateId: string; price?: number; plan: string }) {
    return (
        <div className="bg-slate-900 text-white py-16 px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-cyan-400 text-sm font-bold uppercase tracking-widest mb-4">
                    <Zap className="w-4 h-4" />
                    Direct Download Available
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight">
                    Want a page like this for your business?
                </h2>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                    We design and build it for you — Next.js, tuned for speed and conversion. Fixed price, no calls.
                </p>

                <div className="flex flex-col items-center gap-6 pt-8">
                    <Link href={`/brief?demo=${templateId}&plan=${planSlugToPackage[plan as keyof typeof planSlugToPackage] || "starter"}`}>
                        <Button variant="primary" size="lg" className="h-16 px-12 text-xl font-black shadow-2xl shadow-cyan-500/20">
                            <FileText className="w-6 h-6 mr-3" />
                            Get This Built For You
                        </Button>
                    </Link>

                    <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                            Fixed price, no calls
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-500" />
                            Shipped in days
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            100% Performance
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
