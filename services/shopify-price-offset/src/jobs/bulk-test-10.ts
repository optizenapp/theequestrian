import { initDb, upsertAudit } from '../db/index.js';
import { loadVendorRates, loadTagRates } from '../csv/loadRates.js';
import { updateVariantPrice } from '../shopify/client.js';
import { resolveShippingOffset, normalizeTags } from '../price/offset.js';
import { config } from '../config.js';
import PQueue from 'p-queue';

const PRICE_EPSILON = 0.01;

function closeTo(a: number, b: number) {
  return Math.abs(a - b) <= PRICE_EPSILON;
}

// Rate-limited fetch
const queue = new PQueue({
  intervalCap: config.rateLimit.perSecond,
  interval: 1000,
  carryoverConcurrencyCount: false,
  concurrency: 1,
});

async function shopifyFetch(endpoint: string, options: RequestInit = {}) {
  const url = `https://${config.shopify.storeDomain}/admin/api/${config.shopify.apiVersion}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': config.shopify.accessToken,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API ${response.status}: ${text}`);
  }

  return await response.json();
}

async function run() {
  console.log('\n🧪 Shopify Price Offset - TEST RUN (10 products with offsets)\n');
  
  if (config.dryRun) {
    console.log('⚠️  DRY RUN MODE - No prices will be updated\n');
  }

  await initDb();
  
  const vendorRates = loadVendorRates();
  const tagRates = loadTagRates();
  
  console.log(`[Test] Loaded ${vendorRates.size} vendor rates`);
  console.log(`[Test] Loaded ${tagRates.size} tag rates\n`);

  // Get list of vendors with offsets
  const vendorsWithOffsets = Array.from(vendorRates.keys()).filter(v => {
    const rate = vendorRates.get(v);
    return rate && rate.shippingCost > 0;
  });

  console.log(`[Test] Looking for products from vendors with offsets...`);
  console.log(`[Test] Target vendors: ${vendorsWithOffsets.slice(0, 5).join(', ')}...\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const TARGET = 10;

  // Fetch products one page at a time until we find 10 with offsets
  let pageInfo: string | null = null;
  let hasNextPage = true;

  while (hasNextPage && processed < TARGET) {
    const params = new URLSearchParams({
      limit: '50', // Smaller pages for test
      fields: 'id,title,vendor,tags,status,variants',
    });

    if (pageInfo) {
      params.set('page_info', pageInfo);
    }

    const data = await queue.add(() => shopifyFetch(`/products.json?${params}`));
    
    if (!data.products || data.products.length === 0) {
      hasNextPage = false;
      break;
    }

    // Process products from this page
    for (const product of data.products) {
      if (processed >= TARGET) break;

      // Only process published products
      if (product.status !== 'active') {
        continue;
      }

      const vendor = product.vendor || '';
      const tags = normalizeTags(product.tags);
      const { shippingOffset, tagMatch } = resolveShippingOffset(vendor, tags, { vendorRates, tagRates });

      // Only process products with offsets
      if (shippingOffset === null || shippingOffset === 0) {
        continue;
      }

      processed++;
      console.log(`\n[${processed}] Processing: ${product.title}`);
      console.log(`    Vendor: ${vendor}`);
      console.log(`    Offset: $${shippingOffset}`);

      let variantsUpdated = 0;

      for (const variant of product.variants || []) {
        const currentPrice = Number(variant.price);
        const currentCompareAt = variant.compare_at_price ? Number(variant.compare_at_price) : null;

        const adjustedPrice = Number((currentPrice + shippingOffset).toFixed(2));
        
        let adjustedCompareAt: number | null = null;
        if (currentCompareAt && currentCompareAt > currentPrice) {
          const ratio = currentPrice / currentCompareAt;
          adjustedCompareAt = Number((adjustedPrice / ratio).toFixed(2));
        }

        const shouldUpdate = !closeTo(currentPrice, adjustedPrice);

        if (shouldUpdate && !config.dryRun) {
          await updateVariantPrice(
            variant.id,
            adjustedPrice.toFixed(2),
            adjustedCompareAt ? adjustedCompareAt.toFixed(2) : null
          );
          variantsUpdated++;
          console.log(`    ✓ Variant ${variant.id}: $${currentPrice} → $${adjustedPrice}`);
        } else if (shouldUpdate && config.dryRun) {
          console.log(`    [DRY RUN] Would update ${variant.id}: $${currentPrice} → $${adjustedPrice}`);
        } else {
          console.log(`    - Variant ${variant.id}: Already at $${adjustedPrice}`);
        }

        // Log to audit database
        await upsertAudit({
          variantId: variant.id,
          productId: product.id,
          vendorName: vendor,
          tags,
          shopifyPrice: currentPrice,
          shopifyCompareAt: currentCompareAt || undefined,
          shippingOffset,
          adjustedPrice,
          adjustedCompareAt,
          tagMatch,
          lastSource: 'bulk',
        });
      }

      if (variantsUpdated > 0) {
        updated++;
      }
    }

    // Check for next page
    if (data.products.length < 50) {
      hasNextPage = false;
    } else {
      const linkHeader = data._link;
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextMatch = linkHeader.match(/page_info=([^&>]+)/);
        pageInfo = nextMatch ? nextMatch[1] : null;
        hasNextPage = !!pageInfo;
      } else {
        hasNextPage = false;
      }
    }
  }

  console.log('\n[Test] ✅ Completed.');
  console.log(`Total: ${processed} products with offsets processed, ${updated} had price updates`);

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No prices were actually updated');
  }
}

run().catch((error) => {
  console.error('[Test] Failed:', error);
  process.exit(1);
});
