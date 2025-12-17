/**
 * Script to download sizing chart images from the current Shopify site
 * 
 * Run with: npx tsx scripts/download-sizing-images.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Sizing chart image URLs extracted from the current site
const sizingImages = {
  trailrace: [
    {
      url: 'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/TucciChart1PNG.png',
      filename: 'tucci-chart-1.png',
    },
    {
      url: 'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/TucciChart2.png',
      filename: 'tucci-chart-2.png',
    },
    {
      url: 'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/Ego_7_chart_1.jpg',
      filename: 'ego7-chart-1.jpg',
    },
    {
      url: 'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/Ego7middlechart.png',
      filename: 'ego7-chart-2.png',
    },
    {
      url: 'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/Ego7Chart2.png',
      filename: 'ego7-chart-3.png',
    },
  ],
  // Add more brands as we extract them
};

/**
 * Download a file from a URL
 */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure directory exists
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('📥 Downloading sizing chart images...\n');

  const publicDir = path.join(process.cwd(), 'public', 'sizing');

  for (const [brand, images] of Object.entries(sizingImages)) {
    console.log(`\n📁 ${brand.toUpperCase()}`);
    
    for (const image of images) {
      const dest = path.join(publicDir, brand, image.filename);
      
      try {
        console.log(`  ⬇️  Downloading ${image.filename}...`);
        await downloadFile(image.url, dest);
        console.log(`  ✅ Saved to ${dest}`);
      } catch (error) {
        console.error(`  ❌ Failed to download ${image.filename}:`, error);
      }
    }
  }

  console.log('\n\n✨ Download complete!\n');
  console.log('Next steps:');
  console.log('1. Update lib/sizing/sizing-config.ts with the actual filenames');
  console.log('2. Visit other brand pages and add their image URLs to this script');
  console.log('3. Run this script again to download remaining images\n');
}

main().catch(console.error);

