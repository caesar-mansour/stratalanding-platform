"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { brand } from "@/lib/brand";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Download, ExternalLink, Mail, Zap, Code2, Palette, Rocket, Shield, Headphones, FileText, Monitor, Smartphone, UserPlus, LogIn } from "lucide-react";
import Link from "next/link";

interface TemplatePurchase {
    id: string;
    downloadToken: string;
    isNewAccount?: boolean;
    buyerEmail?: string;
    buyerName?: string;
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const alreadyCaptured = searchParams.get("downloaded") === "1";
    const [status, setStatus] = useState<"loading" | "success" | "error">(alreadyCaptured ? "success" : "loading");
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [purchase, setPurchase] = useState<TemplatePurchase | null>(
        alreadyCaptured && token ? {
            id: "",
            downloadToken: token,
            isNewAccount: searchParams.get("newAccount") === "1",
            buyerEmail: searchParams.get("email") || undefined,
            buyerName: searchParams.get("name") || undefined,
        } : null
    );
    const [isTemplate, setIsTemplate] = useState(alreadyCaptured);

    useEffect(() => {
        // If already captured via SDK, skip re-capture
        if (alreadyCaptured || !token) return;
        capturePayment(token);
    }, [token, alreadyCaptured]);

    const capturePayment = async (orderId: string) => {
        try {
            const response = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
            });

            if (response.ok) {
                const orderData = await response.json();
                setData(orderData);
                setStatus("success");

                // Check if template purchase
                if (orderData.purchaseType === "template" && orderData.purchase) {
                    setIsTemplate(true);
                    setPurchase(orderData.purchase);
                }
            } else {
                setStatus("error");
            }
        } catch (error) {
            console.error("Capture failed:", error);
            setStatus("error");
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-600 font-medium">Capturing your payment...</p>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl">
                    <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <Mail className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
                    <p className="text-slate-600">
                        We couldn&rsquo;t verify your payment. If you&rsquo;ve been charged, please contact us at {brand.email} with your PayPal transaction ID.
                    </p>
                    <Link href="/demos">
                        <Button variant="primary" className="w-full">
                            Back to Demos
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    // Template purchase success
    if (isTemplate && purchase) {
        const downloadUrl = `/api/templates/download?token=${purchase.downloadToken}`;

        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Main Success Card */}
                    <Card className="p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 via-cyan-500 to-[#3A6A8A]"></div>

                        <div className="bg-green-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-100">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Purchase Successful!</h1>
                        <p className="text-xl text-slate-600 mb-3 max-w-xl mx-auto">
                            Your template is ready. Set up your account to download it and access it anytime from your portal.
                        </p>
                        <p className="text-sm text-slate-400 mb-8">A backup download link has also been sent to your email.</p>

                        {/* Account Gate — new buyers create account, existing buyers login */}
                        {purchase.isNewAccount ? (
                            <Link
                                href={`/auth/activate?email=${encodeURIComponent(purchase.buyerEmail || '')}&name=${encodeURIComponent(purchase.buyerName || '')}`}
                                className="inline-block mb-10"
                            >
                                <Button variant="gradient" className="h-16 px-12 text-lg font-bold shadow-xl shadow-[#3A6A8A]/30 hover:shadow-2xl hover:shadow-[#3A6A8A]/40">
                                    <UserPlus className="w-6 h-6 mr-3" />
                                    Set Up Your Account to Download
                                </Button>
                            </Link>
                        ) : (
                            <Link
                                href="/login?redirectTo=/portal/my-templates"
                                className="inline-block mb-10"
                            >
                                <Button variant="gradient" className="h-16 px-12 text-lg font-bold shadow-xl shadow-[#3A6A8A]/30 hover:shadow-2xl hover:shadow-[#3A6A8A]/40">
                                    <LogIn className="w-6 h-6 mr-3" />
                                    Login to Download
                                </Button>
                            </Link>
                        )}

                        {/* Getting Started + Access Anytime */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                                <div className="flex items-center mb-4 text-cyan-700 font-bold uppercase tracking-wider text-sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Getting Started
                                </div>
                                <ul className="space-y-3 text-slate-600 text-sm">
                                    <li className="flex items-start">
                                        <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0">1</span>
                                        <span>Unzip and <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">cd</code> into the template folder</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0">2</span>
                                        <span>Run <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">npm install</code> to install dependencies</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0">3</span>
                                        <span>Run <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">npm run dev</code> to preview locally</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0">4</span>
                                        <span>Customize content, colors & images to match your brand</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0">5</span>
                                        <span>Deploy to Vercel or Netlify in one click</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                                <div className="flex items-center mb-4 text-cyan-700 font-bold uppercase tracking-wider text-sm">
                                    <Zap className="w-4 h-4 mr-2" />
                                    Your Template Portal
                                </div>
                                <p className="text-slate-600 text-sm mb-4">
                                    {purchase.isNewAccount
                                        ? "Create your account to unlock your personal template portal. Re-download anytime — including future updates."
                                        : "Your template has been added to your portal. Log in to download it and access all your purchases."}
                                </p>
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex items-center mb-2 text-cyan-700 font-bold uppercase tracking-wider text-sm">
                                        <Headphones className="w-4 h-4 mr-2" />
                                        Need Help?
                                    </div>
                                    <p className="text-slate-600 text-sm">
                                        Stuck on setup? Email us and we&apos;ll get you live fast.
                                    </p>
                                    <a href={`mailto:${brand.email}`} className="text-cyan-600 font-bold hover:underline inline-flex items-center text-sm mt-1">
                                        {brand.email} <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {purchase.isNewAccount ? (
                                <Link href={`/auth/activate?email=${encodeURIComponent(purchase.buyerEmail || '')}&name=${encodeURIComponent(purchase.buyerName || '')}`}>
                                    <Button variant="secondary" className="px-8 h-12">
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Create Account
                                    </Button>
                                </Link>
                            ) : (
                                <Link href="/login?redirectTo=/portal/my-templates">
                                    <Button variant="secondary" className="px-8 h-12">
                                        <LogIn className="w-4 h-4 mr-2" />
                                        Go to My Templates
                                    </Button>
                                </Link>
                            )}
                            <Link href="/demos">
                                <Button variant="secondary" className="px-8 h-12">
                                    Browse More Templates
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* What's Included Section */}
                    <Card className="p-8 md:p-10 shadow-lg">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">What&apos;s Included in Your Template</h2>
                        <p className="text-slate-500 text-center mb-8">Everything you need to launch a professional site — no extras required.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto">
                                    <Code2 className="w-6 h-6 text-cyan-600" />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-sm">Clean Source Code</h3>
                                <p className="text-xs text-slate-500">Next.js + React + TypeScript — production-ready</p>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto">
                                    <Palette className="w-6 h-6 text-cyan-600" />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-sm">Premium Design</h3>
                                <p className="text-xs text-slate-500">Tailwind CSS with custom animations & transitions</p>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto">
                                    <Monitor className="w-6 h-6 text-cyan-600" />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-sm">Fully Responsive</h3>
                                <p className="text-xs text-slate-500">Looks perfect on desktop, tablet & mobile</p>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto">
                                    <Rocket className="w-6 h-6 text-cyan-600" />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-sm">SEO Optimized</h3>
                                <p className="text-xs text-slate-500">Meta tags, Open Graph, schema markup built in</p>
                            </div>
                        </div>
                    </Card>

                    {/* Pro Tips Section */}
                    <Card className="p-8 md:p-10 shadow-lg">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Pro Tips for Customization</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 bg-gradient-to-br from-slate-50 to-cyan-50/30 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <Palette className="w-5 h-5 text-cyan-600" />
                                    <h3 className="font-bold text-slate-900 text-sm">Change Colors</h3>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Edit <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">tailwind.config.ts</code> to swap the color palette. All components inherit from the theme automatically.
                                </p>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-slate-50 to-cyan-50/30 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <FileText className="w-5 h-5 text-cyan-600" />
                                    <h3 className="font-bold text-slate-900 text-sm">Update Content</h3>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    All text content lives in the component files under <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">src/</code>. Replace placeholder text with your own copy.
                                </p>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-slate-50 to-cyan-50/30 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <Smartphone className="w-5 h-5 text-cyan-600" />
                                    <h3 className="font-bold text-slate-900 text-sm">Add Sections</h3>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Each section is a standalone component. Duplicate, reorder, or remove sections from the main page file to fit your needs.
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Want More? Upsell Section */}
                    <Card className="p-8 md:p-10 shadow-lg bg-gradient-to-br from-[#0B1B3A] to-[#163058] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                        <div className="relative text-center space-y-4">
                            <h2 className="text-2xl md:text-3xl font-bold">Want Us to Build It For You?</h2>
                            <p className="text-slate-300 max-w-xl mx-auto">
                                Skip the DIY. Our team will customize this template with your brand, content, and copy — delivered launch-ready in days, not weeks.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                                <Link href="/quote">
                                    <Button variant="gradient" className="h-14 px-10 text-base font-bold">
                                        <Rocket className="w-5 h-5 mr-2" />
                                        Get a Custom Quote
                                    </Button>
                                </Link>
                                <Link href="/demos">
                                    <Button variant="ghost-light" className="h-14 px-10 text-base border border-white/20">
                                        See Our Work
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </Card>

                    <p className="text-xs text-slate-400 text-center pb-8">
                        Need help? Contact us at <a href={`mailto:${brand.email}`} className="text-cyan-500 hover:underline">{brand.email}</a>
                    </p>
                </div>
            </div>
        );
    }

    // Default project payment success (unchanged)
    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
            <div className="max-w-3xl mx-auto">
                <Card className="p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-cyan-500"></div>

                    <div className="bg-green-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>

                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Purchase Successful!</h1>
                    <p className="text-xl text-slate-600 mb-12 max-w-xl mx-auto">
                        Thank you for your purchase. We&rsquo;ve sent a confirmation email to your inbox with the download link for your template.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                            <div className="flex items-center mb-4 text-cyan-700 font-bold uppercase tracking-wider text-sm">
                                <Download className="w-4 h-4 mr-2" />
                                Next Steps
                            </div>
                            <ul className="space-y-3 text-slate-600 text-sm">
                                <li className="flex items-start">
                                    <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                                    Check your email for the zip file
                                </li>
                                <li className="flex items-start">
                                    <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                                    Follow the README to install dependencies
                                </li>
                                <li className="flex items-start">
                                    <span className="w-5 h-5 bg-cyan-100 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                                    Deploy to Vercel in seconds
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                            <div className="flex items-center mb-4 text-cyan-700 font-bold uppercase tracking-wider text-sm">
                                <Zap className="w-4 h-4 mr-2" />
                                Quick Support
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Need help setting up your template? Our team is available via email to ensure you get live fast.
                            </p>
                            <a href={`mailto:${brand.email}`} className="text-cyan-600 font-bold hover:underline inline-flex items-center text-sm">
                                {brand.email} <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/demos">
                            <Button variant="secondary" className="px-8 h-12">
                                Browse More Templates
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="primary" className="px-8 h-12">
                                Back to Home
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
