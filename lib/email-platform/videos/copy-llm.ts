import OpenAI from 'openai';
import type { SlideCopy, SlideCopyContext } from './copy-types';

export async function generateSlideCopyWithLlm(
  context: SlideCopyContext,
  baseline: SlideCopy
): Promise<unknown | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const openai = new OpenAI({ apiKey: key });
  const prompt = buildPrompt(context, baseline);
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.VIDEO_COPY_MODEL || 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim() || '';
    if (!text) return null;
    return JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn(`[video-copy-llm] failed: ${message}`);
    return null;
  }
}

const SYSTEM_PROMPT = [
  'You are a senior DTC ecommerce copywriter for The Equestrian, an Australian online retailer of premium horse riding gear, apparel, tack and stable supplies.',
  'You write short on-screen copy for 15-30 second product videos shown on YouTube, Instagram, TikTok and Facebook.',
  '',
  'Brand voice:',
  '- Knowledgeable rider talking to riders. Calm authority, never hype.',
  '- Premium but grounded. Quietly confident, not luxurious or aspirational fluff.',
  '- Australian English spelling and idiom (colour, favourite, paddock, arena, hack, float).',
  '- Concrete, sensory, specific. Reference the actual product, discipline, weather, terrain or use-case.',
  '- Short. Plain. Sentence case unless it is a proper noun, brand or 2-3 word eyebrow label.',
  '',
  'Do not:',
  '- Do not use generic ecommerce filler. Banned phrases include: "Discover the X collection", "Hand-picked rider essentials", "Limited stock at sale prices", "Premium quality", "Top-tier", "Game changer", "Unleash", "Elevate your", "Don\'t miss out", "Hurry", "Selling fast", "Must have", "Limited-time savings".',
  '- Do not invent prices, percentages, brands, materials, claims or stock levels not given in context.',
  '- Do not stack two action verbs (e.g. "Shop the Explore"). Use one action verb in CTAs.',
  '- Do not use emojis, hashtags, markdown, brackets, or "&".',
  '- Do not be sensationalist. No exclamation marks. No ALL CAPS except short eyebrow labels of 1-2 words.',
  '- Do not repeat the same phrasing across slides s2/s3/s4.',
  '- Do not quote the brand/category about text verbatim. Always paraphrase a single concrete benefit.',
  '',
  'Output rules:',
  '- Return JSON only. Match the input schema keys exactly: s1, s2, s3, s4 with the same field names.',
  '- Respect length limits stated in the user message. If you go over a cap, your output is rejected.',
  '- Eyebrows are 1-3 word category labels, Title Case, no punctuation.',
  '- CTAs are 2-4 word commands starting with one verb (Shop, Explore, Browse, See, View).',
  '- s2.linkText rules: brand and on_sale → a short readable URL with NO protocol and NO "www." prefix (e.g. "theequestrian.com.au/on-sale"). category → empty string "".',
].join('\n');

function buildPrompt(context: SlideCopyContext, baseline: SlideCopy): string {
  const products = (context.productTitles || []).filter(Boolean).slice(0, 6);
  const productsBlock = products.length
    ? products.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '(no specific products supplied — write at the category level, do not invent product names)';

  const variantBrief = buildVariantBrief(context);

  return [
    `Variant: ${context.variant}`,
    `Subject line (primary creative anchor): ${context.subjectLine}`,
    `Display name (brand, sale theme or category): ${context.displayName || '(none)'}`,
    `Category handle (URL slug, lowercase, never display): ${context.categoryHandle || '(none)'}`,
    `Brand/category context: ${truncate(context.aboutText, 400)}`,
    `Featured products in this video:\n${productsBlock}`,
    `CTA destination URL (do not include in copy): ${context.ctaUrl}`,
    '',
    'Variant brief:',
    variantBrief,
    '',
    'Length limits (characters, hard caps):',
    '- s1.eyebrow ≤ 28, s1.title ≤ 84, s1.subtitle ≤ 84',
    '- s2.eyebrow ≤ 28, s2.title ≤ 60, s2.subtitle ≤ 110, s2.cta ≤ 28, s2.linkText ≤ 60',
    '- s3.eyebrow ≤ 28, s3.title ≤ 60',
    '- s4.eyebrow ≤ 28, s4.title ≤ 60, s4.cta ≤ 28',
    '',
    'Baseline (rewrite to be specific and on-brand, do not copy verbatim):',
    JSON.stringify(baseline, null, 2),
    '',
    'Return the rewritten JSON object only.',
  ].join('\n');
}

function buildVariantBrief(context: SlideCopyContext): string {
  const name = context.displayName || 'this collection';
  const ctaPath = pathFromUrl(context.ctaUrl);
  if (context.variant === 'on_sale') {
    return [
      '- Theme: a curated sale edit. Frame it as smart timing for a known need (winter rugs, show season, hack hacks), not panic-buying.',
      '- s1.eyebrow: short label like "On Sale" or "This Week".',
      '- s1.title: rephrase the subject line into a clear, specific hook (refer to a discipline, season, or rider need if obvious from subject). If the subject mentions specific products, you may keep them.',
      '- s2: give one concrete reason a rider would shop this sale (e.g. "Refresh your winter layering", "Restock arena basics"). CTA verb: "Shop". Keep s2.subtitle a single short sentence ≤110 characters.',
      `- s2.linkText: must be exactly "theequestrian.com.au${ctaPath}" (no protocol, no www).`,
      '- s3.title: a short pick label (e.g. "Editor\'s picks", "Rider favourites this week").',
      '- s4: closing nudge tied to the sale theme. CTA verb: "Shop" or "See".',
    ].join('\n');
  }
  if (context.variant === 'category') {
    return [
      `- Theme: spotlight on the ${name} category. Talk like a rider who knows what to look for in this category.`,
      '- s1.eyebrow: a short category label, not "Featured Category". Use the category name or a tight descriptor (e.g. "Footwear", "Riding Boots").',
      '- s1.title: rewrite the subject line into a tight, specific hook about the category (mention a fit, terrain, discipline or use-case if clear).',
      `- s2: one rider-useful reason to shop the ${name} edit (fit, comfort, durability, season). CTA: "Shop ${name}". s2.subtitle is a single short sentence ≤110 characters.`,
      '- s2.linkText: empty string "".',
      `- s3.title: short curation label (e.g. "${name} we rate", "New in ${name}", "Rider favourites").`,
      `- s4: closing nudge. CTA verb: "Shop", "Browse" or "See" + ${name}.`,
    ].join('\n');
  }
  return [
    `- Theme: brand spotlight on ${name}. Use the about text and product names to ground specifics (materials, craftsmanship, country of origin, design philosophy if mentioned).`,
    '- s1.eyebrow: short label like "Featured Brand" or just the brand name.',
    '- s1.title: tight rewrite of the subject line that signals what makes this brand worth a look. ≤72 characters.',
    `- s2.title: a specific reason riders choose ${name} (e.g. "Designed for long arena days", "Built around real rider feedback").`,
    '- s2.subtitle: ONE short paraphrased sentence ≤110 characters drawn from the about text. NEVER quote the about text verbatim. Pick one concrete benefit.',
    `- s2.cta: "Explore ${name}" or "Shop ${name}".`,
    `- s2.linkText: must be exactly "theequestrian.com.au${ctaPath}" (no protocol, no www).`,
    `- s3.title: short curation label (e.g. "Standouts from ${name}", "${name} essentials").`,
    `- s4: closing nudge. CTA: "Shop ${name}" or "Explore ${name}".`,
  ].join('\n');
}

function pathFromUrl(ctaUrl: string): string {
  try {
    const u = new URL(ctaUrl);
    const p = u.pathname.replace(/\/+$/, '') || '/';
    return p;
  } catch {
    return '';
  }
}

function truncate(value: string, max: number): string {
  const clean = (value || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}
