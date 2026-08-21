#!/usr/bin/env tsx
/**
 * Merge duplicate brand hubs into canonical handles (301 map in hub-consolidations).
 *
 *   npx tsx scripts/merge-duplicate-brand-hubs.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { BRAND_HUB_MERGES } from '@/lib/brands/hub-consolidations';
import { resolveConnectionString } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

type Rule = { column?: string; relation?: string; condition?: string };

function ruleKey(rule: Rule): string {
  return `${(rule.column || '').toUpperCase()}|${(rule.relation || 'EQUALS').toUpperCase()}|${(rule.condition || '').toLowerCase()}`;
}

function mergeRules(aliasJson: string | null, canonicalJson: string | null): string {
  const out: Rule[] = [];
  const seen = new Set<string>();
  for (const raw of [canonicalJson, aliasJson]) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Rule[];
      if (!Array.isArray(parsed)) continue;
      for (const rule of parsed) {
        const key = ruleKey(rule);
        if (!rule.column || !rule.condition || seen.has(key)) continue;
        seen.add(key);
        out.push(rule);
      }
    } catch {
      /* ignore malformed */
    }
  }
  return JSON.stringify(out);
}

async function main(): Promise<void> {
  const floral = process.argv.includes('--floral-prod');
  if (floral) {
    const cs = resolveConnectionString(true);
    process.env.CUSTOM_DATABASE_URL = cs;
    process.env.POSTGRES_URL = cs;
    console.log('[floral-prod] Using production database\n');
  }

  const { sql } = await import('@/lib/db/client');
  const { getBrandContentByHandle, invalidateBrandContentCache } = await import(
    '@/lib/content/brand-content'
  );
  const { countDbProductsForBrand } = await import('@/lib/brands/get-brand-products');

  for (const spec of BRAND_HUB_MERGES) {
    const fromHub = spec.alias;
    const toHub = spec.canonical;
    const rewrites = spec.rewriteBrands || [];

    const hubbed = await sql`
      UPDATE products
      SET brand_hub_handle = ${toHub}, updated_at = NOW()
      WHERE LOWER(TRIM(COALESCE(brand_hub_handle, ''))) = ${fromHub}
      RETURNING handle
    `;
    let branded = 0;
    for (const rewrite of rewrites) {
      const rows = await sql`
        UPDATE products
        SET brand = ${rewrite.to},
            brand_hub_handle = ${toHub},
            updated_at = NOW()
        WHERE LOWER(TRIM(COALESCE(brand, ''))) = ${rewrite.from.toLowerCase()}
        RETURNING handle
      `;
      branded += Array.isArray(rows) ? rows.length : 0;
    }

    const aliasRows = (await sql`
      SELECT handle, rules FROM brand_content WHERE handle = ${fromHub} LIMIT 1
    `) as Array<{ handle: string; rules: string | null }>;
    const canonicalRows = (await sql`
      SELECT handle, rules FROM brand_content WHERE handle = ${toHub} LIMIT 1
    `) as Array<{ handle: string; rules: string | null }>;

    if (aliasRows[0] && canonicalRows[0]) {
      const merged = mergeRules(aliasRows[0].rules, canonicalRows[0].rules);
      await sql`
        UPDATE brand_content SET rules = ${merged}, updated_at = NOW() WHERE handle = ${toHub}
      `;
    }

    const removed = await sql`
      DELETE FROM brand_content WHERE handle = ${fromHub} RETURNING handle
    `;
    invalidateBrandContentCache();

    const brand = await getBrandContentByHandle(toHub);
    if (brand) {
      const count = await countDbProductsForBrand(brand);
      await sql`
        UPDATE brand_content SET products_count = ${count}, updated_at = NOW() WHERE handle = ${toHub}
      `;
      console.log(
        `${fromHub} → ${toHub}: hub=${Array.isArray(hubbed) ? hubbed.length : 0} brand=${branded} deleted=${Array.isArray(removed) ? removed.length : 0} count=${count}`
      );
    } else {
      console.log(
        `${fromHub} → ${toHub}: hub=${Array.isArray(hubbed) ? hubbed.length : 0} brand=${branded} deleted=${Array.isArray(removed) ? removed.length : 0} (canonical missing)`
      );
    }
  }
  invalidateBrandContentCache();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
