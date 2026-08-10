/**
 * Dry-run or apply GMC stale offer cleanup against the latest built feed IDs.
 *
 * Usage:
 *   npx tsx scripts/cleanup-gmc-stale.ts
 *   npx tsx scripts/cleanup-gmc-stale.ts --apply
 *   npx tsx scripts/cleanup-gmc-stale.ts --apply --floral-prod
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const FLORAL_PROD_DATABASE_URL =
  'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.argv.includes('--floral-prod')) {
  process.env.CUSTOM_DATABASE_URL = FLORAL_PROD_DATABASE_URL;
  process.env.POSTGRES_URL = FLORAL_PROD_DATABASE_URL;
  console.log('[gmc:cleanup] Using production database (ep-floral-wind)');
}

async function main() {
  const { buildGmcFeedXml } = await import('@/lib/gmc/feed');
  const { cleanupStaleGmcOffers } = await import('@/lib/gmc/cleanup');

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
