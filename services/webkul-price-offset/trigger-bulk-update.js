/**
 * Bulk Update Script - Triggers Vercel Webhook for All Products
 * 
 * This script fetches all products from Webkul and triggers the webhook
 * for each one, which will apply shipping offsets based on the CSV files.
 */

// Load environment variables
require('dotenv').config();

const https = require('https');

// Configuration
const WEBKUL_API_URL = process.env.WEBKUL_API_BASE_URL || 'https://mvmapi.webkul.com';
const WEBKUL_TOKEN = process.env.WEBKUL_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://theequestrian.vercel.app/api/webhooks/webkul-product';
const RATE_LIMIT = 2; // requests per second
const PAGE_SIZE = 50;
const DRY_RUN = process.env.DRY_RUN === 'true';

let successCount = 0;
let errorCount = 0;
let skippedCount = 0;

// Helper: Fetch from Webkul API
async function webkulFetch(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, WEBKUL_API_URL);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WEBKUL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Webkul API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Helper: Trigger webhook
async function triggerWebhook(productId) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const payload = JSON.stringify({ product_id: productId });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Webhook ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Helper: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
  console.log('================================================================================');
  console.log('  🚀 BULK UPDATE - TRIGGER WEBHOOKS FOR ALL PRODUCTS');
  console.log('================================================================================');
  console.log('');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Rate Limit: ${RATE_LIMIT} requests/second`);
  console.log(`Dry Run: ${DRY_RUN ? 'YES (no actual changes)' : 'NO (LIVE UPDATES!)'}`);
  console.log('');

  if (!DRY_RUN) {
    console.log('⚠️  WARNING: This will make LIVE price changes!');
    console.log('⚠️  Press Ctrl+C within 5 seconds to cancel...');
    await sleep(5000);
    console.log('');
  }

  let page = 1;
  let totalProducts = 0;
  const startTime = Date.now();

  while (true) {
    console.log(`\n[Page ${page}] Fetching products...`);
    
    try {
      const response = await webkulFetch(`/api/v2/products.json?page=${page}&limit=${PAGE_SIZE}`);
      const products = response.products || [];

      if (products.length === 0) {
        console.log(`[Page ${page}] No more products found.`);
        break;
      }

      console.log(`[Page ${page}] Found ${products.length} products`);

      for (const product of products) {
        totalProducts++;
        const productId = product.id;
        const productName = product.product_name || 'Unknown';

        try {
          console.log(`\n[${totalProducts}] Processing: ${productName} (ID: ${productId})`);
          
          const result = await triggerWebhook(productId);
          
          if (result.ok) {
            successCount++;
            console.log(`  ✅ Success (${result.processingTime}ms)`);
            if (result.product) {
              console.log(`     Vendor: ${result.product.vendor || 'Unknown'}`);
              console.log(`     Variants: ${result.product.variantCount || 0}`);
            }
          } else {
            skippedCount++;
            console.log(`  ⏭️  Skipped: ${result.message}`);
          }

          // Rate limiting
          await sleep(1000 / RATE_LIMIT);

        } catch (error) {
          errorCount++;
          console.log(`  ❌ Error: ${error.message}`);
        }
      }

      page++;

    } catch (error) {
      console.error(`\n❌ Failed to fetch page ${page}: ${error.message}`);
      break;
    }
  }

  // Summary
  const duration = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  console.log('\n');
  console.log('================================================================================');
  console.log('  📊 BULK UPDATE COMPLETE');
  console.log('================================================================================');
  console.log('');
  console.log(`Total Products: ${totalProducts}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`⏱️  Duration: ${minutes}m ${seconds}s`);
  console.log('');
  console.log('================================================================================');
}

// Run
if (!WEBKUL_TOKEN) {
  console.error('❌ Error: WEBKUL_ACCESS_TOKEN not set');
  console.error('Please set it in your .env file or environment');
  process.exit(1);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
