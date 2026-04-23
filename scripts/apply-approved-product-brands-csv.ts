#!/usr/bin/env tsx
/**
 * Apply two-column CSV: handle,brand → updates products.brand
 *
 * Usage: npx tsx scripts/apply-approved-product-brands-csv.ts exports/your-approved.csv
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import { sql } from '@/lib/db/client';
import { slugFromBrandName } from '@/lib/brands/brand-slug';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

type Row = { handle: string; brand: string };

async function main(): Promise<void> {
  const csvPath = process.argv[2];
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error('Usage: npx tsx scripts/apply-approved-product-brands-csv.ts <path-to.csv>');
    process.exit(1);
  }

  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT`;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_hub_handle TEXT`;

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Row[];

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const handle = (row.handle || '').trim();
    const brand = (row.brand || '').trim();
    if (!handle) {
      skipped++;
      continue;
    }
    const hub = brand ? slugFromBrandName(brand) : null;
    const result = (await sql`
      UPDATE products
      SET brand = ${brand || null},
          brand_hub_handle = ${hub},
          updated_at = NOW()
      WHERE handle = ${handle}
      RETURNING handle
    `) as unknown as Array<{ handle: string }>;
    if (result.length > 0) updated++;
    else skipped++;
  }

  console.log(`Rows in CSV: ${rows.length}, updated: ${updated}, skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
