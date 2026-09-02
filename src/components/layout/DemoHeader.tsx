"use client";

import { brand, planSlugToPackage } from "@/lib/brand";
import { Button } from "@/components/ui/Button";
import { FileText } from "lucide-react";
import Link from "next/link";

export function DemoHeader({ templateId, plan }: { templateId: string; price?: number; plan: string }) {
    return (
        <div className="bg-white border-b border-slate-100 py-3 px-4 flex items-center justify-between sticky top-0 z-50">
            <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>
                <span className="font-bold text-slate-900 hidden sm:inline">{brand.name}</span>
            </Link>

            <div className="flex items-center gap-4">
                {/* AUDIT 2026-08-12: repointed from the template checkout (which could not take a
                    payment) to the studio brief — the offer we can actually fulfil. */}
                <Link href={`/brief?demo=${templateId}&plan=${planSlugToPackage[plan as keyof typeof planSlugToPackage] || 'starter'}`}>
                    <Button variant="primary" size="sm" className="hidden sm:flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Get This Built
                    </Button>
                    <Button variant="primary" size="sm" className="sm:hidden flex items-center justify-center p-2">
                        <FileText className="w-4 h-4" />
                    </Button>
                </Link>
            </div>
        </div>
    );
}
