#!/usr/bin/env tsx
/**
 * Report Ariat luggage/bag candidates under /rider/luggage, then apply approved handles
 * to /rider/luggage/ariat.
 *
 * Report: npx tsx scripts/allocate-ariat-luggage.ts
 * Apply:  npx tsx scripts/allocate-ariat-luggage.ts --apply --approved-file exports/ariat-luggage-approved-handles.txt
 * Prod:   add --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

const FLORAL_WIND_POOLER =
  'ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech';

const TARGET = '/rider/luggage/ariat';
const CANDIDATE_CSV = 'exports/ariat-luggage-candidates.csv';

const LUGGAGE_TYPES = [
  'RIDER: Luggage',
  'Wallets & Handbags',
  'Luggage',
  'Bag',
  'Gear Bag',
  'Accessories - Luggage',
  'Handbag',
  'Wallet',
  'Saddle Bag',
  'Bags',
  'backpack',
] as const;

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  if (process.argv.includes('--floral-prod')) {
    const user = process.env.POSTGRES_USER || 'neondb_owner';
    const password = process.env.POSTGRES_PASSWORD;
    if (!password) throw new Error('POSTGRES_PASSWORD required for --floral-prod');
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${FLORAL_WIND_POOLER}/neondb?sslmode=require&channel_binding=require`;
  }
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL');
  return cs;
}

function parseApprovedFile(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

async function main() {
  const sql = neon(resolveConnectionString());
  const apply = process.argv.includes('--apply');
  const idx = process.argv.indexOf('--approved-file');
  const approvedPath =
    idx !== -1 && process.argv[idx + 1] ? resolve(process.cwd(), process.argv[idx + 1]) : '';

  if (apply) {
    if (!approvedPath || !fs.existsSync(approvedPath)) {
      throw new Error('Use --apply --approved-file <path> with a file of handles (one per line).');
    }
    const handles = parseApprovedFile(approvedPath);
    for (const handle of handles) {
      const rows = await sql`
        SELECT id, handle FROM products WHERE handle = ${handle} LIMIT 1
      `;
      const row = rows[0] as { id: string; handle: string } | undefined;
      if (!row) {
        console.warn(`Skip unknown handle: ${handle}`);
        continue;
      }
      const norm = TARGET;
      const parts = norm.replace(/^\//, '').split('/').filter(Boolean);
      const top = parts[0] ?? '';
      const parent = parts[1] ?? null;
      const sub = parts[2] ?? null;
      const canon = `${norm}/${row.handle}`;
      await sql`
        INSERT INTO product_category_assignments (
          product_id, product_handle, canonical_path, category_path,
          top_level, parent_category, subcategory_handle, updated_at
        ) VALUES (
          ${row.id}, ${row.handle}, ${canon}, ${norm},
          ${top}, ${parent}, ${sub}, NOW()
        )
        ON CONFLICT (product_id) DO UPDATE SET
          product_handle = EXCLUDED.product_handle,
          canonical_path = EXCLUDED.canonical_path,
          category_path = EXCLUDED.category_path,
          top_level = EXCLUDED.top_level,
          parent_category = EXCLUDED.parent_category,
          subcategory_handle = EXCLUDED.subcategory_handle,
          updated_at = NOW()
      `;
      console.log(`Allocated: ${row.handle}`);
    }
    return;
  }

  const rows = await sql`
    SELECT DISTINCT ON (p.handle)
      p.id,
      p.handle,
      p.title,
      p.product_type,
      pca.category_path AS current_category_path
    FROM products p
    INNER JOIN product_category_assignments pca
      ON pca.product_id = p.id OR pca.product_handle = p.handle
    WHERE (pca.category_path = '/rider/luggage' OR pca.category_path LIKE '/rider/luggage/%')
      AND LOWER(TRIM(COALESCE(p.brand, ''))) = 'ariat'
      AND (
        p.product_type = ANY(${LUGGAGE_TYPES})
        OR lower(coalesce(p.title, '')) LIKE '%bag%'
        OR lower(coalesce(p.title, '')) LIKE '%luggage%'
        OR lower(coalesce(p.title, '')) LIKE '%wallet%'
        OR lower(coalesce(p.title, '')) LIKE '%backpack%'
      )
    ORDER BY p.handle, pca.category_path
  `;

  const list = rows as Array<{
    id: string;
    handle: string;
    title: string;
    product_type: string | null;
    current_category_path: string;
  }>;

  const header = 'handle,title,product_type,current_category_path\n';
  const body = list
    .map((r) =>
      [r.handle, r.title, r.product_type ?? '', r.current_category_path]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
  fs.mkdirSync(resolve(process.cwd(), 'exports'), { recursive: true });
  fs.writeFileSync(resolve(process.cwd(), CANDIDATE_CSV), header + body + '\n');
  console.log(`Wrote ${list.length} candidates to ${CANDIDATE_CSV}`);
  console.log('Review, copy handles to exports/ariat-luggage-approved-handles.txt, then:');
  console.log(
    '  npx tsx scripts/allocate-ariat-luggage.ts --apply --approved-file exports/ariat-luggage-approved-handles.txt'
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
