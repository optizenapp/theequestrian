#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { sql } from '@vercel/postgres';

dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true });

type CsvBrandRow = {
  title?: string;
  handle?: string;
  products_count?: string;
  rules?: string;
  h1_title?: string;
  meta_title?: string;
  meta_description?: string;
  short_description?: string;
  long_description?: string;
  breadcrumb_label?: string;
  faq_json?: string;
};

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS brand_content (
      id SERIAL PRIMARY KEY,
      handle TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      products_count INTEGER DEFAULT 0,
      h1_title TEXT,
      meta_title TEXT,
      meta_description TEXT,
      short_description TEXT,
      long_description TEXT,
      breadcrumb_label TEXT,
      faq_json TEXT,
      status TEXT DEFAULT 'published',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_content_handle ON brand_content(handle)`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS products_count INTEGER DEFAULT 0`;
  await sql`ALTER TABLE brand_content ADD COLUMN IF NOT EXISTS rules TEXT`;
}

function parseProductsCount(raw: string | undefined): number {
  if (!raw) return 0;
  try {
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw) as { count?: number };
      return Number(parsed.count || 0);
    }
    return Number.parseInt(raw, 10) || 0;
  } catch {
    return 0;
  }
}

function normalizeText(value: string | undefined): string | null {
  const v = (value || '').trim();
  return v.length > 0 ? v : null;
}

async function main() {
  const csvPath = path.join(process.cwd(), 'exports', 'brand-mapping.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Missing CSV file: ${csvPath}`);
  }

  await ensureTable();

  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvBrandRow[];

  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const handle = (row.handle || '').trim();
    const title = (row.title || '').trim();
    if (!handle || !title) {
      skipped++;
      continue;
    }

    const productsCount = parseProductsCount(row.products_count);
    const h1 = normalizeText(row.h1_title) || title;
    const metaTitle = normalizeText(row.meta_title) || `${title} | The Equestrian`;
    const metaDescription =
      normalizeText(row.meta_description) ||
      `Shop the full range of ${title} equestrian products at The Equestrian.`;
    const shortDescription =
      normalizeText(row.short_description) || `Shop premium ${title} equestrian products.`;
    const longDescription =
      normalizeText(row.long_description) ||
      `<h2>${title}</h2><p>Discover our range of ${title} products at The Equestrian.</p>`;
    const breadcrumbLabel = normalizeText(row.breadcrumb_label) || title;
    const faqJson = normalizeText(row.faq_json) || '[]';
    const rules = normalizeText(row.rules) || null;

    await sql`
      INSERT INTO brand_content (
        handle,
        title,
        products_count,
        rules,
        h1_title,
        meta_title,
        meta_description,
        short_description,
        long_description,
        breadcrumb_label,
        faq_json,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${handle},
        ${title},
        ${productsCount},
        ${rules},
        ${h1},
        ${metaTitle},
        ${metaDescription},
        ${shortDescription},
        ${longDescription},
        ${breadcrumbLabel},
        ${faqJson},
        'published',
        NOW(),
        NOW()
      )
      ON CONFLICT (handle) DO UPDATE
      SET
        title = EXCLUDED.title,
        products_count = EXCLUDED.products_count,
        rules = COALESCE(EXCLUDED.rules, brand_content.rules),
        h1_title = COALESCE(NULLIF(EXCLUDED.h1_title, ''), brand_content.h1_title, EXCLUDED.title),
        meta_title = COALESCE(NULLIF(EXCLUDED.meta_title, ''), brand_content.meta_title),
        meta_description = COALESCE(NULLIF(EXCLUDED.meta_description, ''), brand_content.meta_description),
        short_description = COALESCE(NULLIF(EXCLUDED.short_description, ''), brand_content.short_description),
        long_description = COALESCE(NULLIF(EXCLUDED.long_description, ''), brand_content.long_description),
        breadcrumb_label = COALESCE(NULLIF(EXCLUDED.breadcrumb_label, ''), brand_content.breadcrumb_label),
        faq_json = COALESCE(NULLIF(EXCLUDED.faq_json, ''), brand_content.faq_json),
        status = 'published',
        updated_at = NOW()
    `;
    upserted++;
  }

  const summary = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'published')::int AS published
    FROM brand_content
  `;

  console.log(`Upserted: ${upserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`DB total: ${summary.rows[0]?.total ?? 0}`);
  console.log(`DB published: ${summary.rows[0]?.published ?? 0}`);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
