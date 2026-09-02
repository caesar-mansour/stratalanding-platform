"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Package, Trash2, Download, RefreshCw, Wand2, Zap } from "lucide-react";
import { Pressable, NumberTicker } from "@/app/admin/_components/motion";
import { toast } from "@/app/admin/_components/Toaster";
import { confirmDialog } from "@/app/admin/_components/ConfirmDialog";

interface TemplateFile {
  id: string;
  template_id: string;
  plan: string;
  display_name: string;
  storage_key: string;
  file_size: number;
  version: number;
  active: boolean;
  created_at: string;
}

interface Purchase {
  id: string;
  buyer_email: string;
  buyer_name: string;
  template_id: string;
  plan: string;
  amount_cents: number;
  download_count: number;
  display_name: string;
  created_at: string;
  account_type: string | null;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateFile[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [plan, setPlan] = useState("presence-page");
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Generate from demo
  const [genSlug, setGenSlug] = useState("");
  const [genPlan, setGenPlan] = useState("presence-page");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  // Bulk generate
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ total: number; generated: number; skipped: number; failed: number } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setPurchases(data.purchases || []);
      }
    } catch (e) {
      console.error("Failed to load templates:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !templateId || !displayName) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("templateId", templateId);
    formData.append("plan", plan);
    formData.append("displayName", displayName);

    try {
      const res = await fetch("/api/admin/templates", { method: "POST", body: formData });
      if (res.ok) {
        setFile(null);
        setTemplateId("");
        setDisplayName("");
        toast.success("Template uploaded");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
        toast.error("Upload failed", err.error || undefined);
      }
    } catch {
      alert("Upload failed");
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSlug) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/admin/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoSlug: genSlug, plan: genPlan }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenResult(`Generated ${data.displayName} (${formatBytes(data.fileSize)})`);
        setGenSlug("");
        toast.success("Template generated", data.displayName);
        fetchData();
      } else {
        setGenResult(`Error: ${data.error}`);
        toast.error("Generation failed", data.error || undefined);
      }
    } catch {
      setGenResult("Error: Failed to generate");
      toast.error("Generation failed");
    }
    setGenerating(false);
  };

  const handleBulkGenerate = async () => {
    if (!(await confirmDialog({ title: "Generate zips for ALL demos?", message: "This will take a few minutes.", confirmLabel: "Generate all" })).confirmed) return;
    setBulkGenerating(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/templates/generate-all", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBulkResult({ total: data.total, generated: data.generated, skipped: data.skipped, failed: data.failed });
        toast.success("Bulk generation complete", `${data.generated} generated, ${data.skipped} skipped`);
        fetchData();
      } else {
        alert(data.error || "Bulk generation failed");
        toast.error("Bulk generation failed", data.error || undefined);
      }
    } catch {
      alert("Bulk generation failed");
      toast.error("Bulk generation failed");
    }
    setBulkGenerating(false);
  };

  const handleDeactivate = async (tid: string) => {
    if (!(await confirmDialog({ title: `Deactivate template "${tid}"?`, message: "Clients will no longer be able to use this template.", confirmLabel: "Deactivate", tone: "danger" })).confirmed) return;
    try {
      const res = await fetch("/api/admin/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: tid }),
      });
      if (!res.ok) throw new Error();
      toast.success("Template deactivated");
    } catch {
      toast.error("Something went wrong");
    }
    fetchData();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Template Management</h1>
        <button onClick={fetchData} className="p-2 text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Bulk Generate All */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" /> Bulk Generate All Templates
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Auto-generate downloadable zips for all 793 demo pages. Skips already-generated templates.
            </p>
          </div>
          <button
            onClick={handleBulkGenerate}
            disabled={bulkGenerating}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-2 shrink-0"
          >
            <Zap className="w-4 h-4" />
            {bulkGenerating ? "Generating..." : "Generate All"}
          </button>
        </div>
        {bulkGenerating && (
          <div className="mt-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-indigo-700 font-medium">Processing all demos... this may take a few minutes.</p>
          </div>
        )}
        {bulkResult && (
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <NumberTicker value={bulkResult.total} className="block text-2xl font-bold text-slate-900" />
              <div className="text-xs text-slate-500">Total Demos</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <NumberTicker value={bulkResult.generated} className="block text-2xl font-bold text-green-600" />
              <div className="text-xs text-slate-500">Generated</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <NumberTicker value={bulkResult.skipped} className="block text-2xl font-bold text-blue-600" />
              <div className="text-xs text-slate-500">Skipped (existing)</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <NumberTicker value={bulkResult.failed} className="block text-2xl font-bold text-red-600" />
              <div className="text-xs text-slate-500">Failed</div>
            </div>
          </div>
        )}
      </div>

      {/* Generate from Demo */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Wand2 className="w-5 h-5" /> Generate Single Template
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Package a specific demo page into a downloadable Next.js project zip.
        </p>
        <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Demo Slug</label>
            <input
              type="text"
              value={genSlug}
              onChange={(e) => setGenSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. accountant"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Plan Tier</label>
            <select
              value={genPlan}
              onChange={(e) => setGenPlan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="presence-page">Presence Page</option>
              <option value="lead-page">Lead Page</option>
              <option value="purchase-page">Purchase Page</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={generating}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            {generating ? "Generating..." : "Generate Zip"}
          </button>
        </form>
        {genResult && (
          <p className={`mt-3 text-sm font-medium ${genResult.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
            {genResult}
          </p>
        )}
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" /> Upload Template
        </h2>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template ID</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="e.g. presence-starter"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Presence Page Starter"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="presence-page">Presence Page</option>
              <option value="lead-page">Lead Page</option>
              <option value="purchase-page">Purchase Page</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ZIP File</label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              required
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors text-sm"
            >
              {uploading ? "Uploading..." : "Upload Template"}
            </button>
          </div>
        </form>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> Templates ({templates.length})
        </h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : templates.length === 0 ? (
          <p className="text-slate-500 text-sm">No templates uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-left">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Template ID</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Size</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    className="border-b border-slate-50"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <td className="py-3 font-medium text-slate-900">{t.display_name}</td>
                    <td className="py-3 text-slate-600">{t.template_id}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{t.plan}</span>
                    </td>
                    <td className="py-3 text-slate-600">{formatBytes(t.file_size)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      {t.active && (
                        <Pressable
                          onClick={() => handleDeactivate(t.template_id)}
                          className="text-red-500 hover:text-red-700 p-1 inline-flex"
                          title="Deactivate"
                          ariaLabel="Deactivate template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Pressable>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Purchases */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" /> Recent Purchases ({purchases.length})
        </h2>
        {purchases.length === 0 ? (
          <p className="text-slate-500 text-sm">No purchases yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-left">
                  <th className="pb-2 font-medium">Buyer</th>
                  <th className="pb-2 font-medium">Template</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Downloads</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    className="border-b border-slate-50"
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.35, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <td className="py-3">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {p.buyer_name}
                        {p.account_type === 'template_buyer' && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold uppercase">Template Buyer</span>
                        )}
                        {!p.account_type && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-semibold uppercase">No Account</span>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs">{p.buyer_email}</div>
                    </td>
                    <td className="py-3 text-slate-600">{p.display_name || p.template_id}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{p.plan}</span>
                    </td>
                    <td className="py-3 text-slate-900 font-medium">
                      <NumberTicker value={p.amount_cents / 100} format="currency" />
                    </td>
                    <td className="py-3 text-slate-600">{p.download_count}×</td>
                    <td className="py-3 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
