#!/usr/bin/env tsx
/**
 * Upsert collection_content + collection_mapping for Accessories homeware/kitchen/cards/books leaves.
 *
 *   npx tsx scripts/create-accessories-homeware-kitchen-cards.ts --dry-run
 *   npx tsx scripts/create-accessories-homeware-kitchen-cards.ts
 *   npx tsx scripts/create-accessories-homeware-kitchen-cards.ts --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createSql } from './brand-page-pipeline/db';
import { hasFlag } from './lib/migration-cli';
import {
  ACCESSORIES_SPLIT_CATEGORIES,
  LEAF_CANONICAL_TYPES,
  splitPathParts,
} from './lib/accessories-gift-split-map';

config({ path: resolve(process.cwd(), '.env.local') });

const PLACEHOLDER_LONG = (label: string) =>
  `<h2>${label}</h2><p>Placeholder copy. Run Subcollection Framework via scripts/run-page-seo-update.ts.</p><ul><li>Equestrian theme</li><li>Australian shipping</li><li>Related categories nearby</li><li>Browse by product type</li></ul>`;

async function main(): Promise<void> {
  const floralProd = hasFlag('--floral-prod');
  const dryRun = hasFlag('--dry-run');
  const sql = createSql(floralProd);

  console.log(`Create accessories split categories`);
  console.log(`  DB:   ${floralProd ? 'floral-prod' : 'local'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`  Paths: ${ACCESSORIES_SPLIT_CATEGORIES.length}\n`);

  if (dryRun) {
    for (const cat of ACCESSORIES_SPLIT_CATEGORIES) {
      const types = LEAF_CANONICAL_TYPES[cat.path] || [];
      console.log(`  ${cat.path}  (L${cat.level})  types=${types.length}`);
    }
    console.log('\nDry run — re-run without --dry-run to write.');
    return;
  }

  let contentCount = 0;
  let mappingCount = 0;

  for (const cat of ACCESSORIES_SPLIT_CATEGORIES) {
    const short = `<p>Browse <strong>${cat.h1.toLowerCase()}</strong> in our equestrian accessories range.</p>`;
    await sql`
      INSERT INTO collection_content (
        url_path, h1_title, meta_title, meta_description,
        short_description, long_description, breadcrumb_label, parent_url,
        category_level, status, default_sort, faq_items, related_categories, generated_by
      ) VALUES (
        ${cat.path},
        ${cat.h1},
        ${cat.metaTitle},
        ${cat.metaDescription},
        ${short},
        ${PLACEHOLDER_LONG(cat.h1)},
        ${cat.breadcrumb},
        ${cat.parentUrl},
        ${cat.level},
        'published',
        'best-selling',
        '[]'::jsonb,
        '[]'::jsonb,
        'manual'
      )
      ON CONFLICT (url_path) DO UPDATE SET
        parent_url = EXCLUDED.parent_url,
        category_level = EXCLUDED.category_level,
        breadcrumb_label = EXCLUDED.breadcrumb_label,
        h1_title = COALESCE(NULLIF(collection_content.h1_title, ''), EXCLUDED.h1_title),
        meta_title = COALESCE(NULLIF(collection_content.meta_title, ''), EXCLUDED.meta_title),
        meta_description = COALESCE(NULLIF(collection_content.meta_description, ''), EXCLUDED.meta_description),
        status = 'published',
        updated_at = NOW()
    `;
    contentCount += 1;
    console.log(`content ${cat.path}`);

    const types = LEAF_CANONICAL_TYPES[cat.path] || [];
    const { topLevel, parentCategory, subcategoryHandle } = splitPathParts(cat.path);

    for (const productType of types) {
      await sql`
        INSERT INTO collection_mapping (
          top_level, parent_category, subcategory_handle, product_type, action
        ) VALUES (
          ${topLevel},
          ${parentCategory},
          ${subcategoryHandle},
          ${productType},
          'include'
        )
        ON CONFLICT (top_level, parent_category, subcategory_handle, product_type)
        DO UPDATE SET action = 'include', updated_at = NOW()
      `;
      mappingCount += 1;
    }
  }

  console.log(`\nDone. content=${contentCount} mapping_upserts≈${mappingCount}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
