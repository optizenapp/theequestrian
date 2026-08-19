#!/usr/bin/env tsx
/**
 * Read-only dump of collection facts for the subcollection content framework.
 *
 *   npx tsx scripts/inspect-subcollection-page.ts --path /horse/boots
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

function getPathArg(): string {
  const idx = process.argv.indexOf('--path');
  const raw = idx === -1 ? '' : process.argv[idx + 1] || '';
  if (!raw.startsWith('/')) {
    throw new Error('Usage: npx tsx scripts/inspect-subcollection-page.ts --path /horse/boots');
  }
  return raw.replace(/\/$/, '') || raw;
}

function preview(value: string | null, max = 160): string {
  if (!value) return '(empty)';
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

async function main() {
  const urlPath = getPathArg();
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL in .env.local');
  const sql = neon(cs);
  const parts = urlPath.split('/').filter(Boolean);

  const rows = await sql`
    SELECT url_path, h1_title, meta_title, meta_description, short_description,
           long_description, breadcrumb_label, parent_url, category_level, status,
           faq_items, related_categories, generated_by, version
    FROM collection_content
    WHERE url_path = ${urlPath}
  `;
  if (!rows.length) throw new Error(`No collection_content row for ${urlPath}`);
  const page = rows[0];

  const children = await sql`
    SELECT url_path, h1_title, breadcrumb_label, status
    FROM collection_content
    WHERE parent_url = ${urlPath} OR url_path LIKE ${`${urlPath}/%`}
    ORDER BY url_path
  `;

  const top = parts[0] || '';
  const parent = parts[1] || '';
  const mapping = parent
    ? await sql`
        SELECT subcategory_handle, product_type, action
        FROM collection_mapping
        WHERE top_level = ${top} AND parent_category = ${parent} AND action != 'exclude'
        ORDER BY subcategory_handle, product_type
      `
    : await sql`
        SELECT parent_category AS subcategory_handle, product_type, action
        FROM collection_mapping
        WHERE top_level = ${top} AND action != 'exclude'
        ORDER BY parent_category, product_type
      `;

  const combined = `${page.short_description || ''}\n${page.long_description || ''}`;
  const mentioned = [...combined.matchAll(/\/brands\/([a-z0-9-]+)/gi)].map((m) => m[1]);
  const uniqueMentioned = [...new Set(mentioned)];
  const publishedBrands = uniqueMentioned.length
    ? await sql`
        SELECT handle, title, status
        FROM brand_content
        WHERE status = 'published' AND handle = ANY(${uniqueMentioned})
        ORDER BY handle
      `
    : [];

  const childHandles = children
    .map((c) => String(c.url_path).slice(urlPath.length + 1).split('/')[0])
    .filter(Boolean);
  const uniqueChildren = [...new Set(childHandles)];
  const productTypes = [...new Set(mapping.map((r) => String(r.product_type || '').trim()).filter(Boolean))];

  console.log(JSON.stringify({
    url_path: page.url_path,
    status: page.status,
    category_level: page.category_level,
    parent_url: page.parent_url,
    generated_by: page.generated_by,
    version: page.version,
    h1_title: page.h1_title,
    meta_title: page.meta_title,
    meta_description: preview(String(page.meta_description || ''), 200),
    breadcrumb_label: page.breadcrumb_label,
    short_description: preview(String(page.short_description || '')),
    long_description: preview(String(page.long_description || ''), 240),
    faq_items: page.faq_items,
    related_categories: page.related_categories,
    published_children: children.map((c) => ({
      url_path: c.url_path,
      h1_title: c.h1_title,
      breadcrumb_label: c.breadcrumb_label,
      status: c.status,
    })),
    child_handles: uniqueChildren,
    mapping_product_types: productTypes,
    mapping_rows: mapping,
    published_brands_mentioned_in_copy: publishedBrands,
  }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
