#!/usr/bin/env tsx
/**
 * Generic runner for per-brand SEO content updates.
 * Loads a content module from scripts/brand-seo-pages/<slug>.ts and writes it to
 * brand_content in Neon (local or floral-prod).
 *
 * Usage:
 *   npx tsx scripts/run-brand-seo-update.ts --brand bare-equestrian
 *   npx tsx scripts/run-brand-seo-update.ts --brand bare-equestrian --floral-prod
 *   npx tsx scripts/run-brand-seo-update.ts --brand bare-equestrian --dry-run
 *   npx tsx scripts/run-brand-seo-update.ts --brand bare-equestrian --skip-revalidate
 *
 * After prod DB update, bust ISR: set REVALIDATE_SITE_URL (or NEXT_PUBLIC_SITE_URL),
 * INTERNAL_REVALIDATE_SECRET or REVALIDATE_SECRET - POSTs to /api/internal/revalidate-collection.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

export interface BrandFaqItem {
  question: string;
  answer: string;
}

export interface BrandSEOContent {
  handle: string;
  title: string;
  meta_title: string;
  meta_description: string;
  h1_title: string;
  short_description: string;
  long_description: string;
  breadcrumb_label?: string;
  faq_items?: BrandFaqItem[];
}

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) {
      throw new Error('POSTGRES_PASSWORD required in .env.local for --floral-prod');
    }
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL in .env.local');
  return cs;
}

function getBrandSlug(): string {
  const idx = process.argv.indexOf('--brand');
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error('Usage: npx tsx scripts/run-brand-seo-update.ts --brand <slug>');
  }
  return process.argv[idx + 1];
}

async function main() {
  const slug = getBrandSlug();
  const dryRun = process.argv.includes('--dry-run');

  const modulePath = resolve(process.cwd(), 'scripts', 'brand-seo-pages', `${slug}.ts`);
  let content: BrandSEOContent;
  try {
    const mod = (await import(modulePath)) as { default: BrandSEOContent };
    content = mod.default;
  } catch {
    throw new Error(`No content module found at scripts/brand-seo-pages/${slug}.ts`);
  }

  if (dryRun) {
    console.log('[dry-run] Would write to brand_content:');
    console.log(
      JSON.stringify(
        {
          ...content,
          short_description: '...trimmed...',
          long_description: '...trimmed...',
        },
        null,
        2
      )
    );
    return;
  }

  const sql = neon(resolveConnectionString());
  const faqJson = JSON.stringify(content.faq_items || []);
  const result = await sql`
    UPDATE brand_content
    SET
      title = ${content.title},
      h1_title = ${content.h1_title},
      meta_title = ${content.meta_title},
      meta_description = ${content.meta_description},
      short_description = ${content.short_description},
      long_description = ${content.long_description},
      breadcrumb_label = ${content.breadcrumb_label || content.title},
      faq_json = ${faqJson},
      status = 'published',
      updated_at = NOW()
    WHERE handle = ${content.handle}
    RETURNING handle, title, h1_title, meta_title
  `;

  if (!result.length) {
    throw new Error(`No brand_content row found for handle = "${content.handle}"`);
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
      body: JSON.stringify({ path: `/brands/${content.handle}` }),
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
