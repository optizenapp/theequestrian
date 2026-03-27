#!/usr/bin/env tsx
/**
 * Read-only: check Storefront API for brand collection handles used by /brands/[handle].
 * Does not create collections — create smart collections in Shopify Admin if missing.
 *
 * Run: npx tsx scripts/verify-brand-collections.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { getCollectionByHandle } from '@/lib/shopify/collections';

const HANDLES = ['zilco', 'kentucky-horsewear', 'shanga', 'wild-horse'] as const;

async function main() {
  console.log('Checking Shopify collections (Storefront API)…\n');
  for (const handle of HANDLES) {
    try {
      const col = await getCollectionByHandle(handle, 1);
      if (col) {
        const n = col.products?.edges?.length ?? 0;
        console.log(`OK  /brands/${handle} — collection exists (${n} product sample loaded)`);
      } else {
        console.log(`MISSING /brands/${handle} — create a collection with handle "${handle}" in Shopify Admin`);
      }
    } catch (e) {
      console.log(`ERROR /brands/${handle}`, e instanceof Error ? e.message : e);
    }
  }
  console.log('\nIf any are MISSING, add Smart Collections with these exact handles and rules (vendor/tag) that match your catalog.');
}

main();
