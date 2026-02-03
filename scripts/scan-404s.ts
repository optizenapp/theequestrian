import 'dotenv/config';
import { scanNotFoundUrls } from '@/lib/not-found/scan';

async function run() {
  const result = await scanNotFoundUrls({ pageLimit: null, linkLimit: null, includeLinks: true });
  console.log(
    `Scanned ${result.scanned} URLs, ${result.linkScanned} links. 404s found: ${result.notFound}`
  );
}

run().catch((error) => {
  console.error('404 scan failed:', error);
  process.exit(1);
});
