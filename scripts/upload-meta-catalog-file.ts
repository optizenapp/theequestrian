/**
 * Upload an already-exported Meta catalog CSV to S3.
 * Usage: tsx scripts/upload-meta-catalog-file.ts [path]
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import { uploadMetaCatalogToS3 } from '@/lib/meta/s3';

async function main() {
  const filePath =
    process.argv[2] || resolve(process.cwd(), 'exports/meta-catalog-latest.csv');
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const csv = fs.readFileSync(filePath, 'utf8');
  const keyPrefix = (process.env.AWS_ACCESS_KEY_ID || '').slice(0, 8);
  console.log(`Using AWS key ${keyPrefix}...`);
  console.log(`Uploading ${filePath} (${Buffer.byteLength(csv, 'utf8')} bytes)...`);
  const result = await uploadMetaCatalogToS3(csv);
  console.log(`✅ Uploaded to: ${result.url}`);
}

main().catch((error) => {
  console.error('❌ Upload failed:', error);
  process.exit(1);
});
