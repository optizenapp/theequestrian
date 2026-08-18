#!/usr/bin/env tsx
/**
 * Repair /rider/eyewear so live sunglasses land on the existing category
 * (prefer this over inventing /clothing/sunglasses).
 *
 * - Maps live product types onto rider/eyewear
 * - Syncs Storefront-visible eyewear products into Neon
 * - Allocates them to /rider/eyewear
 *
 * Dry-run: npx tsx scripts/repair-rider-eyewear-sunglasses.ts
 * Apply:   npx tsx scripts/repair-rider-eyewear-sunglasses.ts --apply
 * Prod:    add --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';
import { shopifyFetch } from '@/lib/shopify/client';
import { upsertProductAllocation } from '@/lib/db/product-allocations';
import { syncProductToDb } from './lib/sync-product-to-db';
import type { ShopifyProduct } from '@/types/shopify';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

/** Production Neon — set before any lib/db query (client is lazy). */
const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[floral-prod] Using production database (ep-floral-wind)\n');
}

const CATEGORY_PATH = '/rider/eyewear';
const MAPPING_TYPES = [
  'Sunglasses',
  'glasses case',
  'Glasses Cover',
  'Eyeglass catcher',
  'RIDER: Glasses & Goggles',
] as const;

const SEARCH_QUERY =
  'product_type:Sunglasses OR product_type:"glasses case" OR product_type:"Glasses Cover" OR product_type:"Eyeglass catcher" OR title:sunglasses OR title:goggle OR title:"glasses case" OR title:"glasses cover"';

type StorefrontSearchResult = {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
};

function resolveConnectionString(): string {
  if (process.env.CUSTOM_DATABASE_URL) return process.env.CUSTOM_DATABASE_URL;
  const cs = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!cs) throw new Error('Missing POSTGRES_URL or DATABASE_URL');
  return cs;
}

async function ensureMapping(sql: ReturnType<typeof neon>) {
  for (const productType of MAPPING_TYPES) {
    const existing = await sql`
      SELECT id FROM collection_mapping
      WHERE top_level = 'rider'
        AND parent_category = 'eyewear'
        AND subcategory_handle IS NULL
        AND product_type = ${productType}
      LIMIT 1
    `;
    if (existing[0]) {
      await sql`
        UPDATE collection_mapping
        SET action = 'include', updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
      console.log(`mapping ok: ${productType}`);
      continue;
    }
    await sql`
      INSERT INTO collection_mapping (
        top_level, parent_category, subcategory_handle, product_type, action
      ) VALUES (
        'rider', 'eyewear', NULL, ${productType}, 'include'
      )
    `;
    console.log(`mapping added: ${productType}`);
  }
}

async function fetchLiveEyewearProducts(): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<StorefrontSearchResult>({
    query: `query EyewearRepair($q: String!) {
      products(first: 50, query: $q) {
        edges {
          node {
            id
            handle
            title
            description
            vendor
            productType
            tags
            availableForSale
            createdAt
            images(first: 1) {
              edges { node { url altText width height } }
            }
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  selectedOptions { name value }
                  price { amount currencyCode }
                  compareAtPrice { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }`,
    variables: { q: SEARCH_QUERY },
    cache: 'no-store',
  });

  return (data.products?.edges ?? [])
    .map((edge) => edge.node)
    .filter((product) => product?.availableForSale);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sql = neon(resolveConnectionString());

  console.log(`Target category: ${CATEGORY_PATH}`);
  console.log(apply ? 'Mode: APPLY' : 'Mode: dry-run');

  if (apply) {
    await ensureMapping(sql);
    const deactivated = await sql`
      UPDATE manual_redirects
      SET status = 'inactive', updated_at = NOW()
      WHERE from_path = ${CATEGORY_PATH}
        AND status IN ('active', 'override')
      RETURNING to_path, redirect_type, source
    `;
    if (deactivated.length) {
      console.log('deactivated redirect:', deactivated[0]);
    } else {
      console.log('no active manual redirect for', CATEGORY_PATH);
    }
  } else {
    console.log('[dry-run] Would ensure mapping types:', MAPPING_TYPES.join(', '));
    console.log('[dry-run] Would deactivate any active manual_redirects for', CATEGORY_PATH);
  }

  const products = await fetchLiveEyewearProducts();
  console.log(`Storefront live eyewear products: ${products.length}`);
  for (const product of products) {
    console.log(` - ${product.handle} (${product.productType || 'no-type'})`);
  }

  if (!apply) {
    console.log('[dry-run] Re-run with --apply to sync + allocate.');
    return;
  }

  for (const product of products) {
    const syncResult = await syncProductToDb(product);
    const allocation = await upsertProductAllocation({
      productId: product.id,
      productHandle: product.handle,
      categoryPath: CATEGORY_PATH,
    });
    console.log(
      `synced=${syncResult} allocated=${allocation.canonical_path}`
    );
  }

  console.log('Done. Revalidate /rider/eyewear after deploy if ISR still redirects.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
