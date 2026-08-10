/**
 * Dry-run or apply GMC stale offer cleanup against the latest built feed IDs.
 *
 * Usage:
 *   npx tsx scripts/cleanup-gmc-stale.ts
 *   npx tsx scripts/cleanup-gmc-stale.ts --apply
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import { buildGmcFeedXml } from '@/lib/gmc/feed';
import { cleanupStaleGmcOffers } from '@/lib/gmc/cleanup';

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`[gmc:cleanup] Building feed for ID set (dryRun=${!apply})...`);
  const { itemCount, variantIds } = await buildGmcFeedXml();
  console.log(`[gmc:cleanup] Feed items=${itemCount} variantIds=${variantIds.length}`);

  const result = await cleanupStaleGmcOffers({
    feedVariantIds: variantIds,
    itemCount,
    dryRun: !apply,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
