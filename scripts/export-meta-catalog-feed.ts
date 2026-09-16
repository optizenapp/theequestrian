/**
 * Export current Meta catalog feed snapshot.
 *
 * Usage: tsx scripts/export-meta-catalog-feed.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import fs from 'fs';
import path from 'path';
import { buildMetaCatalogCsv } from '@/lib/meta/feed';

function timestampLabel(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function exportMetaCatalogFeed() {
  console.log('📡 Building Meta catalog feed from Shopify inventory...');
  const { csv, itemCount } = await buildMetaCatalogCsv();
  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stamp = timestampLabel();
  const snapshotPath = path.join(outputDir, `meta-catalog-${stamp}.csv`);
  const latestPath = path.join(outputDir, 'meta-catalog-latest.csv');

  fs.writeFileSync(snapshotPath, csv);
  fs.writeFileSync(latestPath, csv);

  console.log(`✅ Saved snapshot: ${snapshotPath}`);
  console.log(`✅ Updated latest: ${latestPath}`);
  console.log(`✅ Items exported: ${itemCount}`);

  return { snapshotPath, latestPath };
}

if (require.main === module) {
  exportMetaCatalogFeed()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportMetaCatalogFeed };
