import { initDb, upsertAudit } from '../db/index.js';
import { loadVendorRates, loadTagRates } from '../db/rates.js';
import { shopifyGraphql, getProductById, updateVariantPrice } from '../shopify/client.js';
import { resolveShippingOffset, normalizeTags } from '../price/offset.js';
import { config } from '../config.js';

const SAMPLE_SIZE = process.env.SAMPLE_SIZE ? Number(process.env.SAMPLE_SIZE) : null;
const PRICE_EPSILON = 0.01;

function closeTo(a: number, b: number) {
  return Math.abs(a - b) <= PRICE_EPSILON;
}

/**
 * Fetch ONLY product IDs for a vendor (lightweight query)
 */
async function getProductIdsForVendor(vendor: string): Promise<string[]> {
  const productIds: string[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage) {
    const query = `
      query($vendor: String!, $cursor: String) {
        products(first: 100, query: $vendor, after: $cursor) {
          edges {
            node {
              id
              status
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables: any = {
      vendor: `vendor:"${vendor}" status:active`,
    };

    if (cursor) {
      variables.cursor = cursor;
    }

    const data = await shopifyGraphql(query, variables);
    pageCount++;

    if (data.data?.products?.edges) {
      const activeProducts = data.data.products.edges
        .filter((edge: any) => edge.node.status === 'ACTIVE')
        .map((edge: any) => edge.node.id.replace('gid://shopify/Product/', ''));
      
      productIds.push(...activeProducts);
      console.log(`  [${vendor}] Fetched ${productIds.length} product IDs so far... (page ${pageCount})`);
    }

    hasNextPage = data.data?.products?.pageInfo?.hasNextPage || false;
    cursor = data.data?.products?.pageInfo?.endCursor || null;

    // Small delay between pages
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return productIds;
}

async function run() {
  console.log('\n🚀 Shopify Price Offset - Bulk Update (Vendor-Only)\n');
  
  if (config.dryRun) {
    console.log('⚠️  DRY RUN MODE - No prices will be updated\n');
  }

  await initDb();
  
  const vendorRates = await loadVendorRates();
  const tagRates = await loadTagRates();
  
  console.log(`[Bulk] Loaded ${vendorRates.size} vendor rates from Postgres`);
  console.log(`[Bulk] Loaded ${tagRates.size} tag rates from Postgres\n`);
  
  if (SAMPLE_SIZE) {
    console.log(`[Bulk] SAMPLE MODE: Will process ${SAMPLE_SIZE} products only\n`);
  }

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // Process each vendor
  for (const [vendor, rate] of vendorRates) {
    console.log(`\n📦 Processing vendor: ${vendor} (offset: $${rate})`);
    console.log('='.repeat(60));

    try {
      // Step 1: Get product IDs for this vendor (lightweight)
      const productIds = await getProductIdsForVendor(vendor);
      console.log(`[${vendor}] Found ${productIds.length} active products\n`);

      if (productIds.length === 0) {
        console.log(`[${vendor}] No products found, skipping\n`);
        continue;
      }

      // Step 2: Fetch full product details and update prices
      for (const productId of productIds) {
        if (SAMPLE_SIZE && totalProcessed >= SAMPLE_SIZE) {
          console.log(`\n[Bulk] ✅ Sample limit reached (${SAMPLE_SIZE} products)`);
          break;
        }

        try {
          const product = await getProductById(productId);
          
          if (!product) {
            console.log(`[${vendor}] Product ${productId} not found, skipping`);
            totalSkipped++;
            totalProcessed++;
            continue;
          }

          console.log(`\n[${totalProcessed + 1}] Processing: ${product.title} (ID: ${product.id})`);

          const tags = normalizeTags(product.tags);
          const { shippingOffset, tagMatch } = resolveShippingOffset(vendor, tags, { vendorRates, tagRates });

          if (shippingOffset === null) {
            console.log(`[Bulk] No shipping offset for vendor: ${vendor}, skipping`);
            totalSkipped++;
            totalProcessed++;
            continue;
          }

          let variantsUpdated = 0;

          for (const variant of product.variants || []) {
            const currentPrice = Number(variant.price);
            const currentCompareAt = variant.compare_at_price ? Number(variant.compare_at_price) : null;

            // Calculate new price with shipping offset
            const adjustedPrice = Number((currentPrice + shippingOffset).toFixed(2));
            
            // Calculate adjusted compare_at_price (maintain same discount ratio)
            let adjustedCompareAt: number | null = null;
            if (currentCompareAt && currentCompareAt > currentPrice) {
              const ratio = currentPrice / currentCompareAt;
              adjustedCompareAt = Number((adjustedPrice / ratio).toFixed(2));
            }

            // Check if update is needed
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
          console.error(`[Bulk] ⚠️  Failed product ${productId}: ${errorMsg}`);
        }
      }

      console.log(`\n[${vendor}] Complete: ${productIds.length} products processed\n`);

    } catch (error: any) {
      console.error(`[${vendor}] ⚠️  Failed to process vendor: ${error.message}`);
    }
  }

  console.log('\n[Bulk] ✅ Completed.');
  console.log(`Total: ${totalProcessed} processed, ${totalUpdated} updated, ${totalSkipped} skipped, ${totalFailed} failed`);

  if (config.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No prices were actually updated');
  }
}

run().catch((error) => {
  console.error('[Bulk] Failed:', error);
  process.exit(1);
});
