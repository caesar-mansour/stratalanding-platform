import sql from '@/lib/db';
import { pricing } from '@/lib/brand';
import { proposalPublicUrl } from '@/lib/proposal-token';
import { packagePricing, type PackageType, type ProposalSections, calculateTotalCents } from '@/lib/types';

const packageIndex: Record<PackageType, number> = { starter: 0, growth: 1, scale: 2 };

const packageGoals: Record<PackageType, string> = {
  starter: 'establish a strong online presence and build credibility',
  growth: 'capture qualified leads with a conversion-optimized landing page',
  scale: 'build a complete conversion flow that turns visitors into paying customers',
};

const tierExclusions: Record<PackageType, string> = {
  starter: [
    'Thank-you page or secondary pages',
    'Form integrations or CRM connections',
    'Event tracking beyond page views',
    'Payment integration',
    'Post-launch support (available as add-on)',
  ].join('\n'),
  growth: [
    'Multi-page conversion flows (3+ pages)',
    'Payment or checkout integration',
    'Webhook/automation setup',
    'Post-launch support (available as add-on)',
  ].join('\n'),
  scale: [
    'Ongoing content updates after the 14-day support window',
    'Ad campaign management or media buying',
    'Backend application development',
    'Hosting or domain management',
  ].join('\n'),
};

export function generateProposalSections(data: {
  clientName: string;
  companyName: string;
  industry: string;
  packageType: PackageType;
  notes?: string | null;
}): ProposalSections {
  const pkg = pricing[packageIndex[data.packageType]];
  const topFeatures = pkg.features.slice(0, 3).join(', ');
  const notesSnippet = data.notes
    ? ` You mentioned: "${data.notes.slice(0, 150).trim()}${data.notes.length > 150 ? '...' : ''}"`
    : '';

  return {
    opener: `Hi ${data.clientName}, thank you for sharing your vision for ${data.companyName}. We're excited to help you build a high-performance landing page tailored to the ${data.industry} space.`,

    understanding: `${data.companyName} operates in the ${data.industry} industry and is looking to ${packageGoals[data.packageType]}. You selected the ${pkg.name} package (${pkg.price}).${notesSnippet}`,

    tier_reasoning: `The ${pkg.name} is designed for ${pkg.bestFor} This package includes: ${topFeatures}. Everything is fixed-scope and fixed-price — no surprises.`,

    exclusions: tierExclusions[data.packageType],

    timeline_notes: `Estimated delivery: ${pkg.delivery}. The timeline starts once you accept the proposal and pay the 50% deposit. You'll review at two checkpoints (wireframe and full build) before anything goes live.`,
  };
}

export async function createAndInsertProposal(data: {
  projectId: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  industry: string;
  packageType: PackageType;
  notes?: string | null;
  customizations?: { addOns: string[]; extraRounds: string; extendedSupport: string; totalEstimate: number } | null;
  status: 'draft' | 'sent';
}) {
  const sections = generateProposalSections(data);

  const proposalNote = `Thank you for your interest, ${data.clientName}! We've reviewed your brief for ${data.companyName} and put together this proposal based on your requirements. Everything is fixed-scope and fixed-price — no surprises. Once you accept and pay the deposit, we'll get started right away. You'll have direct chat access to our team through your client portal.`;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);

  const totalCents = data.customizations
    ? calculateTotalCents(data.packageType, data.customizations)
    : packagePricing[data.packageType];
  const customPriceCents = data.customizations ? totalCents : null;

  const [proposal] = await sql`
    INSERT INTO proposals (
      client_name, client_email, company_name, package,
      custom_price_cents, notes, proposal_sections,
      valid_until, status, project_id
    ) VALUES (
      ${data.clientName}, ${data.clientEmail}, ${data.companyName},
      ${data.packageType}, ${customPriceCents}, ${proposalNote},
      ${JSON.stringify(sections)},
      ${validUntil.toISOString()}, ${data.status}, ${data.projectId}
    ) RETURNING *
  `;

  if (!proposal) throw new Error('Proposal creation failed');

  // AUDIT 2026-08-12 (P0-2): do NOT write the proposal page URL into `deposit_payment_url`.
  // That column means "an EXTERNAL payment link" to /api/proposals/[id]/create-payment, which
  // short-circuits and returns it as the PayPal approval URL. Overloading it with the proposal's
  // own URL turned "Accept & Pay Deposit" into a page reload, so no deposit could ever be taken.
  // The emailed proposal link is computed on the fly by callers via proposalPublicUrl().
  return proposal;
}
