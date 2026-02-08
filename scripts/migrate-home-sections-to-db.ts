/**
 * Migrate home-sections CSV into Postgres (home_sections table)
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { sql } from '@/lib/db/client';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface CsvRow {
  key: string;
  type: string;
  enabled?: string;
  sort_order?: string;
  eyebrow?: string;
  title_html?: string;
  subtitle_html?: string;
  body_html?: string;
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  image_url?: string;
  image_alt?: string;
  image_link?: string;
  most_wanted_items_json?: string;
  product_handles?: string;
  faqs_json?: string;
  seen_in_json?: string;
  items_json?: string;
}

const toBool = (value?: string, defaultValue = true) => {
  if (value == null) return defaultValue;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(v)) return true;
  if (['0', 'false', 'no', 'n'].includes(v)) return false;
  return defaultValue;
};

const toInt = (value?: string, defaultValue = 0) => {
  if (value == null) return defaultValue;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : defaultValue;
};

const safeJson = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed;
  } catch (error) {
    console.warn('Failed to parse JSON:', trimmed.slice(0, 100));
    return null;
  }
};

async function ensureHomeSectionsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS home_sections (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      eyebrow TEXT,
      title_html TEXT,
      subtitle_html TEXT,
      body_html TEXT,
      cta_text TEXT,
      cta_link TEXT,
      secondary_cta_text TEXT,
      secondary_cta_link TEXT,
      image_url TEXT,
      image_alt TEXT,
      image_link TEXT,
      most_wanted_items_json JSONB,
      product_handles TEXT,
      faqs_json JSONB,
      seen_in_json JSONB,
      items_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function main() {
  const csvPath = path.join(process.cwd(), 'exports', 'home-sections.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  await ensureHomeSectionsTable();
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CsvRow[];

  for (const row of records) {
    const key = (row.key || '').trim();
    const type = (row.type || '').trim();
    if (!key || !type) continue;

    const mostWantedJson = safeJson(row.most_wanted_items_json);
    const faqsJson = safeJson(row.faqs_json);
    const seenInJson = safeJson(row.seen_in_json);
    const itemsJson = safeJson(row.items_json);

    await sql`
      INSERT INTO home_sections (
        key,
        type,
        enabled,
        sort_order,
        eyebrow,
        title_html,
        subtitle_html,
        body_html,
        cta_text,
        cta_link,
        secondary_cta_text,
        secondary_cta_link,
        image_url,
        image_alt,
        image_link,
        most_wanted_items_json,
        product_handles,
        faqs_json,
        seen_in_json,
        items_json,
        updated_at
      ) VALUES (
        ${key},
        ${type},
        ${toBool(row.enabled, true)},
        ${toInt(row.sort_order, 0)},
        ${row.eyebrow || null},
        ${row.title_html || null},
        ${row.subtitle_html || null},
        ${row.body_html || null},
        ${row.cta_text || null},
        ${row.cta_link || null},
        ${row.secondary_cta_text || null},
        ${row.secondary_cta_link || null},
        ${row.image_url || null},
        ${row.image_alt || null},
        ${row.image_link || null},
        ${mostWantedJson ? JSON.stringify(mostWantedJson) : null},
        ${row.product_handles || null},
        ${faqsJson ? JSON.stringify(faqsJson) : null},
        ${seenInJson ? JSON.stringify(seenInJson) : null},
        ${itemsJson ? JSON.stringify(itemsJson) : null},
        NOW()
      )
      ON CONFLICT (key) DO UPDATE
      SET
        type = EXCLUDED.type,
        enabled = EXCLUDED.enabled,
        sort_order = EXCLUDED.sort_order,
        eyebrow = EXCLUDED.eyebrow,
        title_html = EXCLUDED.title_html,
        subtitle_html = EXCLUDED.subtitle_html,
        body_html = EXCLUDED.body_html,
        cta_text = EXCLUDED.cta_text,
        cta_link = EXCLUDED.cta_link,
        secondary_cta_text = EXCLUDED.secondary_cta_text,
        secondary_cta_link = EXCLUDED.secondary_cta_link,
        image_url = EXCLUDED.image_url,
        image_alt = EXCLUDED.image_alt,
        image_link = EXCLUDED.image_link,
        most_wanted_items_json = EXCLUDED.most_wanted_items_json,
        product_handles = EXCLUDED.product_handles,
        faqs_json = EXCLUDED.faqs_json,
        seen_in_json = EXCLUDED.seen_in_json,
        items_json = EXCLUDED.items_json,
        updated_at = NOW()
    `;
  }

  console.log(`✅ Migrated ${records.length} home sections into Postgres`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
