import OpenAI from 'openai';
import sql from './db';
import type { BriefSubmission } from './types';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// The 10 deep-dive question topics
const QUESTION_TOPICS = [
  {
    number: 1,
    topic: 'Brand Voice & Personality',
    guidance: 'Ask about their brand personality and tone. Are they formal/corporate, friendly/approachable, bold/edgy, playful, luxurious, minimal? How do they want customers to FEEL when they visit the site?',
  },
  {
    number: 2,
    topic: 'Unique Selling Proposition',
    guidance: 'Ask what the #1 thing is that sets them apart from competitors in their industry. What do they do better than anyone else? Why should a customer choose THEM?',
  },
  {
    number: 3,
    topic: 'Top Competitors',
    guidance: 'Ask about their 2-3 main competitors. What do those competitors do well? Where do they fall short? What can we learn from their websites?',
  },
  {
    number: 4,
    topic: 'Ideal Customer Profile',
    guidance: 'Ask them to describe their perfect customer in detail — age range, profession, income level, pain points, what motivates them to buy, where they hang out online.',
  },
  {
    number: 5,
    topic: 'Customer Journey',
    guidance: 'Ask how most customers discover them today (Google search, social media, referrals, paid ads, events, word of mouth). What is the typical path from discovery to purchase?',
  },
  {
    number: 6,
    topic: 'Core Offerings Hierarchy',
    guidance: 'Ask them to list their top 3 services or products ranked by importance/revenue. Which one should be front-and-center on the landing page? Are there any they want to highlight or downplay?',
  },
  {
    number: 7,
    topic: 'Social Proof & Credibility',
    guidance: 'Ask about testimonials, case studies, awards, certifications, notable clients, media mentions, or any trust signals they can share. Numbers and specifics are gold (e.g., "500+ clients served", "98% satisfaction rate").',
  },
  {
    number: 8,
    topic: 'Design Preferences & Inspiration',
    guidance: 'Ask them to share 2-3 websites they love the look of (any industry). What specifically appeals to them — the colors, layout, typography, imagery, animations? Any design styles they absolutely hate?',
  },
  {
    number: 9,
    topic: 'Call-to-Action & Conversion Goals',
    guidance: 'Ask what the ONE primary action they want visitors to take (book a call, request a quote, sign up, buy now, download something). Any secondary actions? What does success look like for this landing page?',
  },
  {
    number: 10,
    topic: 'Content & Assets Availability',
    guidance: 'Ask what assets they have ready — logo files, brand colors/guidelines, professional photos, existing copy/taglines, social media links, video content. What do they need help creating?',
  },
];

// Detect if client's message is a clarification request rather than an actual answer
export function isNonAnswer(message: string): boolean {
  const lower = message.trim().toLowerCase().replace(/['']/g, "'");
  // Very short non-specific responses
  if (/^(\?+|huh|what|eh|um|hmm|idk|ok)$/.test(lower)) return true;
  // Explicit confusion
  if (/\b(don'?t|didn'?t|do not|cant|can'?t)\s+(understand|get it|get that|get this)/i.test(lower)) return true;
  if (/\b(didnt understand|dont understand|not sure what|what do you mean|can you (explain|rephrase|clarify|repeat|simplify))/i.test(lower)) return true;
  // Short messages that are clearly confusion, not answers
  if (lower.length < 40 && /^(i'?m |)(confused|lost|unclear|what\??)$/i.test(lower)) return true;
  if (lower === 'what' || lower === 'what?' || lower === '?') return true;
  return false;
}

export function buildOnboardingSystemPrompt(
  brief: BriefSubmission,
  questionNumber: number,
  previousQA: { question: string; answer: string }[],
  reAsk?: boolean,
): string {
  const currentTopic = QUESTION_TOPICS[questionNumber - 1];

  let prompt = `You are a senior project manager at StrataLanding, a premium landing page studio. You're conducting a personalized onboarding interview with a new client to deeply understand their business so we can build them the perfect landing page.

## Client's Brief (already submitted):
- Company: ${brief.company_name}
- Website: ${brief.website || 'None yet'}
- Industry: ${brief.industry}
- Primary Goal: ${brief.primary_goal}
- Target Audience: ${brief.audience}
${brief.pain_points ? `- Pain Points: ${brief.pain_points}` : ''}
${brief.challenge ? `- Main Challenge: ${brief.challenge}` : ''}
${brief.notes ? `- Additional Notes: ${brief.notes}` : ''}

## Your Style:
- Warm, professional, and genuinely curious — like a top consultant who LOVES learning about new businesses
- Keep responses concise (2-4 sentences max for acknowledgment, then the question)
- Use the client's company name and industry naturally
- Reference their brief data to make questions feel personalized, not generic
- Be encouraging — every answer helps us build a better page for them

## Rules:
- Ask exactly ONE question per message
- Keep it conversational, not like a boring survey
- Personalize the question based on their industry (${brief.industry}) and what you know about them
- If they gave vague brief data, use the question to dig deeper into that area
- NEVER repeat information they already provided in the brief — build ON TOP of it`;

  if (reAsk) {
    // Client didn't understand — re-ask the same question in simpler terms
    prompt += previousQA.length > 0 ? `

## Previous Q&A:
${previousQA.map((qa, i) => `Q${i + 1} (${QUESTION_TOPICS[i].topic}): ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}` : '';

    prompt += `

## Your Task:
The client didn't understand the previous version of Question ${questionNumber}. Re-ask the SAME question in much simpler, everyday language. Be warm and reassuring — say something like "No worries! Let me put it differently." Keep the re-phrased question short and crystal clear. Use simple examples if helpful.

Re-ask Question ${questionNumber} Topic: ${currentTopic.topic}
Guidance: ${currentTopic.guidance}

IMPORTANT: Do NOT move to the next question. Re-ask Question ${questionNumber} only.`;
  } else if (questionNumber === 1) {
    // First question — warm intro
    prompt += `

## Your Task:
This is the FIRST question. Start with a brief, warm welcome (1-2 sentences — mention their company name, acknowledge their brief). Then ask Question 1.

Question 1 Topic: ${currentTopic.topic}
Guidance: ${currentTopic.guidance}`;
  } else if (questionNumber <= 10) {
    // Questions 2-10 — acknowledge previous answer, then ask next
    prompt += `

## Previous Q&A:
${previousQA.map((qa, i) => `Q${i + 1} (${QUESTION_TOPICS[i].topic}): ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}

## Your Task:
The client just answered question ${questionNumber - 1}. Briefly acknowledge their answer (1 sentence, be specific — reference something they said). Then ask Question ${questionNumber}.

Question ${questionNumber} Topic: ${currentTopic.topic}
Guidance: ${currentTopic.guidance}`;
  } else {
    // After question 10 — wrap up
    prompt += `

## Previous Q&A:
${previousQA.map((qa, i) => `Q${i + 1} (${QUESTION_TOPICS[i].topic}): ${qa.question}\nA${i + 1}: ${qa.answer}`).join('\n\n')}

## Your Task:
The client just answered the LAST question (question 10). Write a warm, enthusiastic closing message:
1. Thank them for taking the time
2. Mention 1-2 specific exciting things from their answers that you're looking forward to incorporating
3. Tell them the team now has everything they need to create an amazing landing page
4. Let them know the team will review their answers and reach out if they need anything else
Keep it to 3-4 sentences. End on a positive, energetic note.`;
  }

  return prompt;
}

export async function getOrCreateSession(projectId: string): Promise<{ id: string; current_question: number; status: string }> {
  // Check for existing session
  const [existing] = await sql`
    SELECT id, current_question, status FROM onboarding_sessions
    WHERE project_id = ${projectId} LIMIT 1
  `;

  if (existing) {
    return existing as { id: string; current_question: number; status: string };
  }

  // Create new session
  const [session] = await sql`
    INSERT INTO onboarding_sessions (project_id)
    VALUES (${projectId})
    RETURNING id, current_question, status
  `;

  return session as { id: string; current_question: number; status: string };
}

export async function saveOnboardingMessage(
  sessionId: string,
  role: 'ai' | 'client',
  message: string,
  questionNumber: number | null,
): Promise<{ id: string; created_at: string }> {
  const [msg] = await sql`
    INSERT INTO onboarding_messages (session_id, role, message, question_number)
    VALUES (${sessionId}, ${role}, ${message}, ${questionNumber})
    RETURNING id, created_at
  `;
  return msg as { id: string; created_at: string };
}

export async function advanceQuestion(sessionId: string, newQuestion: number): Promise<void> {
  await sql`
    UPDATE onboarding_sessions
    SET current_question = ${newQuestion}
    WHERE id = ${sessionId}
  `;
}

export async function completeSession(sessionId: string, summary: string): Promise<void> {
  await sql`
    UPDATE onboarding_sessions
    SET status = 'completed', summary = ${summary}, completed_at = NOW()
    WHERE id = ${sessionId}
  `;
}

export async function getPreviousQA(sessionId: string): Promise<{ question: string; answer: string }[]> {
  const messages = await sql`
    SELECT role, message, question_number FROM onboarding_messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
  `;

  const pairs: { question: string; answer: string }[] = [];
  let currentQuestion = '';

  for (const msg of messages) {
    if (msg.role === 'ai' && msg.question_number) {
      currentQuestion = msg.message;
    } else if (msg.role === 'client' && currentQuestion) {
      pairs.push({ question: currentQuestion, answer: msg.message });
      currentQuestion = '';
    }
  }

  return pairs;
}

export async function generateOnboardingSummary(sessionId: string): Promise<string> {
  const messages = await sql`
    SELECT role, message, question_number FROM onboarding_messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
  `;

  const qaText = messages
    .filter((m: { role?: string }) => m.role === 'ai' || m.role === 'client')
    .map((m: { role?: string; message?: string }) => `${m.role === 'ai' ? 'Q' : 'A'}: ${m.message}`)
    .join('\n\n');

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are summarizing an onboarding interview for a landing page project. Create a structured, scannable summary that a designer/developer can quickly reference. Use this format:

## Brand & Voice
(1-2 sentences)

## Unique Selling Proposition
(1-2 sentences)

## Competition
(bullet points)

## Target Customer
(brief profile)

## Customer Journey
(how they find the business)

## Core Offerings
(ranked list)

## Social Proof Available
(what they have)

## Design Direction
(preferences, inspiration sites)

## Primary CTA
(the main action + secondary)

## Assets Ready
(what they have vs what they need)

Be concise and actionable. Use the client's actual words where impactful.`,
      },
      {
        role: 'user',
        content: `Here is the full onboarding interview:\n\n${qaText}`,
      },
    ],
    max_completion_tokens: 4096,
  });

  return response.choices[0]?.message?.content || 'Summary generation failed.';
}

// Generate all 10 questions in one API call for instant navigation
export async function generateAllQuestions(brief: BriefSubmission): Promise<string[]> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `Generate exactly 10 personalized interview questions for a landing page client. Output ONLY a JSON array of 10 strings. No intro, no numbering, no markdown — just the raw JSON array.

## Client Brief:
- Company: ${brief.company_name}
- Website: ${brief.website || 'None yet'}
- Industry: ${brief.industry}
- Primary Goal: ${brief.primary_goal}
- Target Audience: ${brief.audience}
${brief.pain_points ? `- Pain Points: ${brief.pain_points}` : ''}
${brief.challenge ? `- Main Challenge: ${brief.challenge}` : ''}
${brief.notes ? `- Additional Notes: ${brief.notes}` : ''}

## Questions to Generate (one per topic, in order):
${QUESTION_TOPICS.map((t, i) => `${i + 1}. ${t.topic} — ${t.guidance}`).join('\n')}

## Rules:
- Each question: 1-2 sentences MAXIMUM. Direct and clear.
- Just the question — NO greetings, NO transitions, NO "Great answer!", NO filler
- Personalize using their company name, industry, and brief data
- Do NOT re-ask info already in the brief — go deeper
- Output format: ["question 1?", "question 2?", ..., "question 10?"]`,
      },
    ],
    max_completion_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content || '';

  // Parse JSON response
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length >= 10) return parsed.slice(0, 10);
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions.slice(0, 10);
  } catch {
    // Try extracting JSON array from text
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr) && arr.length >= 10) return arr.slice(0, 10);
      } catch { /* fall through to fallback */ }
    }
  }

  // Fallback: template-based questions
  return [
    `What brand personality and tone do you want ${brief.company_name}'s landing page to have — formal, friendly, bold, playful, minimal? What feeling should visitors leave with?`,
    `What's the single biggest thing that sets ${brief.company_name} apart from other ${brief.industry} businesses?`,
    `Who are your 2-3 main competitors? What do they do well on their websites, and where do they fall short?`,
    `Describe your ideal customer — age range, profession, biggest pain points, and what motivates them to buy.`,
    `How do most customers discover ${brief.company_name} today — Google, social media, referrals, ads, events?`,
    `What are your top 3 products or services ranked by importance? Which should be front-and-center on the page?`,
    `What social proof do you have — testimonials, case studies, awards, notable clients, impressive numbers?`,
    `Share 2-3 websites you love the look of. What appeals to you — colors, layout, typography, imagery? Anything you hate?`,
    `What's the ONE primary action you want visitors to take on this landing page?`,
    `What assets do you have ready — logo, brand colors, photos, copy, social links? What do you need help creating?`,
  ];
}

export { getOpenAI, QUESTION_TOPICS };
