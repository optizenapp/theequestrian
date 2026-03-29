import { config } from 'dotenv';
import { resolve } from 'path';
import { publishSitemapsToS3 } from '@/lib/sitemap/s3-publisher';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  console.log('[sitemap:publish] start');
  const result = await publishSitemapsToS3();
  console.log('[sitemap:publish] complete', {
    bucket: result.bucket,
    region: result.region,
    prefix: result.prefix,
    uploadedFiles: result.uploadedFiles,
    counts: result.counts,
  });
}

main().catch((error) => {
  console.error('[sitemap:publish] failed', error);
  process.exit(1);
});
