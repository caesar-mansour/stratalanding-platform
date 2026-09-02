'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { packagePricing, formatPrice } from '@/lib/types';
import { SpotlightCard, NumberTicker, Pressable } from '@/app/admin/_components/motion';
import { toast } from '@/app/admin/_components/Toaster';

const PACKAGE_META: { key: 'starter' | 'growth' | 'scale'; name: string }[] = [
  { key: 'starter', name: 'Starter' },
  { key: 'growth', name: 'Growth' },
  { key: 'scale', name: 'Scale' },
];

interface EligibleProject {
  id: string;
  status: string;
  package: string;
  created_at: string;
}

interface ClientWithoutProposal {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  projects: EligibleProject[];
}

interface NewProposalFormProps {
  clientsWithoutProposals: ClientWithoutProposal[];
}

export default function NewProposalForm({ clientsWithoutProposals }: NewProposalFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'starter' | 'growth' | 'scale'>('starter');

  // Email autocomplete state
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithoutProposal | null>(null);
  // GATE 8 (2026-08-12): a proposal with no linked project cannot be paid — create-payment rejects
  // it with "No project linked to this proposal". Empty string means "let the server resolve it",
  // which only succeeds when exactly one eligible project matches the client.
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter clients based on input
  const filteredClients = clientsWithoutProposals.filter(client =>
    client.email.toLowerCase().includes(emailInput.toLowerCase()) ||
    client.name.toLowerCase().includes(emailInput.toLowerCase()) ||
    (client.company_name && client.company_name.toLowerCase().includes(emailInput.toLowerCase()))
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectClient = (client: ClientWithoutProposal) => {
    setSelectedClient(client);
    setEmailInput(client.email);
    setNameInput(client.name);
    setCompanyInput(client.company_name || '');
    setShowDropdown(false);
    // Preselect when there is exactly one eligible project; otherwise force an explicit choice.
    setSelectedProjectId(client.projects.length === 1 ? client.projects[0].id : '');
  };

  // Default exclusions text
  const defaultExclusions = `Marketing strategy, positioning, or funnel planning
Ad copy, email sequences, or campaign management
Ongoing CRO or A/B testing
Subscription billing or full e-commerce functionality
Retainer or ongoing maintenance`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Build proposal_sections from form fields
    const opener = (formData.get('section_opener') as string)?.trim() || undefined;
    const understanding = (formData.get('section_understanding') as string)?.trim() || undefined;
    const tier_reasoning = (formData.get('section_tier_reasoning') as string)?.trim() || undefined;
    const exclusions = (formData.get('section_exclusions') as string)?.trim() || undefined;
    const timeline_notes = (formData.get('section_timeline_notes') as string)?.trim() || undefined;

    const hasAnySections = opener || understanding || tier_reasoning || exclusions || timeline_notes;

    const data = {
      client_name: formData.get('client_name') as string,
      client_email: formData.get('client_email') as string,
      company_name: formData.get('company_name') as string,
      package: formData.get('package') as string,
      // GATE 8: empty means "resolve server-side", which only succeeds when exactly one eligible
      // project matches. The server re-validates ownership regardless of what is sent here.
      project_id: (formData.get('project_id') as string) || null,
      custom_price_cents: useCustomPrice
        ? Math.round(parseFloat(formData.get('custom_price') as string) * 100)
        : null,
      notes: formData.get('notes') as string || null,
      proposal_sections: hasAnySections ? { opener, understanding, tier_reasoning, exclusions, timeline_notes } : null,
      valid_days: parseInt(formData.get('valid_days') as string),
      deposit_payment_url: formData.get('deposit_payment_url') as string || null,
    };

    try {
      const response = await fetch('/api/admin/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create proposal');
      }

      toast.success('Proposal created', 'Redirecting to proposals…');
      router.push('/admin/proposals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const standardPrice = packagePricing[selectedPackage];

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="bg-surface rounded-[var(--radius-lg)] border border-border p-6 space-y-6 shadow-[var(--shadow-sm)]">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Client Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary border-b border-border pb-2">
          Client Information
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-text-muted mb-1">
              Client Name *
            </label>
            <input
              type="text"
              id="client_name"
              name="client_name"
              required
              placeholder="John Smith"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
          <div className="relative" ref={dropdownRef}>
            <label htmlFor="client_email" className="block text-sm font-medium text-text-muted mb-1">
              Client Email *
            </label>
            <input
              type="email"
              id="client_email"
              name="client_email"
              required
              placeholder="john@company.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setSelectedClient(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              autoComplete="nope"
              autoCorrect="off"
              spellCheck="false"
              data-lpignore="true"
              data-form-type="other"
              data-1p-ignore
              className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            {showDropdown && filteredClients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-[var(--radius-md)] shadow-lg max-h-60 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-medium text-text-muted bg-gray-50 border-b border-border">
                  Clients without proposals
                </div>
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className="w-full px-3 py-2 text-left hover:bg-background transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="text-sm font-medium text-text-primary">{client.email}</div>
                    <div className="text-xs text-text-muted">
                      {client.name}{client.company_name ? ` • ${client.company_name}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="company_name" className="block text-sm font-medium text-text-muted mb-1">
            Company Name *
          </label>
          <input
            type="text"
            id="company_name"
            name="company_name"
            required
            placeholder="Acme Inc"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        {/* GATE 8 (2026-08-12): without a linked project the proposal cannot be paid — the deposit
            endpoint rejects it outright. Shown once a known client is selected. */}
        {selectedClient && (
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-text-muted mb-1">
              Project {selectedClient.projects.length > 1 && <span className="text-accent">*</span>}
            </label>
            {selectedClient.projects.length === 0 ? (
              <p className="text-sm text-red-600">
                This client has no project awaiting a deposit. Create the project first — a proposal
                without one cannot be paid.
              </p>
            ) : (
              <>
                <select
                  id="project_id"
                  name="project_id"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required={selectedClient.projects.length > 1}
                  className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  {selectedClient.projects.length > 1 && <option value="">Select a project…</option>}
                  {selectedClient.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.package} · {p.status} · {new Date(p.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {selectedClient.projects.length > 1 && (
                  <p className="text-xs text-text-muted mt-1">
                    This client has {selectedClient.projects.length} projects awaiting a deposit —
                    pick the right one. The server will not guess.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Package & Pricing */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary border-b border-border pb-2">
          Package & Pricing
        </h3>

        <div>
          <label className="block text-sm font-medium text-text-muted mb-1">
            Package *
          </label>
          {/* Hidden input keeps the form value wiring intact */}
          <input type="hidden" id="package" name="package" value={selectedPackage} required />
          <div className="grid grid-cols-3 gap-3">
            {PACKAGE_META.map(({ key, name }) => {
              const selected = selectedPackage === key;
              return (
                <SpotlightCard
                  key={key}
                  onClick={() => setSelectedPackage(key)}
                  padded
                  hover
                  className={`relative text-left transition-colors ${selected ? 'ring-1 ring-accent' : ''}`}
                >
                  {selected && (
                    <motion.span
                      layoutId="proposal-package-ring"
                      className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] ring-2 ring-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative block">
                    <span className={`block text-sm font-semibold ${selected ? 'text-accent' : 'text-text-primary'}`}>
                      {name}
                    </span>
                    <span className="block text-xs text-text-muted mt-0.5">
                      {formatPrice(packagePricing[key])}
                    </span>
                  </span>
                </SpotlightCard>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use_custom_price"
            checked={useCustomPrice}
            onChange={(e) => setUseCustomPrice(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent"
          />
          <label htmlFor="use_custom_price" className="text-sm text-text-muted">
            Use custom pricing
          </label>
        </div>

        {useCustomPrice ? (
          <div>
            <label htmlFor="custom_price" className="block text-sm font-medium text-text-muted mb-1">
              Custom Price (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">$</span>
              <input
                type="number"
                id="custom_price"
                name="custom_price"
                required={useCustomPrice}
                min="100"
                step="0.01"
                placeholder="2400"
                className="w-full pl-8 pr-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>
            <p className="text-xs text-text-muted mt-1">
              Standard price for {selectedPackage}: {formatPrice(standardPrice)}
            </p>
          </div>
        ) : (
          <div className="p-4 bg-background rounded-[var(--radius-md)]">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">Total Price</span>
              <NumberTicker
                value={standardPrice / 100}
                format="currency"
                className="text-lg font-semibold text-text-primary"
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-text-muted">Deposit (50%)</span>
              <NumberTicker
                value={standardPrice / 2 / 100}
                format="currency"
                className="text-sm font-medium text-text-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Proposal Content (from PROPOSAL-TEMPLATE.md) */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary border-b border-border pb-2">
          Proposal Content
          <span className="text-xs font-normal text-text-muted ml-2">(personalizes the client-facing proposal page)</span>
        </h3>

        <div>
          <label htmlFor="section_opener" className="block text-sm font-medium text-text-muted mb-1">
            Personalized Opener
          </label>
          <textarea
            id="section_opener"
            name="section_opener"
            rows={2}
            placeholder='e.g., "You&#39;re launching a new coaching program and need a page that turns ad traffic into booked calls. Here&#39;s how we&#39;d build that."'
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none text-sm"
          />
          <p className="text-xs text-text-muted mt-1">1-2 sentences referencing their specific business, goal, or problem from the brief.</p>
        </div>

        <div>
          <label htmlFor="section_understanding" className="block text-sm font-medium text-text-muted mb-1">
            What We Understood
          </label>
          <textarea
            id="section_understanding"
            name="section_understanding"
            rows={4}
            placeholder={`Business: Acme Inc — SaaS startup building project management tools\nGoal: Capture leads for beta waitlist\nAudience: Small business owners and freelancers\nConstraint: Launching ad campaign March 1`}
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none text-sm"
          />
          <p className="text-xs text-text-muted mt-1">One line per point: Business, Goal, Audience, Key constraint. Pulled from their brief.</p>
        </div>

        <div>
          <label htmlFor="section_tier_reasoning" className="block text-sm font-medium text-text-muted mb-1">
            Why This Tier
          </label>
          <textarea
            id="section_tier_reasoning"
            name="section_tier_reasoning"
            rows={2}
            placeholder='e.g., "A single page with form integration is the right scope for a beta launch. No checkout flow needed yet, so the Presence tier covers everything."'
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none text-sm"
          />
          <p className="text-xs text-text-muted mt-1">1-2 sentences explaining why this package fits their project specifically.</p>
        </div>

        <div>
          <label htmlFor="section_exclusions" className="block text-sm font-medium text-text-muted mb-1">
            What&apos;s Not Included
          </label>
          <textarea
            id="section_exclusions"
            name="section_exclusions"
            rows={5}
            defaultValue={defaultExclusions}
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none text-sm"
          />
          <p className="text-xs text-text-muted mt-1">One exclusion per line. Pre-filled with standard exclusions — edit as needed.</p>
        </div>

        <div>
          <label htmlFor="section_timeline_notes" className="block text-sm font-medium text-text-muted mb-1">
            Timeline Milestones
          </label>
          <textarea
            id="section_timeline_notes"
            name="section_timeline_notes"
            rows={5}
            placeholder={`Day 1: Kickoff (assets + access received)\nDay 3: Wireframe & structure review\nDay 7: First full draft (design + copy)\nDay 8-10: Revision rounds\nDay 10: Final delivery + deployment`}
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none text-sm"
          />
          <p className="text-xs text-text-muted mt-1">One milestone per line. Adjust days based on package and client timeline.</p>
        </div>
      </div>

      {/* Proposal Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary border-b border-border pb-2">
          Proposal Details
        </h3>

        <div>
          <label htmlFor="valid_days" className="block text-sm font-medium text-text-muted mb-1">
            Valid For *
          </label>
          <select
            id="valid_days"
            name="valid_days"
            required
            defaultValue="7"
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            <option value="3">3 days</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-text-muted mb-1">
            Notes for Client (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Any special notes or details for this proposal..."
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
          />
        </div>

        <div>
          <label htmlFor="deposit_payment_url" className="block text-sm font-medium text-text-muted mb-1">
            Deposit Payment URL (PayPal) - optional
          </label>
          <input
            type="url"
            id="deposit_payment_url"
            name="deposit_payment_url"
            placeholder="https://www.paypal.com/paypalme/..."
            className="w-full px-4 py-2 border border-border rounded-[var(--radius-md)] bg-surface text-text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <p className="text-xs text-text-muted mt-1">
            You can add this later from the proposals list
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4 border-t border-border">
        <Pressable
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
        >
          {isSubmitting ? 'Creating...' : 'Create Proposal'}
        </Pressable>
      </div>
    </form>
  );
}
