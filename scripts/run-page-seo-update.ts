#!/usr/bin/env tsx
/**
 * Generic runner for per-page SEO content updates.
 * Loads a content module from scripts/seo-pages/<slug>.ts and writes it to
 * collection_content in Neon (local or floral-prod).
 *
 * Usage:
 *   npx tsx scripts/run-page-seo-update.ts --page horse-rugs
 *   npx tsx scripts/run-page-seo-update.ts --page horse-rugs --floral-prod
 *   npx tsx scripts/run-page-seo-update.ts --page horse-rugs --dry-run
 *   npx tsx scripts/run-page-seo-update.ts --page horse-rugs --skip-revalidate
 *
 * After prod DB update, bust ISR: set REVALIDATE_SITE_URL (or NEXT_PUBLIC_SITE_URL),
 * INTERNAL_REVALIDATE_SECRET or REVALIDATE_SECRET — POSTs to /api/internal/revalidate-collection.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

export interface PageFaqItem {
  question: string;
  answer: string;
}

export interface PageSEOContent {
  /** e.g. "/horse/rugs" — must match existing collection_content row */
  url_path: string;
  /** <title> tag / SERP snippet — NOT the on-page H1 (50-60 chars) */
  meta_title: string;
  /** Meta description shown in SERP (150-160 chars) */
  meta_description: string;
  /** On-page H1 — must differ from meta_title */
  h1_title: string;
  /**
   * Visible intro above Read More.
   * Place <!--read-more-trigger--> on its own line to split collapsed/expanded text.
   */
  short_description: string;
  /**
   * Full below-grid HTML — written in this order per layout rules:
   *   1. Core section (<h2> … explained)
   *   2. GSC cluster <h3> sections
   *   3. Brand block (if brands appear in GSC + brand pages exist)
   *   4. Optional bullet section (<ul>) for scannable points
   * Prefer FAQs in `faq_items` (toggle + schema), not duplicate HTML FAQ blocks.
   * Required: at least one `<ul>` in long_description and at least 4 internal
   * `<a href="/...">` links across short_description + long_description combined
   * (validated unless --skip-below-grid-validation).
   */
  long_description: string;
  /** Short name for breadcrumb nav — usually 1-3 words */
  breadcrumb_label?: string;
  /** Toggle FAQ accordion + FAQ schema source. Prefer this over inline FAQ HTML. */
  faq_items?: PageFaqItem[];
}

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

const PROCESS_LANGUAGE_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'search demand', regex: /\bsearch demand\b/i },
  { label: 'queries such as', regex: /\bqueries such as\b/i },
  { label: 'this page also', regex: /\bthis page also\b/i },
  { label: 'picks up intent', regex: /\bpicks up intent\b/i },
  { label: 'intent around', regex: /\bintent around\b/i },
  { label: 'showing in search data', regex: /\bshowing in search data\b/i },
  { label: 'relevant to current search demand', regex: /\brelevant to current search demand\b/i },
  { label: 'gsc', regex: /\bgsc\b/i },
];

function assertNoProcessLanguage(content: PageSEOContent): void {
  const skipGuard = process.argv.includes('--allow-process-language');
  if (skipGuard) return;

  const fieldsToCheck: Array<{ field: string; value: string }> = [
    { field: 'meta_title', value: content.meta_title },
    { field: 'meta_description', value: content.meta_description },
    { field: 'h1_title', value: content.h1_title },
    { field: 'short_description', value: content.short_description },
    { field: 'long_description', value: content.long_description },
  ];

  for (const faq of content.faq_items || []) {
    fieldsToCheck.push({ field: 'faq_items.question', value: faq.question });
    fieldsToCheck.push({ field: 'faq_items.answer', value: faq.answer });
  }

  const hits: string[] = [];
  for (const { field, value } of fieldsToCheck) {
    for (const pattern of PROCESS_LANGUAGE_PATTERNS) {
      if (pattern.regex.test(value)) {
        hits.push(`${field}: "${pattern.label}"`);
      }
    }
  }

  if (hits.length > 0) {
    throw new Error(
      [
        `Process language detected in scripts/seo-pages content module for "${content.url_path}".`,
        ...hits.map((hit) => ` - ${hit}`),
        'Rewrite customer-facing copy and run again, or pass --allow-process-language to override intentionally.',
      ].join('\n')
    );
  }
}

const MIN_INTERNAL_LINKS = 4;

/** Count relative internal links only (href starting with single `/`, not `//`). */
function countInternalAnchorLinks(html: string): number {
  const re = /<a\b[^>]*\bhref\s*=\s*["'](\/[^"'#?]*)["']/gi;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = re.exec(html)) !== null) {
    const path = match[1];
    if (path && !path.startsWith('//')) n += 1;
  }
  return n;
}

function assertBelowGridCategoryRules(content: PageSEOContent): void {
  if (process.argv.includes('--skip-below-grid-validation')) return;

  if (!/<ul\b/i.test(content.long_description)) {
    throw new Error(
      `Below-grid validation failed for "${content.url_path}": long_description must include at least one <ul> bullet list.`
    );
  }

  const combined = `${content.short_description}\n${content.long_description}`;
  const linkCount = countInternalAnchorLinks(combined);
  if (linkCount < MIN_INTERNAL_LINKS) {
    throw new Error(
      `Below-grid validation failed for "${content.url_path}": need at least ${MIN_INTERNAL_LINKS} internal <a href="/..."> links across short_description + long_description (found ${linkCount}). Prefer same-category siblings first.`
    );
  }
}

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) throw new Error('POSTGRES_PASSWORD required in .env.local for --floral-prod');
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL in .env.local');
  return cs;
}

function getPageSlug(): string {
  const idx = process.argv.indexOf('--page');
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error('Usage: npx tsx scripts/run-page-seo-update.ts --page <slug>');
  }
  return process.argv[idx + 1];
}

function unwrapPageModule(
  mod: unknown
): PageSEOContent {
  let current = mod;

  while (
    current &&
    typeof current === 'object' &&
    'default' in current &&
    typeof current.default === 'object' &&
    current.default !== null
  ) {
    current = current.default;
  }

  if (
    !current ||
    typeof current !== 'object' ||
    !('url_path' in current) ||
    typeof current.url_path !== 'string'
  ) {
    throw new Error('SEO content module must export a default PageSEOContent object');
  }

  return current as PageSEOContent;
}

async function main() {
  const slug = getPageSlug();
  const DRY = process.argv.includes('--dry-run');

  const modulePath = resolve(process.cwd(), 'scripts', 'seo-pages', `${slug}.ts`);
  let content: PageSEOContent;
  try {
    const mod = await import(modulePath);
    content = unwrapPageModule(mod);
  } catch {
    throw new Error(`No content module found at scripts/seo-pages/${slug}.ts`);
  }

  assertNoProcessLanguage(content);
  assertBelowGridCategoryRules(content);

  if (DRY) {
    console.log('[dry-run] Would write to collection_content:');
    console.log(JSON.stringify({ ...content, long_description: '…trimmed…', short_description: '…trimmed…' }, null, 2));
    return;
  }

  const sql = neon(resolveConnectionString());
  const faqJson = JSON.stringify(content.faq_items || []);
  const result = await sql`
    UPDATE collection_content
    SET
      meta_title        = ${content.meta_title},
      meta_description  = ${content.meta_description},
      h1_title          = ${content.h1_title},
      short_description = ${content.short_description},
      long_description  = ${content.long_description},
      ${content.breadcrumb_label ? sql`breadcrumb_label = ${content.breadcrumb_label},` : sql``}
      faq_items         = ${faqJson}::jsonb,
      generated_by      = 'manual',
      version           = COALESCE(version, 1) + 1
    WHERE url_path = ${content.url_path}
    RETURNING id, url_path, version, meta_title, h1_title
  `;

  if (!result.length) {
    throw new Error(`No collection_content row found for url_path = "${content.url_path}"`);
  }
  console.log('Updated:', result[0]);

  if (process.argv.includes('--skip-revalidate')) return;

  const base = (process.env.REVALIDATE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const secret = process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET || '';
  if (!base || !secret) {
    console.log(
      '[revalidate] Skip: set REVALIDATE_SITE_URL (or NEXT_PUBLIC_SITE_URL) and INTERNAL_REVALIDATE_SECRET to bust ISR after deploy'
    );
    return;
  }

  try {
    const res = await fetch(`${base}/api/internal/revalidate-collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ path: content.url_path }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn('[revalidate]', res.status, text.slice(0, 300));
    } else {
      console.log('[revalidate]', text);
    }
  } catch (e) {
    console.warn('[revalidate] fetch failed:', e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
