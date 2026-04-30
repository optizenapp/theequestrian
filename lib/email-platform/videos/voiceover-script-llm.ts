import OpenAI from 'openai';
import type { SlideCopy } from './copy-types';
import type { VoiceoverScriptKind } from './voiceover-script';

export type VoiceoverContext = {
  kind: VoiceoverScriptKind;
  subjectLine: string;
  displayName: string;
  slideCopy: SlideCopy;
  productTitles?: string[];
};

const SYSTEM_PROMPT = [
  'You write short voiceover scripts for The Equestrian, an Australian online retailer of premium horse riding gear.',
  'The voiceover plays under a ~16-second product video and is read by an Australian voice actor.',
  '',
  'Voice rules:',
  '- 28 to 36 words. Hard cap 36. Roughly 11 to 13 seconds spoken at a natural pace.',
  '- 2 to 3 short sentences. Brief pause-friendly rhythm.',
  '- Conversational Australian English. Calm authority. Knowledgeable rider.',
  '- Sentence case, complete sentences. Plain words.',
  '- End with a soft directive (e.g. "Have a look", "Take a look", "See the edit", "Now at The Equestrian"). Never "Buy now", "Hurry", "Don\'t miss out".',
  '',
  'Content rules:',
  '- Use the slide copy fields as CONTEXT. Do NOT read them verbatim.',
  '- Refer to the brand or category by name once, naturally.',
  '- If the subject line mentions specific products or a sale percentage, you may reference them.',
  '- Do NOT use these phrases: "premium quality", "top-tier", "game changer", "unleash", "elevate your", "limited-time savings", "hand-picked rider essentials", "discover the X collection", "don\'t miss out", "must-have", "selling fast".',
  '- Do NOT mention prices, percentages, materials, or claims that are not in the context.',
  '- No emojis, no hashtags, no URLs, no "&".',
  '',
  'Output: return JSON only with a single key "script" containing the voiceover text.',
].join('\n');

export async function generateVoiceoverScriptWithLlm(context: VoiceoverContext): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const openai = new OpenAI({ apiKey: key });
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.VIDEO_COPY_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(context) },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim() || '';
    if (!text) return null;
    const parsed = JSON.parse(text) as { script?: unknown };
    const script = typeof parsed.script === 'string' ? parsed.script.trim() : '';
    return cleanScript(script);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn(`[voiceover-script-llm] failed: ${message}`);
    return null;
  }
}

function buildPrompt(context: VoiceoverContext): string {
  const products = (context.productTitles || []).filter(Boolean).slice(0, 6);
  const productsBlock = products.length
    ? products.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '(no specific products supplied)';
  const sc = context.slideCopy;
  return [
    `Variant: ${context.kind}`,
    `Brand or category: ${context.displayName}`,
    `Subject line: ${context.subjectLine}`,
    `Featured products:\n${productsBlock}`,
    '',
    'On-screen slide copy (context only — paraphrase, never read verbatim):',
    `Slide 1: eyebrow="${sc.s1.eyebrow}" title="${sc.s1.title}" subtitle="${sc.s1.subtitle}"`,
    `Slide 2: eyebrow="${sc.s2.eyebrow}" title="${sc.s2.title}" subtitle="${sc.s2.subtitle}" cta="${sc.s2.cta}"`,
    `Slide 3: eyebrow="${sc.s3.eyebrow}" title="${sc.s3.title}"`,
    `Slide 4: eyebrow="${sc.s4.eyebrow}" title="${sc.s4.title}" cta="${sc.s4.cta}"`,
    '',
    'Write the voiceover script now. JSON: {"script":"..."}',
  ].join('\n');
}

function cleanScript(value: string): string {
  if (!value) return '';
  return value
    .replace(/\s+/g, ' ')
    .replace(/[`*_#>]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/[!]+/g, '.')
    .trim();
}

const BANNED_VO = [
  /\bpremium\s+quality\b/i,
  /\btop[- ]tier\b/i,
  /\bgame[- ]changer\b/i,
  /\bunleash\b/i,
  /\belevate\s+your\b/i,
  /\blimited[- ]time\s+savings\b/i,
  /\bhand[- ]picked\s+rider\s+essentials\b/i,
  /\bdiscover\s+the\s+\S+\s+collection\b/i,
  /\bdon'?t\s+miss\s+out\b/i,
  /\bmust[- ]have\b/i,
  /\bselling\s+fast\b/i,
];

export function isVoiceoverScriptUsable(script: string | null): script is string {
  if (!script) return false;
  const wordCount = script.split(/\s+/).filter(Boolean).length;
  if (wordCount < 22 || wordCount > 40) return false;
  if (script.length > 320) return false;
  if (BANNED_VO.some((re) => re.test(script))) return false;
  return true;
}
