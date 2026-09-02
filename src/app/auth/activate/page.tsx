"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { SignupForm } from "@/components/auth/SignupForm";
import Image from "next/image";
import { Package } from "lucide-react";

function ActivateContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const name = searchParams.get("name") || "";

    if (!email) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A]">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">Invalid Link</h1>
                    <p className="text-slate-600">This activation link is invalid. Please use the link from your purchase confirmation.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
            {/* Background — matches login page */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A]" />
            <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px'
                }}
            />
            <motion.div
                className="absolute top-20 left-10 w-80 h-80 bg-white/40 rounded-full blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-20 right-10 w-96 h-96 bg-[#0891B2]/30 rounded-full blur-3xl"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo */}
                <motion.div
                    className="flex justify-center mb-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="bg-white backdrop-blur-sm rounded-2xl p-4 border border-slate-200 shadow-lg shadow-cyan-200/50">
                        <Image
                            src="/brand/stratalanding.png"
                            alt="StrataLanding"
                            width={48}
                            height={48}
                            className="w-12 h-12"
                        />
                    </div>
                </motion.div>

                {/* Card */}
                <div className="bg-white backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-200">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-7 h-7 text-cyan-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#0B1B3A] mb-2">
                            Activate Your Account
                        </h1>
                        <p className="text-[#334155] text-sm">
                            Set a password to access your template portal and download your purchase.
                        </p>
                    </div>

                    <SignupForm
                        email={email}
                        name={name}
                        redirectTo="/portal/my-templates"
                    />
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-slate-600 mt-6 backdrop-blur-sm bg-white/80 rounded-full py-3 px-6 inline-block w-full border border-slate-200">
                    Already have an account?{' '}
                    <a
                        href="/login?redirectTo=/portal/my-templates"
                        className="text-accent hover:text-[#0B1B3A] font-medium transition-colors hover:underline"
                    >
                        Sign in instead
                    </a>
                </p>
            </motion.div>
        </div>
    );
}

export default function ActivatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#E8F0F8] via-[#9ABCD8] to-[#3A6A8A]">
                <div className="animate-pulse text-white">Loading...</div>
            </div>
        }>
            <ActivateContent />
        </Suspense>
    );
}
