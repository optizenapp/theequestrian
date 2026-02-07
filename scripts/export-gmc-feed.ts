/**
 * Export current GMC feed snapshot.
 *
 * Usage: tsx scripts/export-gmc-feed.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import fs from 'fs';
import path from 'path';

function getBaseUrl(): string {
  const baseUrl = process.env.GMC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';
  return baseUrl.replace(/\/+$/, '');
}

function timestampLabel(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function exportGmcFeed() {
  const baseUrl = getBaseUrl();
  const feedUrl = `${baseUrl}/api/feeds/gmc`;

  console.log(`📡 Fetching GMC feed from ${feedUrl}`);
  const response = await fetch(feedUrl);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch GMC feed (${response.status}): ${errorText}`);
  }

  const xml = await response.text();
  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stamp = timestampLabel();
  const snapshotPath = path.join(outputDir, `gmc-feed-${stamp}.xml`);
  const latestPath = path.join(outputDir, 'gmc-feed-latest.xml');

  fs.writeFileSync(snapshotPath, xml);
  fs.writeFileSync(latestPath, xml);

  console.log(`✅ Saved snapshot: ${snapshotPath}`);
  console.log(`✅ Updated latest: ${latestPath}`);

  return { snapshotPath, latestPath };
}

if (require.main === module) {
  exportGmcFeed()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportGmcFeed };
