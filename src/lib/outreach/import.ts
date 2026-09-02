// One-time importer: migrate outreach/campaigns/<id>/{analyzed,drafts,sent}.json → DB.
// Idempotent — re-runnable. Upserts campaigns + prospects, creates retroactive
// outreach_sends rows for historical sends so the dashboard reflects real history.

import fs from 'fs';
import path from 'path';
import sql from '@/lib/db';
import { getInboxByLabel } from './db';
import type { ProspectAnalysis, SocialLinks } from './types';

export interface CampaignFolderShape {
  configPath: string;
  analyzedPath: string;
  draftsPath: string;
  sentPath: string;
}

export function resolveCampaignFolder(folderPath: string): CampaignFolderShape {
  return {
    configPath: path.join(folderPath, 'config.json'),
    analyzedPath: path.join(folderPath, 'analyzed.json'),
    draftsPath: path.join(folderPath, 'drafts.json'),
    sentPath: path.join(folderPath, 'sent.json'),
  };
}

interface RawAnalyzed {
  name: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  lat?: number;
  lng?: number;
  placeId?: string;
  screenshot?: string;
  analysis?: ProspectAnalysis;
  socialLinks?: SocialLinks;
  principalName?: string | null;
}

interface RawDraft {
  name: string;
  archetype?: string;
  ig_dm?: string;
  email_subject?: string;
  email_body?: string;
}

interface RawSentEntry {
  email?: {
    sent?: boolean;
    to?: string;
    subject?: string;
    time?: string;
    messageId?: string;
    from?: string;
  };
  replied?: boolean;
}

type RawSentLog = Record<string, RawSentEntry>;

function isValidEmail(e?: string | null): boolean {
  if (!e) return false;
  if (e.includes('user@domain')) return false;
  if (/\bwixpress\.com|sentry|example\.com|example\.org|latofonts|indiantypefoundry|techpumpkin|jovanny|2x\.ca|typemade|impallari|myportalmarketing|upmysite|eyebytes|micahrich|bitly\b/i.test(e)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export interface ImportStats {
  campaignId: string;
  prospectsImported: number;
  prospectsSkippedNoEmail: number;
  prospectsUpdated: number;
  sendsBackfilled: number;
  sendsSkipped: number;
  warnings: string[];
}

export async function importCampaignFolder(folderPath: string): Promise<ImportStats> {
  const warnings: string[] = [];
  const paths = resolveCampaignFolder(folderPath);

  const config = JSON.parse(fs.readFileSync(paths.configPath, 'utf8')) as {
    id: string;
    city?: string;
    niche?: string;
    status?: string;
    startDate?: string;
    inboxes?: string[];
  };
  const analyzed = JSON.parse(fs.readFileSync(paths.analyzedPath, 'utf8')) as RawAnalyzed[];
  const drafts = JSON.parse(fs.readFileSync(paths.draftsPath, 'utf8')) as RawDraft[];
  const sent = fs.existsSync(paths.sentPath)
    ? (JSON.parse(fs.readFileSync(paths.sentPath, 'utf8')) as RawSentLog)
    : {};

  // 1) Upsert the campaign row (keyed by location+niche since that's the current table's unique key).
  const location = config.city || 'Unknown';
  const niche = config.niche || 'Unknown';
  const [campaign] = await sql<Array<{ id: string }>>`
    INSERT INTO outreach_campaigns (location, niche, platform, status, notes)
    VALUES (${location}, ${niche}, 'email', ${config.status === 'active' ? 'sending' : 'extracted'},
            ${`Imported from outreach/campaigns/${config.id}`})
    ON CONFLICT ON CONSTRAINT outreach_campaigns_pkey DO NOTHING
    RETURNING id
  `;

  let campaignId = campaign?.id;
  if (!campaignId) {
    const [existing] = await sql<Array<{ id: string }>>`
      SELECT id FROM outreach_campaigns
      WHERE location = ${location} AND niche = ${niche}
      ORDER BY created_at DESC LIMIT 1
    `;
    campaignId = existing?.id;
  }
  if (!campaignId) {
    throw new Error('Could not create or find outreach_campaigns row');
  }

  const draftByName = new Map<string, RawDraft>();
  for (const d of drafts) draftByName.set(d.name, d);

  let prospectsImported = 0;
  let prospectsUpdated = 0;
  let prospectsSkippedNoEmail = 0;
  let sendsBackfilled = 0;
  let sendsSkipped = 0;

  // Default inbox for backfilled sends — use what config.json specifies or fall back.
  const inboxLabel =
    config.inboxes?.[0] === 'dev@stratalanding.com' ? 'dev-stratalanding' :
    config.inboxes?.[0] === 'stratalanding@gmail.com' ? 'stratalanding-gmail' :
    'dev-stratalanding';
  const defaultInbox = await getInboxByLabel(inboxLabel);
  if (!defaultInbox) {
    warnings.push(`Inbox ${inboxLabel} not found — historical sends will be skipped`);
  }

  for (const raw of analyzed) {
    const draft = draftByName.get(raw.name);
    if (!isValidEmail(raw.email)) {
      prospectsSkippedNoEmail++;
      continue;
    }
    const email = raw.email!.toLowerCase().trim();

    const [existing] = await sql<Array<{ id: string }>>`
      SELECT id FROM outreach_prospects
      WHERE campaign_id = ${campaignId} AND LOWER(email) = ${email}
      LIMIT 1
    `;

    if (existing) {
      // Update enrichment fields in case they changed.
      await sql`
        UPDATE outreach_prospects
        SET
          website = COALESCE(${raw.website ?? null}, website),
          phone = COALESCE(${raw.phone ?? null}, phone),
          city = COALESCE(${raw.city ?? null}, city),
          lat = COALESCE(${raw.lat ?? null}, lat),
          lng = COALESCE(${raw.lng ?? null}, lng),
          place_id = COALESCE(${raw.placeId ?? null}, place_id),
          analysis = COALESCE(${raw.analysis ? sql.json(raw.analysis as never) : null}::jsonb, analysis),
          social_links = COALESCE(${raw.socialLinks ? sql.json(raw.socialLinks as never) : null}::jsonb, social_links),
          principal_name = COALESCE(${raw.principalName ?? null}, principal_name),
          screenshot_path = COALESCE(${raw.screenshot ?? null}, screenshot_path),
          draft_archetype = COALESCE(${draft?.archetype ?? null}, draft_archetype),
          draft_subject = COALESCE(${draft?.email_subject ?? null}, draft_subject),
          draft_body = COALESCE(${draft?.email_body ?? null}, draft_body),
          updated_at = now()
        WHERE id = ${existing.id}
      `;
      prospectsUpdated++;
      continue;
    }

    await sql`
      INSERT INTO outreach_prospects (
        campaign_id, email, name, website, phone, city, lat, lng, place_id,
        analysis, social_links, principal_name, screenshot_path,
        draft_archetype, draft_subject, draft_body,
        email_validated, status
      ) VALUES (
        ${campaignId}, ${email}, ${raw.name},
        ${raw.website ?? null}, ${raw.phone ?? null}, ${raw.city ?? null},
        ${raw.lat ?? null}, ${raw.lng ?? null}, ${raw.placeId ?? null},
        ${raw.analysis ? sql.json(raw.analysis as never) : null}::jsonb,
        ${raw.socialLinks ? sql.json(raw.socialLinks as never) : null}::jsonb,
        ${raw.principalName ?? null}, ${raw.screenshot ?? null},
        ${draft?.archetype ?? null}, ${draft?.email_subject ?? null}, ${draft?.email_body ?? null},
        true, 'new'
      )
    `;
    prospectsImported++;
  }

  // Backfill historical sends if we have an inbox.
  if (defaultInbox) {
    for (const [name, entry] of Object.entries(sent)) {
      const emailEntry = entry.email;
      if (!emailEntry?.sent || !emailEntry.to || !emailEntry.messageId || !emailEntry.subject) {
        sendsSkipped++;
        continue;
      }
      const [prospect] = await sql<Array<{ id: string; draft_body: string | null }>>`
        SELECT id, draft_body FROM outreach_prospects
        WHERE campaign_id = ${campaignId} AND LOWER(email) = ${emailEntry.to.toLowerCase()}
        LIMIT 1
      `;
      if (!prospect) { sendsSkipped++; continue; }

      try {
        await sql`
          INSERT INTO outreach_sends (
            prospect_id, campaign_id, inbox_id, follow_up_number,
            subject, body_text, message_id, sent_at, delivered_at
          ) VALUES (
            ${prospect.id}, ${campaignId}, ${defaultInbox.id}, 0,
            ${emailEntry.subject}, ${prospect.draft_body ?? '(historical send, body not preserved)'},
            ${emailEntry.messageId}, ${emailEntry.time ?? new Date().toISOString()},
            ${emailEntry.time ?? new Date().toISOString()}
          )
          ON CONFLICT DO NOTHING
        `;
        await sql`
          UPDATE outreach_prospects
          SET status = CASE WHEN status = 'new' THEN 'sent' ELSE status END,
              last_contact_at = ${emailEntry.time ?? new Date().toISOString()},
              replied_at = ${entry.replied ? (emailEntry.time ?? null) : null},
              updated_at = now()
          WHERE id = ${prospect.id}
        `;
        sendsBackfilled++;
      } catch (err) {
        warnings.push(`Backfill failed for ${name}: ${err instanceof Error ? err.message : 'unknown'}`);
        sendsSkipped++;
      }
    }
  }

  return {
    campaignId,
    prospectsImported,
    prospectsUpdated,
    prospectsSkippedNoEmail,
    sendsBackfilled,
    sendsSkipped,
    warnings,
  };
}
