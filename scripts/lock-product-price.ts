#!/usr/bin/env tsx
/**
 * Lock a marketplace product to a manual price.
 *
 * Usage:
 *   tsx scripts/lock-product-price.ts <handle> <price> [--compare-at <value>] [--reason "..."] [--dry-run]
 *
 * Example:
 *   tsx scripts/lock-product-price.ts resistol-ride-safe-helmet-straw 469.95 --reason "Manual override"
 *
 * What it does:
 *   1. Loads the product (all variants) from Shopify Admin API by handle.
 *   2. PUTs the new price (and optional compare_at_price) on every variant.
 *   3. Upserts a row per variant into marketplace_price_locks so the
 *      vendor-sync webhook (lib/inventory/vendor-sync/process-product.ts) and
 *      the bulk price-offset job (services/shopify-price-offset/src/jobs/bulk.ts)
 *      both refuse to overwrite the price.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface VariantNode {
  id: string;
  title: string;
  price: string;
  compareAtPrice: string | null;
}

interface ProductNode {
  id: string;
  handle: string;
  title: string;
  variants: { edges: Array<{ node: VariantNode }> };
}

interface CliArgs {
  handle: string;
  price: number;
  compareAt: number | null | 'clear';
  reason: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const positionals: string[] = [];
  let compareAt: number | null | 'clear' = 'clear';
  let reason = 'Manual price override';
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--compare-at') {
      const next = argv[++i];
      compareAt = next === 'null' || next === 'clear' ? 'clear' : Number(next);
      if (compareAt !== 'clear' && Number.isNaN(compareAt)) {
        throw new Error(`Invalid --compare-at value: ${next}`);
      }
    } else if (arg === '--keep-compare-at') {
      compareAt = null;
    } else if (arg === '--reason') {
      reason = argv[++i] ?? reason;
    } else {
      positionals.push(arg);
    }
  }

  const [handle, priceStr] = positionals;
  if (!handle || !priceStr) {
    throw new Error(
      'Usage: tsx scripts/lock-product-price.ts <handle> <price> [--compare-at <value>|null|clear] [--keep-compare-at] [--reason "..."] [--dry-run]'
    );
  }
  const price = Number(priceStr);
  if (Number.isNaN(price) || price <= 0) {
    throw new Error(`Invalid price: ${priceStr}`);
  }
  return { handle, price, compareAt, reason, dryRun };
}

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = '2025-01';

if (!STORE_DOMAIN || !ADMIN_TOKEN) {
  throw new Error('SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN must be set');
}

async function adminGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(
    `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN!,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Admin GraphQL ${response.status}: ${text.slice(0, 500)}`);
  }
  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) {
    throw new Error('GraphQL response missing data');
  }
  return json.data;
}

async function fetchProductByHandle(handle: string): Promise<ProductNode | null> {
  const query = `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        handle
        title
        variants(first: 100) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
            }
          }
        }
      }
    }
  `;
  const data = await adminGraphql<{ productByHandle: ProductNode | null }>(query, { handle });
  return data.productByHandle;
}

function gidToNumeric(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1];
}

async function updateVariantPriceRest(
  variantIdNumeric: string,
  price: string,
  compareAt: string | null | undefined
): Promise<void> {
  const variant: Record<string, unknown> = {
    id: Number(variantIdNumeric),
    price,
  };
  if (compareAt !== undefined) {
    variant.compare_at_price = compareAt;
  }
  const response = await fetch(
    `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/variants/${variantIdNumeric}.json`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN!,
      },
      body: JSON.stringify({ variant }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Variant PUT ${response.status}: ${text.slice(0, 500)}`);
  }
}

async function ensureLocksTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_price_locks (
      variant_id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_handle TEXT,
      locked_price NUMERIC(10, 2) NOT NULL,
      locked_compare_at NUMERIC(10, 2),
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_price_locks_product
      ON marketplace_price_locks (product_id);
    CREATE INDEX IF NOT EXISTS idx_marketplace_price_locks_handle
      ON marketplace_price_locks (product_handle);
  `);
}

async function upsertLock(
  pool: Pool,
  input: {
    variantId: string;
    productId: string;
    handle: string;
    lockedPrice: number;
    lockedCompareAt: number | null;
    reason: string;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO marketplace_price_locks (
        variant_id, product_id, product_handle,
        locked_price, locked_compare_at, reason, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (variant_id) DO UPDATE SET
        product_id = EXCLUDED.product_id,
        product_handle = EXCLUDED.product_handle,
        locked_price = EXCLUDED.locked_price,
        locked_compare_at = EXCLUDED.locked_compare_at,
        reason = EXCLUDED.reason,
        updated_at = NOW()`,
    [
      input.variantId,
      input.productId,
      input.handle,
      input.lockedPrice.toFixed(2),
      input.lockedCompareAt != null ? input.lockedCompareAt.toFixed(2) : null,
      input.reason,
    ]
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log(`\n🔒 Lock product price`);
  console.log(`   Handle:      ${args.handle}`);
  console.log(`   New price:   $${args.price.toFixed(2)}`);
  console.log(
    `   Compare at:  ${
      args.compareAt === 'clear'
        ? 'CLEAR (null)'
        : args.compareAt === null
          ? 'leave existing'
          : `$${(args.compareAt as number).toFixed(2)}`
    }`
  );
  console.log(`   Reason:      ${args.reason}`);
  console.log(`   Dry run:     ${args.dryRun ? 'YES' : 'no'}\n`);

  const product = await fetchProductByHandle(args.handle);
  if (!product) {
    throw new Error(`Product not found by handle: ${args.handle}`);
  }

  const variantNodes = product.variants.edges.map((e) => e.node);
  if (variantNodes.length === 0) {
    throw new Error(`Product ${args.handle} has no variants`);
  }

  console.log(`📦 ${product.title} (${product.id})`);
  console.log(`   ${variantNodes.length} variant(s):`);
  for (const v of variantNodes) {
    console.log(
      `   - ${v.title.padEnd(20)} current price $${v.price}` +
        (v.compareAtPrice ? `, compare-at $${v.compareAtPrice}` : '')
    );
  }
  console.log('');

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL (or POSTGRES_URL) must be set to write the lock rows');
  }
  const pool = new Pool({ connectionString: dbUrl });

  try {
    await ensureLocksTable(pool);

    const productIdNumeric = gidToNumeric(product.id);
    const compareAtForRest =
      args.compareAt === 'clear' ? null : args.compareAt === null ? undefined : args.compareAt.toFixed(2);
    const compareAtForDb =
      args.compareAt === 'clear' || args.compareAt === null ? null : (args.compareAt as number);

    for (const variant of variantNodes) {
      const variantIdNumeric = gidToNumeric(variant.id);
      const priceStr = args.price.toFixed(2);

      if (args.dryRun) {
        console.log(
          `  [DRY RUN] Would set variant ${variantIdNumeric} (${variant.title}) → $${priceStr}` +
            (compareAtForRest === null
              ? ' (clear compare-at)'
              : compareAtForRest === undefined
                ? ' (keep compare-at)'
                : ` (compare-at $${compareAtForRest})`)
        );
      } else {
        await updateVariantPriceRest(variantIdNumeric, priceStr, compareAtForRest);
        console.log(`  ✓ Updated variant ${variantIdNumeric} (${variant.title}) → $${priceStr}`);

        await upsertLock(pool, {
          variantId: variantIdNumeric,
          productId: productIdNumeric,
          handle: product.handle,
          lockedPrice: args.price,
          lockedCompareAt: compareAtForDb,
          reason: args.reason,
        });
        console.log(`    🔒 Lock recorded`);
      }
    }

    console.log('\n✅ Done.');
    if (!args.dryRun) {
      console.log(
        '   Vendor-sync webhook and shopify-price-offset bulk job will now skip these variants.'
      );
      console.log(
        '   Reminder: Webkul Dual Sync should already have Price + Compare At Price unchecked'
      );
      console.log('   (see SHOPIFY-PRICE-OFFSET-MIGRATION.md).');
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
