import OpenAI from 'openai';
import sql from './db';
import { pricing, pricingFAQ, scopeClarity, brand } from './brand';
import type { BriefSubmission, Proposal, Project } from './types';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
    });
  }
  return _openai;
}

// Package display names
const PACKAGE_LABELS: Record<string, string> = {
  starter: 'Presence Page ($2,400)',
  growth: 'Lead Page ($4,800)',
  scale: 'Purchase Page ($9,600)',
};

const TIMELINE_LABELS: Record<string, string> = {
  asap: 'ASAP',
  this_month: 'This Month',
  next_month: 'Next Month',
  no_rush: 'No Rush',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  proposal_sent: 'Proposal Sent',
  deposit_paid: 'Deposit Paid',
  in_production: 'In Production',
  ready_for_final_payment: 'Ready for Final Payment',
  paid_in_full: 'Paid in Full',
  launched: 'Launched',
};

const REVISION_INFO: Record<string, string> = {
  starter: '6 rounds',
  growth: 'Unlimited',
  scale: 'Unlimited + 14-day post-launch support',
};

const DELIVERY_TIMES: Record<string, string> = {
  starter: '7-10 business days',
  growth: '10-14 business days',
  scale: '14-21 business days',
};

// Escalation keywords — these trigger handoff to human team
const ESCALATION_KEYWORDS = [
  'refund', 'cancel', 'discount', 'cheaper', 'bug', 'broken', 'not working',
  'speak to someone', 'talk to a human', 'real person', 'manager',
  'complaint', 'unhappy', 'frustrated', 'angry', 'lawsuit', 'legal',
  'scam', 'fraud', 'terrible', 'worst', 'horrible',
];

export function shouldEscalate(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some(keyword => lower.includes(keyword));
}

export const ESCALATION_MESSAGE = "I want to make sure you get the best help here. Let me flag this for the team — they'll follow up with you directly. Is there anything else I can help with in the meantime?";

// Context passed to the system prompt about revision status
export interface RevisionContext {
  used: number;
  limit: number | 'unlimited';
  hasRevisionsLeft: boolean;
  isUnlimited: boolean;
  unlimitedExpired: boolean;
  daysRemaining: number;
  isChangeRequest: boolean;
  revisionAutoCreated: boolean;
  isMistakeReport: boolean;
  mistakeDetailsCaptured: boolean;
}

// Build the system prompt with full project context
export function buildSystemPrompt(
  project: Project,
  brief: BriefSubmission | null,
  proposals: Proposal[],
  revisionCtx?: RevisionContext
): string {
  const packageLabel = PACKAGE_LABELS[project.package] || project.package;
  const statusLabel = STATUS_LABELS[project.status] || project.status;
  const timelineLabel = TIMELINE_LABELS[project.timeline] || project.timeline;
  const revisionInfo = REVISION_INFO[project.package] || '6 rounds';
  const deliveryTime = DELIVERY_TIMES[project.package] || '7-10 business days';

  // Build FAQ section from brand constants
  const faqSection = pricingFAQ.slice(0, 6).map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');

  // Build included/not-included
  const included = scopeClarity.included.join(', ');
  const notIncluded = scopeClarity.notIncluded.join(', ');

  let prompt = `You are StrataLanding AI, the helpful assistant for ${brand.name} — a premium landing page studio.

## Your Role
You help clients navigate their portal, answer questions about their project, explain how things work, and provide guidance. You represent the StrataLanding team. You are chatting with the client right now inside their portal chat.

## Important Rules
1. NEVER make up information about the client's project that isn't provided below
2. If you cannot confidently answer, say "Let me flag this for the team — they'll follow up with you directly"
3. Do NOT discuss pricing discounts or negotiate prices
4. Do NOT pretend to be human — if asked directly, say you are StrataLanding AI
5. Keep responses SHORT — 2-4 sentences max unless the client asks for detail
6. Use a warm, casual-professional tone. Max one emoji per message
7. Do NOT make promises about timeline changes or scope additions
8. When the client shares feedback or revision requests, acknowledge them and let them know the team will review and implement them
9. When clients ask "how to" do something in the portal, give clear step-by-step directions referencing the actual portal pages
10. Be conversational, not robotic. Don't over-explain or give walls of text

## How This Chat Works
The client is messaging you RIGHT NOW in the Chat section of their portal. This is a direct line to the team. Key things to know:
- **Regular messages**: The client just types and sends — like texting. No special steps needed. They can ask questions, share feedback, say hello — anything
- **Revision rounds**: When they want to formally request design/content changes, they click the "Use Revision Round" button at the top of the chat. This counts toward their revision limit
- **Asking questions does NOT use a revision round** — only formal revision requests do
- The team typically responds within a few hours during business days
- Clients can also attach images and files directly in chat

## Client Portal Pages
The portal has these sections (accessible from the navigation bar):

1. **Dashboard** — Project overview, current status, payment buttons, preview link (if available), quick links to other pages
2. **Proposals** — View proposals sent by the team, see pricing breakdown, accept proposal, pay deposit
3. **Brief** — Read-only view of the project brief they submitted (company info, goals, audience, notes). To update the brief, they need to email ${brand.email}
4. **Timeline** — Visual progress tracker showing 7 milestones: Brief Received → Proposal Sent → Deposit Paid → In Production → Ready for Review → Paid in Full → Launched
5. **Uploads** — Drag & drop file sharing for brand assets (logos, photos, brand guidelines, content docs). Supports images, PDFs, docs, up to 10MB each
6. **Chat** — This is where we are now! Direct messaging with the team + revision round tracking
7. **Analytics** — View landing page performance after launch (page views, visitors, conversions)
8. **Settings** — Account settings, password change, two-factor authentication

## Project Lifecycle
1. Client submits brief → 2. Team sends proposal (24h) → 3. Client pays 50% deposit → 4. Chat unlocks, production begins → 5. Checkpoint updates via Loom videos → 6. Client reviews & requests revisions → 7. Final build ready → 8. Client pays remaining 50% → 9. Launch → 10. Post-launch support (if applicable)

## StrataLanding Services
${brand.tagline}. ${brand.description}
Contact: ${brand.email}

### Packages
${pricing.map(p => `- **${p.name}** (${p.price}): ${p.description} — ${p.delivery}, ${p.deliverables.revisions} revisions`).join('\n')}

### What's Included
${included}

### What's NOT Included
${notIncluded}

### Common FAQ
${faqSection}

## This Client's Project
- Package: ${packageLabel}
- Status: ${statusLabel}
- Timeline: ${timelineLabel}
- Expected Delivery: ${deliveryTime}
- Revision Rounds: ${revisionInfo}`;

  if (brief) {
    prompt += `

## Client's Brief
- Company: ${brief.company_name}
- Industry: ${brief.industry}
- Primary Goal: ${brief.primary_goal}
- Target Audience: ${brief.audience}`;
    if (brief.pain_points) prompt += `\n- Pain Points: ${brief.pain_points}`;
    if (brief.notes) prompt += `\n- Additional Notes: ${brief.notes}`;
  }

  if (proposals.length > 0) {
    const latest = proposals[0];
    prompt += `

## Latest Proposal
- Status: ${latest.status}
- Valid Until: ${latest.valid_until}`;
    if (latest.notes) prompt += `\n- Notes: ${latest.notes}`;
  }

  prompt += `

## How to Answer Common Questions

**"How do I ask a question?"** → Just type your question here and send it! This chat is your direct line to the team. No special steps needed.

**"How do revision rounds work?"** → When you want to request design or content changes, just describe what you'd like changed. The system automatically detects change requests and counts them as revision rounds. Asking general questions does NOT count as a revision round.

**"Where can I see my project status?"** → Check the Timeline page in your portal nav — it shows exactly where your project is.

**"How do I upload files?"** → Go to the Uploads page from the nav bar. You can drag & drop logos, photos, brand guidelines, or any documents.

**"When will I hear back?"** → The team typically responds within a few hours during business days. You'll get a notification when they reply.

**"How do I pay?"** → Go to your Dashboard — payment buttons appear when it's time to pay (deposit or final balance). Payment is via PayPal.

## Escalation Rules
If the client asks about ANY of these, tell them you'll flag it for the team:
- Custom pricing, discounts, or price negotiations
- Scope changes, additional pages, or features not in their package
- Technical bugs, broken previews, or errors
- Refunds, payment disputes, or cancellations
- Complaints or frustrations — empathize first, then escalate
- Anything you're not 100% certain about

## Handling Revisions, Reverts & Mistakes
- You CANNOT directly revert or undo revision rounds — only the admin team can do that
- If a client asks to "revert revisions", "undo changes", "cancel revision", or anything about undoing revision rounds, tell them: "I can't directly revert revision rounds, but if you noticed a mistake or something that doesn't look right, let me know what it is and I'll send it to the team so they can check it out!"
- If the client describes a specific mistake or issue (e.g. "the logo is wrong", "there's a typo in the header", "the colors look off"), acknowledge it warmly and tell them you'll flag it for the team to check
- Do NOT create or suggest creating revision rounds for mistake reports — mistakes are handled separately by the team
- Do NOT tell the client you are "recording a revert request" or "sending a revert to the team" — reverts are an internal admin action`;

  // Add revision tracking context if available
  if (revisionCtx) {
    const { used, limit, isUnlimited, unlimitedExpired, daysRemaining, isChangeRequest, revisionAutoCreated, isMistakeReport, mistakeDetailsCaptured } = revisionCtx;

    if (mistakeDetailsCaptured) {
      // Client provided specific details after being asked — mistake entry has been created
      prompt += `

## 🐛 Mistake Details Received
The client just described a specific issue with their website. The details have been sent to the team.
- Thank them for the details
- Tell them: "Thanks for the details! I've sent this to the team and they'll look into it. This won't count against your revision rounds."
- Keep it short and reassuring
- Do NOT ask for more details — you already have what you need`;
    } else if (isMistakeReport) {
      // Client mentioned a mistake vaguely — need to ask for specifics BEFORE creating an entry
      prompt += `

## 🐛 Possible Mistake Mentioned
The client mentioned something might be wrong with their website, but hasn't given specific details yet.
- Ask them what specifically looks wrong — which part of the page, what they expected vs what they see
- Do NOT say you've already sent anything to the team — you need the details first
- Example: "I'd be happy to help! Can you tell me what specifically looks wrong? For example, which part of the page and what you're seeing vs what you expected — so I can send the details to the team."
- Keep it warm and helpful
- Do NOT count this as a revision round`;
    } else if (isUnlimited && unlimitedExpired) {
      // Unlimited plan window has expired
      prompt += `

## ⚠️ IMPORTANT — Unlimited Revision Period EXPIRED
This client's unlimited revision period (30 days after launch) has ENDED.
- They used ${used} revision rounds during the active period.
- If they are requesting a change, you MUST tell them: "Your 30-day unlimited revision window has ended. If you'd like to make further changes to your website, just leave a message here describing what you need, and we'll send you a quote for the update. We're happy to keep improving your page!"
- Do NOT acknowledge change requests as if they will be implemented for free.`;
    } else if (isChangeRequest && revisionAutoCreated) {
      // Change was detected and revision round auto-created
      const roundLabel = isUnlimited
        ? `Revision Round ${used + 1} (unlimited plan${daysRemaining <= 7 ? ` — ${daysRemaining} days remaining` : ''})`
        : `Revision Round ${used + 1} of ${limit}`;

      prompt += `

## 📋 Change Request Detected — ${roundLabel}
The client's message is a CHANGE REQUEST. A revision round has been automatically counted and a task has been sent to the team.
- Acknowledge their request warmly
- Tell them: "I've noted your request and sent it to the team. This typically takes 24–48 business hours to implement."
- Do NOT suggest they add more changes to the same revision round — each revision is handled separately by the team
- Keep it short and simple — just confirm receipt and the 24-48 hour timeframe`;

      if (!isUnlimited && used + 1 >= (limit as number)) {
        prompt += `
- ⚠️ This is their LAST revision round. Let them know gently that all ${limit} revision rounds have been used after this one. Any further changes would be quoted separately.`;
      }
    } else if (isChangeRequest && !revisionCtx.hasRevisionsLeft) {
      // Change request but NO revisions left (starter plan used all 6)
      prompt += `

## ⚠️ IMPORTANT — No Revision Rounds Left
This client has used ALL ${limit} revision rounds.
- They are requesting a change but have NO revision rounds remaining.
- Tell them: "You've used all ${limit} revision rounds included in your ${packageLabel} package. If you'd like to make additional changes, leave a message describing what you need and the team will send you a quote. We're happy to help!"
- Do NOT acknowledge the change as if it will be implemented for free.`;
    } else {
      // Regular question or sufficient revisions
      const revisionStatus = isUnlimited
        ? `Unlimited revisions (${daysRemaining} days remaining in window)`
        : `${used} of ${limit} revision rounds used`;
      prompt += `

## Revision Status
${revisionStatus}`;
    }
  }

  return prompt;
}

// Convert DB messages to OpenAI chat format
interface DbMessage {
  sender_type: 'client' | 'admin' | 'ai';
  message: string;
}

export function buildMessageHistory(
  messages: DbMessage[],
  maxMessages = 20
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const history: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  const recent = messages.slice(-maxMessages);

  for (const msg of recent) {
    if (msg.sender_type === 'client') {
      history.push({ role: 'user', content: msg.message });
    } else if (msg.sender_type === 'ai') {
      history.push({ role: 'assistant', content: msg.message });
    } else if (msg.sender_type === 'admin') {
      history.push({ role: 'user', content: `[Team message from StrataLanding]: ${msg.message}` });
    }
  }

  return history;
}

// ============================================================
// Revision Detection & Tracking
// ============================================================

const REVISION_MARKER = '📋 Revision Round';

const PACKAGE_REVISION_LIMITS: Record<string, number | 'unlimited'> = {
  starter: 6,
  growth: 'unlimited',
  scale: 'unlimited',
};

const UNLIMITED_WINDOW_DAYS = 30;

// Classify whether a client message is a change request, mistake report, or general question
export async function classifyMessage(message: string): Promise<'change' | 'question' | 'mistake'> {
  try {
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await getOpenAI().chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a message classifier for a landing page project. Classify the user message as "change", "mistake", or "question".

Reply with ONLY one word: "change", "mistake", or "question".

"change" = The user is requesting a SPECIFIC modification to their WEBSITE/LANDING PAGE. This means they want something visually or functionally different on their actual web page. The request must describe a concrete change to a page element.

Examples of "change":
- "make the header blue" (specific color change to a page element)
- "change the logo to this one" (specific asset swap)
- "update the hero text to say Welcome" (specific text change)
- "remove the footer section" (specific element removal)
- "add a contact form" (specific feature addition)
- "move the CTA button higher" (specific layout change)
- "I want a different font" (specific style change)
- "change the background image" (specific visual change)

"mistake" = The user is reporting something that looks WRONG, broken, or incorrect on their website/landing page. They are NOT requesting a new change — they are pointing out an error or issue that needs to be fixed.

Examples of "mistake":
- "the logo is wrong" (something is incorrect)
- "there's a typo in the heading" (error found)
- "the colors don't match my brand" (something looks wrong)
- "the phone number is incorrect" (factual error)
- "the image is broken/missing" (broken element)
- "something looks off on mobile" (visual issue)
- "that's not what I asked for" (result doesn't match request)
- "the link goes to the wrong page" (functional error)

"question" = EVERYTHING ELSE. This includes:
- Questions about anything ("how do I...?", "when will...?", "what is...?")
- Greetings and general conversation ("hi", "thanks", "ok")
- Status inquiries ("where is my project?", "how many revisions left?")
- Complaints or frustrations ("this is taking too long", "I don't like it")
- Talking ABOUT revisions/changes without requesting a specific one ("revert the revisions", "undo my changes", "I didn't want that revision", "cancel that")
- Vague feedback without a specific request ("it doesn't look right", "I'm not sure about the design")
- Requests about the chat/portal/system itself ("revert all the revisions", "how do I undo")
- Follow-up context to a previous change ("the background, not the text", "yes that one", "actually wine red")

When in doubt, classify as "question". Only use "change" for clear requests to modify the website. Only use "mistake" when the client is clearly reporting something that is wrong/broken/incorrect.`,
        },
        { role: 'user', content: message },
      ],
      max_completion_tokens: 128,
    });
    const answer = (res.choices[0]?.message?.content || '').trim().toLowerCase();
    if (answer.includes('change')) return 'change';
    if (answer.includes('mistake')) return 'mistake';
    return 'question';
  } catch (err) {
    console.error('Classification error:', err);
    return 'question'; // Default to question on error (safer — don't burn revision rounds)
  }
}

// Get current revision status for a project
export async function getRevisionStatus(projectId: string, packageType: string): Promise<{
  used: number;
  limit: number | 'unlimited';
  hasRevisionsLeft: boolean;
  isUnlimited: boolean;
}> {
  const limit = PACKAGE_REVISION_LIMITS[packageType] || 6;
  const isUnlimited = limit === 'unlimited';

  // Count revision round markers in messages
  const [count] = await sql`
    SELECT COUNT(*) as count FROM revision_messages
    WHERE project_id = ${projectId}
      AND sender_type = 'client'
      AND message LIKE ${REVISION_MARKER + '%'}
  `;
  const used = parseInt(count?.count || '0');

  const hasRevisionsLeft = isUnlimited || used < (limit as number);

  return { used, limit, hasRevisionsLeft, isUnlimited };
}

// Check if unlimited revision window has expired (30 days post-launch)
export function checkUnlimitedExpiry(project: Project): {
  expired: boolean;
  daysRemaining: number;
  launchedAt: Date | null;
} {
  if (project.status !== 'launched' || !project.launched_at) {
    return { expired: false, daysRemaining: UNLIMITED_WINDOW_DAYS, launchedAt: null };
  }

  const launchedAt = new Date(project.launched_at);
  const now = new Date();
  const daysSinceLaunch = Math.floor((now.getTime() - launchedAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, UNLIMITED_WINDOW_DAYS - daysSinceLaunch);
  const expired = daysSinceLaunch >= UNLIMITED_WINDOW_DAYS;

  return { expired, daysRemaining, launchedAt };
}

// Check if the client is following up on a recent change request (don't double-count)
// Pattern: client_change → revision_marker → ai_response → client_followup
// If a revision marker exists in the last 3 messages, this is a follow-up, not a new change.
export async function isFollowUpToRevision(projectId: string): Promise<boolean> {
  const recentMessages = await sql`
    SELECT sender_type, message FROM revision_messages
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT 4
  `;

  // Check last 4 messages (newest first) for a revision marker
  for (const msg of recentMessages) {
    if (msg.message?.startsWith(REVISION_MARKER)) {
      return true;
    }
  }
  return false;
}

// Check if the client is following up to provide mistake details after AI asked
// Pattern: client mentions mistake → AI asks for details → client provides specifics
export async function isFollowUpToMistake(projectId: string): Promise<boolean> {
  const recentMessages = await sql`
    SELECT sender_type, message FROM revision_messages
    WHERE project_id = ${projectId}
    ORDER BY created_at DESC
    LIMIT 3
  `;

  // Check if a recent AI message asked about a mistake/issue
  for (const msg of recentMessages) {
    if (msg.sender_type === 'ai' && /what.*(wrong|mistake|issue|looks off|broken|incorrect|seeing)|which part|can you tell me/i.test(msg.message)) {
      return true;
    }
  }
  return false;
}

// Revert the most recent revision round marker (undo accidental revision)
export async function revertLastRevisionRound(projectId: string): Promise<boolean> {
  const [marker] = await sql`
    SELECT id FROM revision_messages
    WHERE project_id = ${projectId}
      AND message LIKE ${REVISION_MARKER + '%'}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (!marker) return false;

  await sql`DELETE FROM revision_messages WHERE id = ${marker.id}`;
  return true;
}

// Create a task from a client change request (visible in admin /admin/tasks)
export async function createTaskFromMessage(
  projectId: string,
  clientMessage: string,
  messageId?: string
): Promise<void> {
  const title = clientMessage.length > 100
    ? clientMessage.substring(0, 100) + '...'
    : clientMessage;

  await sql`
    INSERT INTO tasks (project_id, title, description, source, message_id)
    VALUES (${projectId}, ${title}, ${clientMessage}, 'ai', ${messageId || null})
  `;
}

// Create a mistake report from a client message (visible in admin /admin/mistakes)
export async function createMistakeFromMessage(
  projectId: string,
  description: string,
  messageId?: string
): Promise<void> {
  await sql`
    INSERT INTO mistakes (project_id, description, source, message_id)
    VALUES (${projectId}, ${description}, 'ai', ${messageId || null})
  `;
}

// Auto-create a revision round marker message
export async function autoCreateRevisionRound(projectId: string, roundNumber: number) {
  const [saved] = await sql`
    INSERT INTO revision_messages (project_id, sender_type, message)
    VALUES (${projectId}, 'client', ${`${REVISION_MARKER} ${roundNumber} Submitted\nAutomatically counted — change request detected.`})
    RETURNING *
  `;
  return saved;
}

// Rate limiting
export async function checkDailyLimit(projectId: string): Promise<{ exceeded: boolean; count: number }> {
  const limit = parseInt(process.env.AI_DAILY_LIMIT || '50');

  const [usage] = await sql`
    SELECT request_count FROM ai_chat_usage
    WHERE project_id = ${projectId} AND date = CURRENT_DATE
  `;

  const count = usage?.request_count || 0;
  return { exceeded: count >= limit, count };
}

export async function incrementUsage(projectId: string, tokensUsed: number): Promise<void> {
  await sql`
    INSERT INTO ai_chat_usage (project_id, date, request_count, token_count)
    VALUES (${projectId}, CURRENT_DATE, 1, ${tokensUsed})
    ON CONFLICT (project_id, date)
    DO UPDATE SET
      request_count = ai_chat_usage.request_count + 1,
      token_count = ai_chat_usage.token_count + ${tokensUsed},
      updated_at = NOW()
  `;
}

// Save AI message to revision_messages
export async function saveAiMessage(projectId: string, message: string) {
  const [saved] = await sql`
    INSERT INTO revision_messages (project_id, sender_type, message)
    VALUES (${projectId}, 'ai', ${message})
    RETURNING *
  `;
  return saved;
}

// Get OpenAI client for API route
export { getOpenAI };
