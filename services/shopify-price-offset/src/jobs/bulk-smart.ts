import { initDb, upsertAudit } from '../db/index.js';
import { loadVendorRates, loadTagRates } from '../db/rates.js';
import { updateVariantPrice } from '../shopify/client.js';
import { resolveShippingOffset, normalizeTags } from '../price/offset.js';
import { config } from '../config.js';
import PQueue from 'p-queue';

const SAMPLE_SIZE = process.env.SAMPLE_SIZE ? Number(process.env.SAMPLE_SIZE) : null;
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

  const data = await response.json();
  
  // Attach Link header for pagination
  const linkHeader = response.headers.get('Link');
  if (linkHeader) {
    data._link = linkHeader;
  }
  
  return data;
}

/**
 * Fetch products for a specific vendor (published only) using GraphQL
 */
async function getProductsForVendor(vendorName: string): Promise<any[]> {
  const products: any[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const query = `
      query($vendor: String!, $cursor: String) {
        products(first: 250, query: $vendor, after: $cursor) {
          edges {
            cursor
            node {
              id
              legacyResourceId
              title
              vendor
              tags
              status
              variants(first: 100) {
                edges {
                  node {
                    id
                    legacyResourceId
                    price
                    compareAtPrice
                    sku
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const variables = {
      vendor: `vendor:"${vendorName}" status:active`,
      cursor,
    };

    const data = await queue.add(() => 
      fetch(`https://${config.shopify.storeDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': config.shopify.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`GraphQL ${res.status}: ${text}`);
        }
        return res.json();
      })
    );

    if (data.data?.products?.edges) {
      for (const edge of data.data.products.edges) {
        const node = edge.node;
        
        // Convert GraphQL format to REST format for compatibility
        const product = {
          id: node.legacyResourceId,
          title: node.title,
          vendor: node.vendor,
          tags: node.tags,
          status: node.status,
          variants: node.variants.edges.map((v: any) => ({
            id: v.node.legacyResourceId,
            product_id: node.legacyResourceId,
            price: v.node.price,
            compare_at_price: v.node.compareAtPrice,
            sku: v.node.sku,
          })),
        };
        
        products.push(product);
        cursor = edge.cursor;
      }

      hasNextPage = data.data.products.pageInfo.hasNextPage;
    } else {
      hasNextPage = false;
    }
  }

  return products;
}

async function run() {
  console.log('\n🚀 Shopify Price Offset - Smart Bulk Update\n');
  console.log('📋 Only fetches products from vendors with offsets (published only)\n');
  
  if (config.dryRun) {
    console.log('⚠️  DRY RUN MODE - No prices will be updated\n');
  }

  await initDb();
  
  const vendorRates = await loadVendorRates();
  const tagRates = await loadTagRates();
  
  console.log(`[Bulk] Loaded ${vendorRates.size} vendor rates from Postgres`);
  console.log(`[Bulk] Loaded ${tagRates.size} tag rates from Postgres`);
  
  // Filter vendors with offsets > 0
  const vendorsWithOffsets = Array.from(vendorRates.entries())
    .filter(([_, rate]) => rate.shippingCost > 0)
    .map(([vendor]) => vendor);
  
  console.log(`[Bulk] Will fetch products from ${vendorsWithOffsets.length} vendors with offsets\n`);
  
  if (SAMPLE_SIZE) {
    console.log(`[Bulk] SAMPLE MODE: Will process ${SAMPLE_SIZE} products only\n`);
  }

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const failedProducts: Array<{ id: string; title: string; error: string }> = [];

  // Process each vendor
  for (const vendor of vendorsWithOffsets) {
    if (SAMPLE_SIZE && totalProcessed >= SAMPLE_SIZE) {
      console.log(`\n[Bulk] ✅ Sample limit reached (${SAMPLE_SIZE} products)`);
      break;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 Fetching products for vendor: ${vendor}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const products = await getProductsForVendor(vendor);
      console.log(`[Bulk] Found ${products.length} published products for ${vendor}\n`);

      for (const product of products) {
        if (SAMPLE_SIZE && totalProcessed >= SAMPLE_SIZE) {
          break;
        }

        try {
          console.log(`[${totalProcessed + 1}] Processing: ${product.title} (ID: ${product.id})`);

          const tags = normalizeTags(product.tags);
          const { shippingOffset, tagMatch } = resolveShippingOffset(vendor, tags, { vendorRates, tagRates });

          if (shippingOffset === null || shippingOffset === 0) {
            console.log(`[Bulk] No shipping offset, skipping`);
            totalSkipped++;
            totalProcessed++;
            continue;
          }

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
              console.log(`  ✓ Variant ${variant.id}: $${currentPrice} → $${adjustedPrice} (+$${shippingOffset})`);
            } else if (shouldUpdate && config.dryRun) {
              console.log(`  [DRY RUN] Would update variant ${variant.id}: $${currentPrice} → $${adjustedPrice} (+$${shippingOffset})`);
            } else {
              console.log(`  - Variant ${variant.id}: Already at $${adjustedPrice} (no change needed)`);
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
            totalUpdated++;
          }
          
          console.log(`[Bulk] Product ${product.id} complete: ${variantsUpdated} variants updated`);
          totalProcessed++;

        } catch (error: any) {
          totalFailed++;
          const errorMsg = error.message || String(error);
          console.error(`[Bulk] ⚠️  Failed product ${product.id}: ${errorMsg}`);
          failedProducts.push({
            id: product.id,
            title: product.title,
            error: errorMsg,
          });
        }
      }
    } catch (error: any) {
      console.error(`[Bulk] ⚠️  Failed to fetch products for vendor ${vendor}: ${error.message}`);
    }
  }

  console.log('\n[Bulk] ✅ Completed.');
  console.log(`Total: ${totalProcessed} processed, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed`);

  if (failedProducts.length > 0) {
    console.log('\n⚠️  Failed products (review these manually):');
    failedProducts.forEach(p => {
      console.log(`  - ${p.id}: ${p.title}`);
      console.log(`    Error: ${p.error}`);
    });
  }

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No prices were actually updated');
  }
}

run().catch((error) => {
  console.error('[Bulk] Failed:', error);
  process.exit(1);
});
