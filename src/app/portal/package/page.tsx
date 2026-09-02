'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePortalData } from '../PortalDataContext';
import { Select } from '@/components/ui';
import Link from 'next/link';

interface PlanInfo {
  id: string;
  name: string;
  basePrice: number;
  features: string[];
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  description: string;
}

const plans: PlanInfo[] = [
  {
    id: 'starter',
    name: 'Presence Page',
    basePrice: 2400,
    features: ['1 landing page (5-7 sections)', '6 revision rounds', 'StrataMetrics tracking', '7-10 day delivery'],
  },
  {
    id: 'growth',
    name: 'Lead Page',
    basePrice: 4800,
    features: ['Landing + thank-you page', 'Unlimited revisions', 'StrataMetrics tracking', 'Lead form integration', '10-14 day delivery'],
  },
  {
    id: 'scale',
    name: 'Purchase Page',
    basePrice: 9600,
    features: ['3-5 page conversion flow', 'Unlimited revisions', 'Payment integration', 'Funnel tracking', '14-21 day delivery'],
  },
];

const addOns: AddOn[] = [
  { id: 'copy', name: 'Copywriting', price: 500, description: 'Professional copy for all pages' },
  { id: 'rush', name: 'Rush Delivery', price: 750, description: 'Get your page in 5 days instead of 10' },
  { id: 'photos', name: 'Stock Photos', price: 200, description: 'Premium stock photos included' },
  { id: 'seo', name: 'SEO Setup', price: 400, description: 'On-page SEO optimization' },
];

const extraRoundsOptions = [
  { value: 'none', label: 'No extra rounds' },
  { value: 'rev-1', label: '+1 revision round — $150' },
  { value: 'rev-5', label: '+5 revision rounds — $500' },
] as const;

const extraRoundsPricing: Record<string, number> = {
  'none': 0, 'rev-1': 150, 'rev-5': 500,
};

const extendedOptions = [
  { value: 'none', label: 'No extension' },
  { value: 'ext-1mo', label: '+1 month post-launch — $300' },
  { value: 'ext-3mo', label: '+3 months post-launch — $750' },
  { value: 'ext-6mo', label: '+6 months post-launch — $1,200' },
  { value: 'ext-1yr', label: '+1 year post-launch — $2,000' },
] as const;

const extendedPricing: Record<string, number> = {
  'none': 0, 'ext-1mo': 300, 'ext-3mo': 750, 'ext-6mo': 1200, 'ext-1yr': 2000,
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

export default function PortalPackagePage() {
  const { client, projects } = usePortalData();
  const projectPackage = projects[0]?.package || 'growth';
  const currentPlan = plans.find((p) => p.id === projectPackage) || plans[1];
  // Phone-outreach leads shouldn't see pricing/add-ons before a proposal has been sent.
  const phoneLeadPreProposal = (projects || []).some((p) => (p as { source?: string }).source === 'phone')
    && (projects || []).filter((p) => (p as { source?: string }).source === 'phone')
      .every((p) => (((p as { status?: string }).status) || 'new') === 'new');

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedExtraRounds, setSelectedExtraRounds] = useState<string>('none');
  const [selectedExtended, setSelectedExtended] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);

  const addOnsTotal = selectedAddOns.reduce((sum, id) => {
    const addOn = addOns.find((a) => a.id === id);
    return sum + (addOn?.price || 0);
  }, 0);

  const extraRoundsPrice = extraRoundsPricing[selectedExtraRounds] || 0;
  const extendedPrice = extendedPricing[selectedExtended] || 0;
  const total = currentPlan.basePrice + addOnsTotal + extraRoundsPrice + extendedPrice;

  // Load saved customizations
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/portal/package-customizations');
        if (res.ok) {
          const data = await res.json();
          if (data.customizations) {
            setSelectedAddOns(data.customizations.addOns || []);
            setSelectedExtraRounds(data.customizations.extraRounds || 'none');
            setSelectedExtended(data.customizations.extendedSupport || 'none');
          }
        }
      } catch (err) {
        console.error('Failed to load customizations:', err);
      } finally {
        setLoading(false);
        // Allow auto-save after initial load settles
        setTimeout(() => { initialLoad.current = false; }, 500);
      }
    }
    load();
  }, []);

  // Auto-save with debounce
  const save = useCallback(async (addOnsList: string[], extraRounds: string, extended: string, totalEst: number) => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/portal/package-customizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addOns: addOnsList,
          extraRounds,
          extendedSupport: extended,
          totalEstimate: totalEst,
        }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }, []);

  // Trigger auto-save on changes (debounced)
  useEffect(() => {
    if (initialLoad.current || loading) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      save(selectedAddOns, selectedExtraRounds, selectedExtended, total);
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [selectedAddOns, selectedExtraRounds, selectedExtended, total, save, loading]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  if (!client || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">No project found.</p>
        <Link href="/portal" className="text-[var(--color-accent)] hover:underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Cold preview lead, no proposal yet → no pricing/add-ons. The proposal handles money.
  if (phoneLeadPreProposal) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <p className="text-[var(--text-primary)] font-semibold mb-1">Your package &amp; pricing come with your proposal.</p>
        <p className="text-[var(--text-muted)] text-sm mb-4">For now, have a look at your preview — I&apos;ll send over the full proposal with everything spelled out.</p>
        <Link href="/portal" className="text-[var(--color-accent)] hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[var(--text-muted)]">Loading package details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Your Package</h1>
            <p className="text-[var(--text-muted)]">Customize your package with add-ons and extras.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {saving && (
              <span className="text-[var(--text-muted)] flex items-center gap-1">
                <div className="w-3 h-3 border border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <motion.span
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-600 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </motion.span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-500 text-xs">Failed to save</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Current Plan (read-only) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Your Plan</h4>
        <div className="p-5 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-[var(--text-primary)]">{currentPlan.name}</span>
            <span className="text-xl font-bold text-[var(--color-accent)]">{formatPrice(currentPlan.basePrice)}</span>
          </div>
          <ul className="space-y-1">
            {currentPlan.features.map((f) => (
              <li key={f} className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* Add-ons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Add extras (optional)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addOns.map((addOn) => (
            <button
              key={addOn.id}
              onClick={() => toggleAddOn(addOn.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedAddOns.includes(addOn.id)
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                  : 'border-[var(--border)] hover:border-[var(--color-accent)]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-[var(--text-primary)] text-sm block">{addOn.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{addOn.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-accent)]">+{formatPrice(addOn.price)}</span>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedAddOns.includes(addOn.id)
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                      : 'border-gray-300'
                  }`}>
                    {selectedAddOns.includes(addOn.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Revision & Extended Support */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Revision add-ons (optional)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            options={extraRoundsOptions}
            value={selectedExtraRounds}
            onChange={(e) => setSelectedExtraRounds(e.target.value)}
            placeholder="Extra revision rounds"
          />
          <Select
            options={extendedOptions}
            value={selectedExtended}
            onChange={(e) => setSelectedExtended(e.target.value)}
            placeholder="Extended revisions"
          />
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 bg-[var(--surface)] rounded-xl border border-[var(--border)]"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--text-muted)]">Base package</span>
          <span className="font-medium text-[var(--text-primary)]">{formatPrice(currentPlan.basePrice)}</span>
        </div>
        {selectedAddOns.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text-muted)]">Add-ons ({selectedAddOns.length})</span>
            <span className="font-medium text-[var(--text-primary)]">{formatPrice(addOnsTotal)}</span>
          </div>
        )}
        {extraRoundsPrice > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text-muted)]">Extra rounds</span>
            <span className="font-medium text-[var(--text-primary)]">{formatPrice(extraRoundsPrice)}</span>
          </div>
        )}
        {extendedPrice > 0 && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text-muted)]">Extended revisions</span>
            <span className="font-medium text-[var(--text-primary)]">{formatPrice(extendedPrice)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-dashed border-[var(--border)]">
          <span className="font-semibold text-[var(--text-primary)]">Estimated Total</span>
          <motion.span
            key={total}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-[var(--color-accent)]"
          >
            {formatPrice(total)}
          </motion.span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          50% deposit to start, 50% before launch. Final pricing confirmed in your proposal. Changes are saved automatically.
        </p>
      </motion.div>
    </div>
  );
}
