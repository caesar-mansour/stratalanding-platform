// Shared TypeScript types for the outreach subsystem.
// Source of truth for the DB schema shapes — kept in sync with migrations 026-032.

export type InboxType = 'oauth2' | 'app_password';

export type ProspectStatus =
  | 'new'
  | 'queued'
  | 'sent'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'unsubscribed'
  | 'bounced'
  | 'suppressed'
  | 'follow_up_due';

export type EventType =
  | 'delivered'
  | 'open'
  | 'click'
  | 'reply'
  | 'bounce'
  | 'unsubscribe'
  | 'complaint';

export type OpenType = 'real' | 'mpp_prefetch' | 'gmail_proxy' | 'unknown';

export type ReplyClassification =
  | 'hot'
  | 'warm'
  | 'cold'
  | 'remove'
  | 'ooo'
  | 'bounce'
  | 'uncertain';

export type ReplyMatchConfidence =
  | 'exact'
  | 'header_chain'
  | 'reply_to_token'
  | 'fuzzy'
  | 'manual';

export type QueueStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'skipped_suppressed'
  | 'skipped_cap'
  | 'cancelled';

export interface OutreachInbox {
  id: string;
  label: string;
  email: string;
  display_name: string;
  type: InboxType;
  daily_cap: number;
  min_spacing_seconds: number;
  max_spacing_seconds: number;
  active: boolean;
  paused: boolean;
  sent_today: number;
  sent_today_date: string | null;
  last_sent_at: string | null;
  warmup_start_date: string | null;
  warmup_daily_cap: number | null;
  bounce_rate_7d: number;
  complaint_rate_7d: number;
  notes: string | null;
  created_at: string;
}

export interface OutreachDomainLimit {
  domain: string;
  daily_cap: number;
  hard_ceiling: number;
  sent_today: number;
  sent_today_date: string | null;
  is_transactional: boolean;
  notes: string | null;
  created_at: string;
}

export interface Issue {
  problem: string;
  impact: string;
  fix: string;
}

export interface ProspectAnalysis {
  practice_summary?: string;
  summary?: string;
  issues: Issue[];
}

export interface SocialLinks {
  instagram?: string | null;
  x?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
}

export interface OutreachProspect {
  id: string;
  user_id: string;
  campaign_id: string | null;
  email: string | null;
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  analysis: ProspectAnalysis | null;
  social_links: SocialLinks | null;
  principal_name: string | null;
  screenshot_path: string | null;
  draft_archetype: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  draft_body_html: string | null;
  email_validated: boolean;
  email_validation_reason: string | null;
  status: ProspectStatus;
  last_contact_at: string | null;
  replied_at: string | null;
  unsubscribed_at: string | null;
  bounced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachSend {
  id: string;
  prospect_id: string;
  campaign_id: string | null;
  inbox_id: string;
  follow_up_number: number;
  subject: string;
  body_text: string;
  body_html: string | null;
  message_id: string;
  tracking_token: string;
  reply_to_token: string;
  sent_at: string;
  delivered_at: string | null;
  first_open_at: string | null;
  first_click_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  open_count_real: number;
  open_count_raw: number;
  click_count: number;
  replied: boolean;
  bounced: boolean;
  unsubscribed: boolean;
  created_at: string;
}

export interface OutreachEvent {
  id: string;
  send_id: string;
  event_type: EventType;
  open_type: OpenType | null;
  url: string | null;
  user_agent: string | null;
  ip_address: string | null;
  ip_hash: string | null;
  country: string | null;
  city: string | null;
  reply_body: string | null;
  reply_classification: ReplyClassification | null;
  reply_match_confidence: ReplyMatchConfidence | null;
  raw_headers: Record<string, unknown> | null;
  created_at: string;
}

export interface OutreachQueueRow {
  id: string;
  prospect_id: string;
  inbox_id: string;
  campaign_id: string | null;
  follow_up_number: number;
  scheduled_for: string;
  priority: number;
  status: QueueStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
