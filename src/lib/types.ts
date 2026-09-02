// Database types for StrataLanding

export type PackageType = 'starter' | 'growth' | 'scale';
export type TimelineType = 'asap' | 'this_month' | 'next_month' | 'no_rush';
export type ProjectStatus =
  | 'new'
  | 'proposal_sent'
  | 'deposit_paid'
  | 'in_production'
  | 'ready_for_final_payment'
  | 'paid_in_full'
  | 'launched'
  | 'not_interested';
export type PaymentType = 'deposit' | 'final';
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired';

export interface Client {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface PackageCustomizations {
  addOns: string[];
  extraRounds: string;
  extendedSupport: string;
  totalEstimate: number;
  updatedAt?: string;
}

export interface Project {
  id: string;
  client_id: string;
  package: PackageType;
  timeline: TimelineType;
  status: ProjectStatus;
  deposit_payment_url: string | null;
  final_payment_url: string | null;
  preview_url: string | null;
  site_id: string | null;
  admin_notes: string | null;
  source?: 'brief' | 'quote' | 'phone';
  preview_approved_at?: string | null;
  launched_at: string | null;
  package_customizations: PackageCustomizations | null;
  created_at: string;
  updated_at: string;
}

// Pricing constants for add-ons (in cents)
export const addOnPricing: Record<string, { label: string; priceCents: number }> = {
  copy: { label: 'Copywriting', priceCents: 50000 },
  rush: { label: 'Rush Delivery', priceCents: 75000 },
  photos: { label: 'Stock Photos', priceCents: 20000 },
  seo: { label: 'SEO Setup', priceCents: 40000 },
};

export const extraRoundsPricing: Record<string, { label: string; priceCents: number }> = {
  none: { label: 'No extra rounds', priceCents: 0 },
  'rev-1': { label: '+1 revision round', priceCents: 15000 },
  'rev-5': { label: '+5 revision rounds', priceCents: 50000 },
};

export const extendedSupportPricing: Record<string, { label: string; priceCents: number }> = {
  none: { label: 'No extension', priceCents: 0 },
  'ext-1mo': { label: '+1 month post-launch', priceCents: 30000 },
  'ext-3mo': { label: '+3 months post-launch', priceCents: 75000 },
  'ext-6mo': { label: '+6 months post-launch', priceCents: 120000 },
  'ext-1yr': { label: '+1 year post-launch', priceCents: 200000 },
};

export function calculateTotalCents(packageType: PackageType, customizations?: PackageCustomizations | null): number {
  let total = packagePricing[packageType];
  if (!customizations) return total;
  const addOns = Array.isArray(customizations.addOns) ? customizations.addOns : [];
  for (const addOn of addOns) {
    total += addOnPricing[addOn]?.priceCents || 0;
  }
  total += extraRoundsPricing[customizations.extraRounds]?.priceCents || 0;
  total += extendedSupportPricing[customizations.extendedSupport]?.priceCents || 0;
  return total;
}

export interface BriefSubmission {
  id: string;
  project_id: string;
  company_name: string;
  website: string | null;
  industry: string;
  primary_goal: string;
  audience: string;
  pain_points: string | null;
  challenge: string | null;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  type: PaymentType;
  amount_cents: number;
  currency: string;
  paypal_event_id: string | null;
  paypal_payment_status: string | null;
  paypal_capture_id: string | null;
  created_at: string;
}

export interface ProposalSections {
  opener?: string;        // Personalized 1-2 sentence opener
  understanding?: string; // What we understood (business, goal, audience, constraint)
  tier_reasoning?: string; // Why this tier fits their project
  exclusions?: string;    // What's NOT included (scope boundaries)
  timeline_notes?: string; // Custom timeline milestones
}

export interface Proposal {
  id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  package: PackageType;
  custom_price_cents: number | null; // If null, use standard package price
  notes: string | null;
  proposal_sections: ProposalSections | null;
  valid_until: string;
  status: ProposalStatus;
  deposit_payment_url: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  project_id: string | null; // Created when accepted
  created_at: string;
  updated_at: string;
}

export type UploadCategory = 'logo' | 'brand' | 'photos' | 'content' | 'other';

export interface ProjectUpload {
  id: string;
  project_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  category: UploadCategory;
  created_at: string;
}

export interface BannedEmail {
  id: string;
  email: string;
  reason: string | null;
  created_at: string;
}

export interface RevisionMessage {
  id: string;
  project_id: string;
  sender_type: 'client' | 'admin' | 'ai';
  message: string;
  created_at: string;
}

export interface Mistake {
  id: string;
  project_id: string;
  description: string;
  status: 'open' | 'investigating' | 'fixed' | 'dismissed';
  source: 'ai' | 'client' | 'admin';
  message_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'normal' | 'high';
  source: 'ai' | 'admin';
  message_id: string | null;
  created_at: string;
  updated_at: string;
}

export type MilestoneType =
  | 'brief_received'
  | 'research_complete'
  | 'wireframe_sent'
  | 'wireframe_approved'
  | 'build_complete'
  | 'final_review_sent'
  | 'final_review_approved'
  | 'launched';

export interface ProjectMilestone {
  id: string;
  project_id: string;
  milestone_type: MilestoneType;
  status: 'pending' | 'in_progress' | 'completed';
  notes: string | null;
  requires_approval: boolean;
  client_approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const milestoneLabels: Record<MilestoneType, { label: string; description: string }> = {
  brief_received: { label: 'Brief Received', description: 'Client brief submitted and reviewed' },
  research_complete: { label: 'Research Complete', description: 'Industry, competitor, and audience research done' },
  wireframe_sent: { label: 'Wireframe Sent', description: 'Page structure and messaging sent for review' },
  wireframe_approved: { label: 'Wireframe Approved', description: 'Client approved wireframe and messaging' },
  build_complete: { label: 'Build Complete', description: 'Full design, code, and integrations built' },
  final_review_sent: { label: 'Final Review Sent', description: 'Complete preview sent for client approval' },
  final_review_approved: { label: 'Final Review Approved', description: 'Client approved final build for launch' },
  launched: { label: 'Launched', description: 'Page deployed and live' },
};

export const approvalMilestones: MilestoneType[] = ['wireframe_approved', 'final_review_approved'];

export interface OnboardingSession {
  id: string;
  project_id: string;
  status: 'in_progress' | 'completed';
  current_question: number;
  summary: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface OnboardingMessage {
  id: string;
  session_id: string;
  role: 'ai' | 'client';
  message: string;
  question_number: number | null;
  created_at: string;
}

export interface PriceOverride {
  id: string;
  project_id: string;
  requested_by: string;
  original_cents: number;
  override_cents: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

// Extended types with relations
export interface ProjectWithDetails extends Project {
  client: Client;
  brief: BriefSubmission | null;
  payments: Payment[];
}

// Form submission type (matches brief form data)
export interface BriefFormData {
  // Business step
  companyName: string;
  website: string;
  industry: string;
  // Goals step
  primaryGoal: string;
  challenge: string;
  // Audience step
  audience: string;
  painPoints: string;
  // Project step
  budget: string; // Maps to package
  timeline: string;
  name: string;
  email: string;
  notes: string;
}

// Mapping from form budget to package type
export const budgetToPackage: Record<string, PackageType> = {
  'Presence Page ($2,400)': 'starter',
  'Lead Page ($4,800)': 'growth',
  'Purchase Page ($9,600)': 'scale',
  'Not sure yet': 'starter', // Default to starter for undecided
};

// Mapping from form timeline to timeline type
export const formTimelineToType: Record<string, TimelineType> = {
  'ASAP (within 2 weeks)': 'asap',
  'This month': 'this_month',
  'Next month': 'next_month',
  'No rush': 'no_rush',
};

// Package pricing in cents
export const packagePricing: Record<PackageType, number> = {
  starter: 240000, // $2,400
  growth: 480000,  // $4,800
  scale: 960000,   // $9,600
};

// Status display info
export interface StatusInfo {
  label: string;
  description: string;
  nextAction: string | null;
  showDepositLink: boolean;
  showFinalLink: boolean;
}

export const statusInfo: Record<ProjectStatus, StatusInfo> = {
  new: {
    label: 'Brief Received',
    description: 'We have received your project brief and are reviewing it.',
    nextAction: 'We will send you a proposal within 24 hours.',
    showDepositLink: false,
    showFinalLink: false,
  },
  proposal_sent: {
    label: 'Proposal Sent',
    description: 'Your custom proposal has been sent to your email.',
    nextAction: 'Pay the 50% deposit to start your project.',
    showDepositLink: true,
    showFinalLink: false,
  },
  deposit_paid: {
    label: 'Deposit Paid',
    description: 'Thank you! Your deposit has been received.',
    nextAction: 'Your project is being prepared for production.',
    showDepositLink: false,
    showFinalLink: false,
  },
  in_production: {
    label: 'In Production',
    description: 'Your landing page is being designed and developed.',
    nextAction: 'We will notify you when checkpoints are ready for review.',
    showDepositLink: false,
    showFinalLink: false,
  },
  ready_for_final_payment: {
    label: 'Ready for Final Payment',
    description: 'Your project is complete and ready for launch!',
    nextAction: 'Pay the remaining 50% to proceed with launch/handoff.',
    showDepositLink: false,
    showFinalLink: true,
  },
  paid_in_full: {
    label: 'Paid in Full',
    description: 'Payment complete. Your project is ready for launch!',
    nextAction: 'Launch/handoff will be scheduled within 24-48 hours.',
    showDepositLink: false,
    showFinalLink: false,
  },
  launched: {
    label: 'Launched',
    description: 'Your landing page is live! Thank you for working with us.',
    nextAction: null,
    showDepositLink: false,
    showFinalLink: false,
  },
  not_interested: {
    label: 'Not Interested',
    description: 'This project has been marked as not interested.',
    nextAction: null,
    showDepositLink: false,
    showFinalLink: false,
  },
};

// StrataMetrics Analytics Types
export interface StrataEvent {
  id: string;
  site_id: string;
  session_id: string;
  event_type: string;
  url: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  props: Record<string, unknown>;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  screen_width: number | null;
  screen_height: number | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
  created_at: string;
}

export interface StrataSession {
  id: string;
  site_id: string;
  started_at: string;
  last_seen_at: string;
  entry_page: string;
  exit_page: string | null;
  pageview_count: number;
  event_count: number;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  device_type: string | null;
  device_model: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
  is_bounce: boolean;
  duration_seconds: number;
  created_at: string;
}

// Package display labels
export const packageLabels: Record<PackageType, string> = {
  starter: 'Presence Page',
  growth: 'Lead Page',
  scale: 'Purchase Page',
};

// Get price for package (custom or standard)
export function getProposalPrice(proposal: Proposal): number {
  return proposal.custom_price_cents ?? packagePricing[proposal.package];
}

// Format cents to dollars
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}
