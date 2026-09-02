// Reply classification via GPT-5 mini.
// Takes the original outbound email + the inbound reply body.
// Returns a single category + short rationale.
//
// Used by /api/cron/outreach-poll-replies to:
//   - surface hot/warm replies in Priority tab
//   - auto-suppress 'remove'
//   - auto-reschedule follow-ups on 'ooo'

import type { ReplyClassification } from './types';

export interface ClassificationResult {
  classification: ReplyClassification;
  rationale: string;           // short (≤200 chars) human-readable reason
  confidence: number;          // 0..1 self-reported confidence
}

const SYSTEM_PROMPT = `You classify inbound email replies to cold outreach.

Output STRICT JSON: {"classification": "<one of: hot, warm, cold, remove, ooo, bounce, uncertain>", "rationale": "<short reason, <=200 chars>", "confidence": <0..1>}

Categories:
- hot: the person is clearly interested, wants to talk, asks for a call/meeting/proposal, says "yes I'd like that", "send more info", "what's the next step", etc.
- warm: asks a specific question or requests clarification but hasn't committed yet. Engaged but not yet ready.
- cold: polite no, not now, too expensive, wrong time, not a fit. Clear decline without hostility.
- remove: explicit unsubscribe/removal request. "Take me off your list", "stop emailing me", "remove us", etc. Even polite removals count.
- ooo: automated out-of-office reply. Any auto-responder indicating the person is away.
- bounce: bounce-back from mailer-daemon, delivery failure, or system rejection. Should not normally reach the classifier (bounce-parser catches these first) but be ready.
- uncertain: you cannot decide with confidence >= 0.6. Output confidence accordingly and a rationale explaining why.

Rules:
- Be strict. Hostile or dismissive "stop contacting us" is remove, NOT cold.
- "Interested but send details" is hot. "Tell me more about X" with no commitment is warm.
- Short curt replies without clear signal = uncertain.
- Always output valid JSON; no prose outside the JSON object.`;

export async function classifyReply(opts: {
  originalSubject: string;
  originalBody: string;
  replyBody: string;
  prospectName?: string;
}): Promise<ClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { classification: 'uncertain', rationale: 'OPENAI_API_KEY not configured', confidence: 0 };
  }

  const userContent = [
    `Prospect: ${opts.prospectName ?? '(unknown)'}`,
    `Original subject: ${opts.originalSubject}`,
    `Original body (first 800 chars):\n${opts.originalBody.slice(0, 800)}`,
    `---`,
    `Reply body (first 1500 chars):\n${opts.replyBody.slice(0, 1500)}`,
  ].join('\n\n');

  try {
    // Retry 429 / 5xx with exponential backoff: 1s, 2s, 4s (max 3 attempts).
    // 401/400 errors return immediately (they're not transient).
    const body = JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 300,
    });

    const TRANSIENT = new Set([429, 500, 502, 503, 504]);
    const MAX_ATTEMPTS = 3;
    let res: Response | null = null;
    let lastStatus = 0;
    let lastText = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) break;
      lastStatus = res.status;
      lastText = await res.text().catch(() => '');
      if (!TRANSIENT.has(res.status)) break; // non-retryable (auth/bad-request)
      if (attempt < MAX_ATTEMPTS) {
        // Honor Retry-After header if present, else exponential backoff.
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 10_000)
          : 1000 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    if (!res || !res.ok) {
      console.error('[classify] OpenAI error after retries:', lastStatus, lastText.slice(0, 300));
      return { classification: 'uncertain', rationale: `OpenAI ${lastStatus} (after ${MAX_ATTEMPTS} attempts)`, confidence: 0 };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw);

    const classification = normalizeClassification(parsed.classification);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
    const rationale = String(parsed.rationale ?? '').slice(0, 240);

    return { classification, rationale, confidence };
  } catch (err) {
    console.error('[classify] fail:', err);
    return { classification: 'uncertain', rationale: 'classifier error', confidence: 0 };
  }
}

const VALID: ReplyClassification[] = ['hot', 'warm', 'cold', 'remove', 'ooo', 'bounce', 'uncertain'];

function normalizeClassification(raw: unknown): ReplyClassification {
  if (typeof raw !== 'string') return 'uncertain';
  const lower = raw.toLowerCase().trim() as ReplyClassification;
  return VALID.includes(lower) ? lower : 'uncertain';
}
