/**
 * Build and upload GMC feed to S3.
 *
 * Usage: tsx scripts/upload-gmc-feed.ts
 */

// CRITICAL: Load env vars BEFORE any other imports that might validate them
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env first (base), then .env.local (overrides)
config({ path: resolve(process.cwd(), '.env') });
const localResult = config({ path: resolve(process.cwd(), '.env.local') });

if (localResult.error) {
  console.warn('Warning: Failed to load .env.local:', localResult.error.message);
}

// Verify critical vars are loaded
if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.error('❌ Missing required env vars!');
  console.error('SHOPIFY_STORE_DOMAIN:', process.env.SHOPIFY_STORE_DOMAIN ? '✓' : '✗');
  console.error('SHOPIFY_STOREFRONT_ACCESS_TOKEN:', process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? '✓' : '✗');
  console.error('\nMake sure these are in .env.local (or .env)');
  process.exit(1);
}

import { buildGmcFeedXml } from '@/lib/gmc/feed';
import { uploadGmcFeedToS3 } from '@/lib/gmc/s3';

async function uploadGmcFeed() {
  console.log('📡 Building GMC feed from Shopify inventory...');
  const { xml, itemCount } = await buildGmcFeedXml();

  console.log('☁️ Uploading GMC feed to S3...');
  const result = await uploadGmcFeedToS3(xml);

  console.log(`✅ Items exported: ${itemCount}`);
  console.log(`✅ Uploaded to: ${result.url}`);

  return result;
}

if (require.main === module) {
  uploadGmcFeed()
    .then(() => {
      console.log('\n✅ Upload complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Upload failed:', error);
      process.exit(1);
    });
}

export { uploadGmcFeed };
