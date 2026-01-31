import { initDb, upsertAudit, getAuditByVariant } from '../db/index.js';
import { loadVendorRates, loadTagRates } from '../db/rates.js';
import { getAllProducts, updateVariantPrice } from '../shopify/client.js';
import { resolveShippingOffset, normalizeTags } from '../price/offset.js';
import { config } from '../config.js';

const SAMPLE_SIZE = process.env.SAMPLE_SIZE ? Number(process.env.SAMPLE_SIZE) : null;
const PRICE_EPSILON = 0.01;

function closeTo(a: number, b: number) {
  return Math.abs(a - b) <= PRICE_EPSILON;
}

async function run() {
  console.log('\n🚀 Shopify Price Offset - Bulk Update\n');
  
  if (config.dryRun) {
    console.log('⚠️  DRY RUN MODE - No prices will be updated\n');
  }

  await initDb();
  
  const vendorRates = await loadVendorRates();
  const tagRates = await loadTagRates();
  
  console.log(`[Bulk] Loaded ${vendorRates.size} vendor rates from Postgres`);
  console.log(`[Bulk] Loaded ${tagRates.size} tag rates from Postgres`);
  
  if (SAMPLE_SIZE) {
    console.log(`[Bulk] SAMPLE MODE: Will process ${SAMPLE_SIZE} products only`);
  }
  console.log('');

  // Fetch all products from Shopify
  console.log('[Bulk] Fetching products from Shopify...');
  const products = await getAllProducts();
  console.log(`[Bulk] Found ${products.length} products\n`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const failedProducts: Array<{ id: string; title: string; error: string }> = [];

  for (const product of products) {
    if (SAMPLE_SIZE && processed >= SAMPLE_SIZE) {
      console.log(`\n[Bulk] ✅ Sample limit reached (${SAMPLE_SIZE} products)`);
      break;
    }

    try {
      console.log(`\n[${processed + 1}] Processing: ${product.title} (ID: ${product.id})`);

      // Only process published products
      if (product.status !== 'active') {
        console.log(`[Bulk] Skipping ${product.status || 'draft'} product`);
        skipped++;
        processed++;
        continue;
      }

      const vendor = product.vendor || '';
      const tags = normalizeTags(product.tags);
      const { shippingOffset, tagMatch } = resolveShippingOffset(vendor, tags, { vendorRates, tagRates });

      if (shippingOffset === null) {
        console.log(`[Bulk] No shipping offset for vendor: ${vendor}, skipping`);
        skipped++;
        processed++;
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
        updated++;
      }
      
      console.log(`[Bulk] Product ${product.id} complete: ${variantsUpdated} variants updated`);
      processed++;

    } catch (error: any) {
      failed++;
      const errorMsg = error.message || String(error);
      console.error(`[Bulk] ⚠️  Failed product ${product.id}: ${errorMsg}`);
      failedProducts.push({
        id: product.id,
        title: product.title,
        error: errorMsg,
      });
    }
  }

  console.log('\n[Bulk] ✅ Completed.');
  console.log(`Total: ${processed} processed, ${updated} updated, ${skipped} skipped, ${failed} failed`);

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
