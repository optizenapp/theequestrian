import fs from 'fs';
import path from 'path';
import { initDb, getAuditByVariants } from '../db';
import { loadTagRates, loadVendorRates } from '../csv/loadRates';
import { loadSellerMapping } from '../csv/loadSellerMapping';
import { listProducts, getProductById } from '../webkul/products';
import { resolveShippingOffset, normalizeTags } from '../price/offset';
import type { WebkulProduct } from '../webkul/types';
import { config } from '../config';

const SAMPLE_SIZE = Number(process.env.SAMPLE_SIZE || 50);
const SAMPLE_PAGE = Number(process.env.SAMPLE_PAGE || 1);
const SAMPLE_INCLUDE_UNMAPPED = process.env.SAMPLE_INCLUDE_UNMAPPED === '1';

function csvEscape(value: string | number | null | undefined) {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getVendorName(product: WebkulProduct, sellerMapping: Map<string, string>) {
  // Try seller mapping first
  if (product.seller_id) {
    const mapped = sellerMapping.get(String(product.seller_id));
    if (mapped) return mapped;
  }
  // Fall back to product fields
  return product.brand_name || product.vendor || '';
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

async function run() {
  console.log('========================================');
  console.log('  DRY RUN - NO PRICES WILL BE CHANGED');
  console.log('========================================\n');
  
  await initDb();

  const vendorRates = loadVendorRates();
  const tagRates = loadTagRates();
  const sellerMapping = loadSellerMapping();
  
  console.log(`[Verify] Loaded ${vendorRates.size} vendor rates`);
  console.log(`[Verify] Loaded ${tagRates.size} tag rates`);
  console.log(`[Verify] Loaded ${sellerMapping.size} seller mappings`);
  console.log(`[Verify] Sample size: ${SAMPLE_SIZE}`);
  console.log(`[Verify] Starting from page: ${SAMPLE_PAGE}`);
  console.log(`[Verify] Include unmapped: ${SAMPLE_INCLUDE_UNMAPPED}\n`);

  const rows: string[] = [];
  rows.push(
    [
      'product_id',
      'variant_id',
      'vendor',
      'tags',
      'shipping_offset',
      'current_price',
      'audit_vendor_price',
      'expected_adjusted_price',
      'baseline_source',
      'status',
    ].join(',')
  );

  let page = SAMPLE_PAGE;
  let collected = 0;

  while (collected < SAMPLE_SIZE) {
    const products = await listProducts(page, config.pageSize);
    if (products.length === 0) break;

    for (const product of products) {
      if (collected >= SAMPLE_SIZE) break;

      console.log(`[Verify] Fetching product ${product.id}...`);
      const fullProduct = await getProductById(product.id);
      if (!fullProduct) {
        console.log(`[Verify] Product ${product.id} not found, skipping`);
        continue;
      }

      const vendorName = getVendorName(fullProduct, sellerMapping);
      const tags = normalizeTags(fullProduct.product_tag ?? fullProduct.tags);
      
      // Debug: show raw vendor fields
      if (collected === 0) {
        console.log(`[DEBUG] First product fields:`);
        console.log(`  - product.vendor: "${fullProduct.vendor}"`);
        console.log(`  - product.brand_name: "${fullProduct.brand_name}"`);
        console.log(`  - Raw product object keys: ${Object.keys(fullProduct).join(', ')}`);
      }
      
      const { shippingOffset, tagMatch } = resolveShippingOffset(fullProduct, { vendorRates, tagRates, sellerMapping });
      
      if (shippingOffset === null && !SAMPLE_INCLUDE_UNMAPPED) {
        console.log(`[Verify] Product ${product.id} - Vendor: "${vendorName}", Tags: [${tags.join(', ')}] - NO MATCH, skipping`);
        continue;
      }
      
      if (shippingOffset !== null) {
        console.log(`[Verify] Product ${product.id} - Vendor: "${vendorName}" - MATCHED with offset $${shippingOffset}${tagMatch ? ` (via tag: ${tagMatch})` : ''}`);
      }

      const variantIds = (fullProduct.variants || []).map((variant) => String(variant.id));
      const auditMap = await getAuditByVariants(variantIds);

      for (const variant of fullProduct.variants || []) {
        const currentPrice = Number(variant.price);
        const audit = auditMap.get(String(variant.id));
        const auditVendorPrice = toNumber(audit?.vendorPrice ?? null);
        const baselineSource = auditVendorPrice !== null ? 'audit' : 'current';
        const vendorPriceBaseline = auditVendorPrice !== null ? auditVendorPrice : currentPrice;
        const expectedAdjusted =
          shippingOffset === null
            ? null
            : Number((vendorPriceBaseline + shippingOffset).toFixed(2));

        let status = 'unknown';
        if (shippingOffset === null) {
          status = 'no_offset';
        } else if (Math.abs(currentPrice - expectedAdjusted) <= 0.01) {
          status = 'already_adjusted';
        } else if (Math.abs(currentPrice - vendorPriceBaseline) <= 0.01) {
          status = 'vendor_price';
        } else {
          status = 'mismatch';
        }

        rows.push(
          [
            csvEscape(fullProduct.id),
            csvEscape(variant.id),
            csvEscape(vendorName),
            csvEscape(tags.join('|')),
            csvEscape(shippingOffset ?? ''),
            csvEscape(currentPrice.toFixed(2)),
            csvEscape(auditVendorPrice !== null ? auditVendorPrice.toFixed(2) : ''),
            csvEscape(expectedAdjusted !== null ? expectedAdjusted.toFixed(2) : ''),
            csvEscape(baselineSource),
            csvEscape(status),
          ].join(',')
        );
      }

      collected += 1;
      console.log(`[Verify] Collected ${collected}/${SAMPLE_SIZE} products (page ${page})`);
    }

    page += 1;
  }

  const outDir = path.join(process.cwd(), 'outputs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `verify-sample-${Date.now()}.csv`);
  fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf-8');

  console.log(`\n[Verify] ✅ DRY RUN COMPLETE - No prices were changed`);
  console.log(`[Verify] Wrote ${rows.length - 1} variant rows to ${outPath}`);
  console.log(`[Verify] Review the CSV to see shipping offset calculations`);
}

run().catch((error) => {
  console.error('[Verify] Failed:', error);
  process.exit(1);
});
