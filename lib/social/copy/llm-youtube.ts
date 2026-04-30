import OpenAI from 'openai';
import { SOCIAL_LINKS, STORE_URL } from '@/lib/social/social-links';
import type { YoutubeCopyContext, YoutubePostCopy } from './types';

const SYSTEM_PROMPT = [
  'You are a senior ecommerce social media manager for The Equestrian, an Australian online retailer of premium horse riding gear, apparel, tack and stable supplies.',
  'You write YouTube post metadata for short product videos shown on the @theequestrianoz channel.',
  '',
  'Voice:',
  '- Knowledgeable rider talking to riders. Calm authority. Australian English.',
  '- Premium but grounded. Specific, never sensationalist.',
  '- Emojis are REQUIRED on section headers. Never put emojis in the title.',
  '',
  'Source of truth (in this priority order):',
  '1. The on-screen slide copy supplied in the prompt — this is what viewers actually see and hear.',
  '2. The voiceover script supplied in the prompt — this is what viewers hear.',
  '3. The supplied brand/category context.',
  'The subject line is internal email marketing copy. Treat it as a hint only. Never restate it verbatim if it conflicts with the slide copy or voiceover.',
  '',
  'Description structure (use real line breaks; one blank line between paragraphs):',
  '1. Opening hook — start with ✨ then 1-2 sentences that summarise the on-screen slide copy and voiceover. Do NOT pull claims from the subject line that are absent from the slides/voiceover.',
  '2. Section header "🛍️ Featured in this video:" then list each product as "• {title} — {url}" exactly. One per line. Use the product list provided. Do not invent products.',
  '3. Single line "🛒 Shop the {collectionLabel}: {collectionUrl}". Skip if no collection is provided.',
  `4. Single line "🌐 Browse the store: ${STORE_URL}".`,
  '5. Single line "📲 Follow @theequestrian" then 3 lines: "Instagram: {url}", "Facebook: {url}", "YouTube: {url}" — exactly as supplied.',
  '6. Final line: 3-6 hashtags separated by spaces (no commas).',
  '',
  'Sale language rules:',
  '- ONLY use words like "sale", "save", "discount", "% off", "deal", "savings", "exclusive sale", "limited-time" when mode is "on_sale_slides_v1".',
  '- For brand_slides_v1, category_slides_v1 and default_single_scene: do NOT mention sales, discounts, savings, promo, or limited time even if the subject line implies them.',
  '- Title and description must reflect what is actually on screen. If the slides do not show a sale badge or sale price, do not claim a sale.',
  '',
  'Hard rules:',
  '- Title: under 100 characters, no emojis, no hashtags except #Shorts when variant is vertical_9_16.',
  '- Description: under 4500 characters. Real newlines, not literal "\\n". Use blank lines between paragraphs.',
  '- Use ONLY the product, collection, store and social URLs supplied. Do not invent or shorten URLs.',
  '- Do not use these phrases: "premium quality", "top-tier", "game changer", "unleash", "elevate your", "limited-time savings", "hand-picked rider essentials", "discover the X collection", "don\'t miss out", "must-have", "selling fast", "hurry".',
  '- Do not invent prices, percentages, materials, claims or stock levels.',
  '- 5-10 SEO tags in tags[]. 3-6 hashtags in hashtags[]. For vertical_9_16, hashtags must include #Shorts.',
  '',
  'Return JSON only with keys: title, description, tags, hashtags, madeForKids.',
].join('\n');

export async function generateYoutubeCopyWithLlm(
  context: YoutubeCopyContext,
  baseline: YoutubePostCopy
): Promise<unknown | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const openai = new OpenAI({ apiKey: key });
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.YOUTUBE_COPY_MODEL || process.env.VIDEO_COPY_MODEL || 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(context, baseline) },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim() || '';
    if (!text) return null;
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_llm_error';
    console.warn(`[youtube-copy-llm] failed: ${message}`);
    return null;
  }
}

function formatSlideCopyBlock(slideCopy: YoutubeCopyContext['slideCopy']): string {
  if (!slideCopy) return '(no slide copy supplied)';
  const sections: string[] = [];
  const s1 = slideCopy.s1;
  if (s1 && (s1.eyebrow || s1.title || s1.subtitle)) {
    sections.push(`Slide 1 (cover): eyebrow="${s1.eyebrow || ''}" title="${s1.title || ''}" subtitle="${s1.subtitle || ''}"`);
  }
  const s2 = slideCopy.s2;
  if (s2 && (s2.eyebrow || s2.title || s2.subtitle || s2.cta)) {
    sections.push(`Slide 2 (story): eyebrow="${s2.eyebrow || ''}" title="${s2.title || ''}" subtitle="${s2.subtitle || ''}" cta="${s2.cta || ''}"`);
  }
  const s3 = slideCopy.s3;
  if (s3 && (s3.eyebrow || s3.title)) {
    sections.push(`Slide 3 (products): eyebrow="${s3.eyebrow || ''}" title="${s3.title || ''}"`);
  }
  const s4 = slideCopy.s4;
  if (s4 && (s4.eyebrow || s4.title || s4.cta)) {
    sections.push(`Slide 4 (CTA): eyebrow="${s4.eyebrow || ''}" title="${s4.title || ''}" cta="${s4.cta || ''}"`);
  }
  return sections.length ? sections.join('\n') : '(no slide copy supplied)';
}

function buildPrompt(context: YoutubeCopyContext, baseline: YoutubePostCopy): string {
  const products = (context.productLinks || []).slice(0, 6);
  const productsBlock = products.length
    ? products.map((p) => `• ${p.title} — ${p.url}`).join('\n')
    : '(no specific products supplied — skip the featured products section)';
  const collectionLine = context.collectionLabel && context.collectionUrl
    ? `Shop the ${context.collectionLabel}: ${context.collectionUrl}`
    : '(no collection — skip this line)';
  const slideBlock = formatSlideCopyBlock(context.slideCopy);
  const voiceLine = context.voiceoverScript ? context.voiceoverScript.trim() : '(no voiceover script supplied)';
  const saleAllowed = context.mode === 'on_sale_slides_v1';
  return [
    `Variant: ${context.variant}`,
    `Mode: ${context.mode}`,
    `Sale language allowed: ${saleAllowed ? 'YES' : 'NO — do not use sale, discount, save, % off, deal, savings, limited-time, exclusive sale.'}`,
    `Brand: ${context.brandName || '(none)'}`,
    `Category: ${context.categoryName || '(none)'}`,
    '',
    'On-screen slide copy (PRIMARY source of truth):',
    slideBlock,
    '',
    `Voiceover script (SECONDARY source of truth): ${voiceLine}`,
    '',
    `Subject line (HINT ONLY — do not restate verbatim): ${context.subjectLine}`,
    '',
    'Featured products (use exactly these lines in the description):',
    productsBlock,
    '',
    `Collection line (use exactly this if applicable): ${collectionLine}`,
    `Store line: Browse the store: ${STORE_URL}`,
    'Follow block (use these 4 lines exactly):',
    'Follow @theequestrian',
    `Instagram: ${SOCIAL_LINKS.instagram}`,
    `Facebook: ${SOCIAL_LINKS.facebook}`,
    `YouTube: ${SOCIAL_LINKS.youtube}`,
    '',
    'Baseline JSON (rewrite the title and description so they match the on-screen slide copy and voiceover; keep tags/hashtags reasonable):',
    JSON.stringify(baseline, null, 2),
    '',
    'Return the final JSON object only.',
  ].join('\n');
}
