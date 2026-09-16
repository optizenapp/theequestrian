/**
 * Build and upload Meta catalog CSV feed to S3.
 *
 * Usage: tsx scripts/upload-meta-catalog-feed.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
const localResult = config({ path: resolve(process.cwd(), '.env.local'), override: true });

if (localResult.error) {
  console.warn('Warning: Failed to load .env.local:', localResult.error.message);
}

if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.error('❌ Missing required env vars!');
  console.error('SHOPIFY_STORE_DOMAIN:', process.env.SHOPIFY_STORE_DOMAIN ? '✓' : '✗');
  console.error(
    'SHOPIFY_STOREFRONT_ACCESS_TOKEN:',
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ? '✓' : '✗'
  );
  process.exit(1);
}

import { buildMetaCatalogCsv } from '@/lib/meta/feed';
import { uploadMetaCatalogToS3 } from '@/lib/meta/s3';

async function uploadMetaCatalogFeed() {
  console.log('📡 Building Meta catalog feed from Shopify inventory...');
  const { csv, itemCount } = await buildMetaCatalogCsv();

  console.log('☁️ Uploading Meta catalog feed to S3...');
  const result = await uploadMetaCatalogToS3(csv);

  console.log(`✅ Items exported: ${itemCount}`);
  console.log(`✅ Uploaded to: ${result.url}`);

  return result;
}

if (require.main === module) {
  uploadMetaCatalogFeed()
    .then(() => {
      console.log('\n✅ Upload complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Upload failed:', error);
      process.exit(1);
    });
}

export { uploadMetaCatalogFeed };
