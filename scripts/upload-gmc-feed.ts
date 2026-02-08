/**
 * Build and upload GMC feed to S3.
 *
 * Usage: tsx scripts/upload-gmc-feed.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

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
