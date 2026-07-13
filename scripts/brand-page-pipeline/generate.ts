import OpenAI from 'openai';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { BrandInventory, BrandRule, BrandSEOContent, ResearchContext } from './types';

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function generateBrandContent(input: {
  inventory: BrandInventory;
  rules: BrandRule[];
  research: ResearchContext;
}): Promise<BrandSEOContent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required in .env.local');

  const logoPath = `/brands/logos/${input.inventory.handle}.png`;
  const hasLogo = existsSync(resolve(process.cwd(), 'public', 'brands', 'logos', `${input.inventory.handle}.png`));

  const openai = new OpenAI({ apiKey });
  const system = `You write SEO brand hub copy for The Equestrian (Australian equestrian retailer).
Return ONLY valid JSON matching this shape:
{
  "handle": string,
  "title": string,
  "breadcrumb_label": string,
  "meta_title": string,
  "meta_description": string,
  "h1_title": string,
  "quick_answer": string,
  "short_description": string,
  "long_description": string,
  "faq_items": [{"question": string, "answer": string}]
}
Rules:
- Australia shop framing; no GSC/process language.
- meta_title ~50-60 chars; meta_description ~150-160; meta ≠ h1.
- quick_answer entity-first ~40-60 words.
- short_description HTML must include <!--read-more-trigger-->.
- long_description starts with <h2>About …</h2>, then product-line <h3>s grounded ONLY in catalog titles; include ≥1 <ul>.
- Internal links: ONLY use the provided category paths as href values (never invent product PDP URLs).
- Shop framing: "at The Equestrian" / "in Australia" where natural.
- FAQ answers must be plain text (no HTML). 4-5 faq_items.
- Do not invent products not in the catalog sample.`;

  const user = `Handle: ${input.inventory.handle}
Display name: ${input.inventory.displayName}
Rules JSON: ${JSON.stringify(input.rules)}
Category paths: ${input.inventory.categoryPaths.join(', ')}
Product-line hints: ${input.research.productLineHints.join(', ')}

CATALOG:
${input.research.catalogSummary}

RESEARCH:
${input.research.serpSummary}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.4,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned empty content');
  const parsed = extractJson(text) as BrandSEOContent;

  const content: BrandSEOContent = {
    handle: input.inventory.handle,
    title: parsed.title || input.inventory.displayName,
    breadcrumb_label: parsed.breadcrumb_label || input.inventory.displayName,
    rules: input.rules,
    meta_title: parsed.meta_title,
    meta_description: parsed.meta_description,
    h1_title: parsed.h1_title,
    quick_answer: parsed.quick_answer,
    short_description: parsed.short_description,
    long_description: parsed.long_description,
    faq_items: parsed.faq_items || [],
  };
  if (hasLogo) content.logo_url = logoPath;
  return content;
}
