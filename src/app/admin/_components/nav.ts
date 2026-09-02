// Admin command-palette / navigation route registry.
// Data only — NO JSX. Consumed by CommandPalette.tsx (and any future nav surface).
//
// Routes are derived from AdminSidebar.tsx nav items PLUS every folder under
// src/app/admin/ that contains a page.tsx. Keep this in sync when adding routes.

export type AdminNavItem = {
  /** Absolute admin route, e.g. "/admin/proposals". */
  href: string;
  /** Human label shown in the palette. */
  label: string;
  /** Group heading used to bucket results, e.g. "Pipeline". */
  group: string;
  /** Extra search terms (synonyms, aliases) for the fuzzy matcher. */
  keywords?: string[];
};

export const ADMIN_NAV: AdminNavItem[] = [
  // ── Overview ────────────────────────────────────────────────
  {
    href: '/admin',
    label: 'Dashboard',
    group: 'Overview',
    keywords: ['home', 'overview', 'projects', 'console', 'start'],
  },

  // ── Pipeline ────────────────────────────────────────────────
  {
    href: '/admin/briefs',
    label: 'Briefs',
    group: 'Pipeline',
    keywords: ['lead', 'leads', 'intake', 'inbound', 'new', 'warm'],
  },
  {
    href: '/admin/quotes',
    label: 'Quotes',
    group: 'Pipeline',
    keywords: ['estimate', 'pricing request', 'quote requests'],
  },
  {
    href: '/admin/preview-links',
    label: 'Phone Leads',
    group: 'Pipeline',
    keywords: ['preview', 'preview links', 'phone', 'cold call', 'spec', 'tokens'],
  },
  {
    href: '/admin/outreach-clients',
    label: 'Outreach',
    group: 'Pipeline',
    keywords: ['cold email', 'campaign', 'prospects', 'outbound', 'outreach clients'],
  },
  {
    href: '/admin/outreach',
    label: 'Outreach Queue',
    group: 'Pipeline',
    keywords: ['queue', 'sends', 'drafts', 'campaign queue', 'outbound queue'],
  },

  // ── Clients ─────────────────────────────────────────────────
  {
    href: '/admin/clients',
    label: 'Clients',
    group: 'Clients',
    keywords: ['customers', 'accounts', 'people', 'companies'],
  },
  {
    href: '/admin/proposals',
    label: 'Proposals',
    group: 'Clients',
    keywords: ['offer', 'pitch', 'send proposal', 'deals'],
  },
  {
    href: '/admin/proposals/new',
    label: 'New Proposal',
    group: 'Clients',
    keywords: ['create proposal', 'draft proposal', 'add proposal', 'compose', 'new'],
  },
  {
    href: '/admin/onboarding',
    label: 'Onboarding',
    group: 'Clients',
    keywords: ['kickoff', 'intake', 'interview', 'questionnaire', 'new client'],
  },
  {
    href: '/admin/milestones',
    label: 'Milestones',
    group: 'Clients',
    keywords: ['progress', 'delivery', 'stages', 'roadmap', 'project status'],
  },

  // ── Content ─────────────────────────────────────────────────
  {
    href: '/admin/messages',
    label: 'Messages',
    group: 'Content',
    keywords: ['chat', 'inbox', 'conversations', 'replies', 'dm'],
  },
  {
    href: '/admin/tasks',
    label: 'Tasks',
    group: 'Content',
    keywords: ['todo', 'to-do', 'work items', 'checklist'],
  },
  {
    href: '/admin/templates',
    label: 'Templates',
    group: 'Content',
    keywords: ['demos', 'demo', 'downloads', 'starter', 'boilerplate'],
  },
  {
    href: '/admin/mistakes',
    label: 'Mistakes',
    group: 'Content',
    keywords: ['errors', 'issues', 'corrections', 'change requests', 'fixes'],
  },

  // ── Insights ────────────────────────────────────────────────
  {
    href: '/admin/analytics',
    label: 'Analytics',
    group: 'Insights',
    keywords: ['metrics', 'stats', 'stratametrics', 'traffic', 'reports', 'data'],
  },
  {
    href: '/admin/affiliates',
    label: 'Affiliates',
    group: 'Insights',
    keywords: ['referrals', 'partners', 'commissions', 'links', 'ref'],
  },

  // ── System ──────────────────────────────────────────────────
  {
    href: '/admin/security',
    label: 'Security',
    group: 'System',
    keywords: ['audit', 'mfa', '2fa', 'sessions', 'lockout', 'safety', 'logs'],
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    group: 'System',
    keywords: ['preferences', 'config', 'configuration', 'account', 'profile'],
  },
];
