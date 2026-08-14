#!/usr/bin/env tsx
/**
 * Remove stale /brands/* collection_content rows that duplicate brand hubs.
 *
 * Usage:
 *   npx tsx scripts/remove-stale-brand-collection-pages.ts --floral-prod
 *   npx tsx scripts/remove-stale-brand-collection-pages.ts --floral-prod --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';

config({ path: resolve(process.cwd(), '.env.local') });

const TARGETS = [
  {
    collectionPath: '/brands/hitchley-harrow',
    brandHandle: 'hitchley-harrow',
    extraFrom: ['/accessories/brands/hitchley-harrow', '/collections/hitchley-harrow'],
  },
  {
    collectionPath: '/brands/visentin',
    brandHandle: 'visentin',
    extraFrom: ['/collections/visentin-equestrian'],
  },
] as const;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const apply = hasFlag('--apply');
  const sql = createSql(floralProd);

  console.log('Remove stale brand collection pages');
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  await sql`
    CREATE TABLE IF NOT EXISTS manual_redirects (
      id SERIAL PRIMARY KEY,
      from_path TEXT UNIQUE NOT NULL,
      to_path TEXT NOT NULL,
      redirect_type TEXT NOT NULL DEFAULT '301',
      source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'active',
      conflict_target TEXT,
      last_checked TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  for (const target of TARGETS) {
    const brand = (await sql`
      SELECT handle, status, title
      FROM brand_content
      WHERE handle = ${target.brandHandle}
      LIMIT 1
    `) as Array<{ handle: string; status: string; title: string }>;

    if (!brand.length || brand[0].status !== 'published') {
      console.error(`Skip ${target.collectionPath}: brand hub missing/unpublished`);
      continue;
    }

    const brandUrl = `/brands/${target.brandHandle}`;
    const content = (await sql`
      SELECT url_path, status
      FROM collection_content
      WHERE url_path = ${target.collectionPath}
    `) as Array<{ url_path: string; status: string }>;

    console.log(
      `${target.collectionPath} → keep brand hub ${brandUrl} (${brand[0].title}); collection_content=${content[0]?.status || 'missing'}`
    );

    if (!apply) continue;

    if (content.length) {
      await sql`
        UPDATE collection_content
        SET status = 'draft', updated_at = NOW()
        WHERE url_path = ${target.collectionPath}
      `;
      console.log(`  drafted collection_content`);
    }

    const fromPaths = Array.from(
      new Set([target.collectionPath, ...target.extraFrom])
    );
    for (const fromPath of fromPaths) {
      if (fromPath === brandUrl) continue;
      await sql`
        INSERT INTO manual_redirects (from_path, to_path, redirect_type, source, status, updated_at)
        VALUES (${fromPath}, ${brandUrl}, '301', 'remove-stale-brand-collection', 'active', NOW())
        ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path,
            redirect_type = '301',
            source = 'remove-stale-brand-collection',
            status = 'active',
            updated_at = NOW()
      `;
      console.log(`  redirect ${fromPath} → ${brandUrl}`);
    }
  }

  if (!apply) {
    console.log('\nDry run — pass --apply to write.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
