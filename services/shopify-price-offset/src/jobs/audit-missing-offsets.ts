#!/usr/bin/env tsx
/**
 * Audit Missing Price Offsets
 * 
 * Finds all products that should have offsets but weren't processed
 */

import { getAllProducts } from '../shopify/client.js';
import { pool } from '../db/index.js';
import { loadVendorRates, loadTagRates } from '../csv/loadRates.js';
import { resolveShippingOffset, normalizeTags } from '../price/offset.js';
import * as fs from 'fs';
import * as path from 'path';

(async () => {
  console.log('🔍 Auditing Missing Price Offsets...\n');
  
  const vendorRates = loadVendorRates();
  const tagRates = loadTagRates();
  
  console.log(`[Audit] Loaded ${vendorRates.size} vendor rates`);
  console.log(`[Audit] Loaded ${tagRates.size} tag rates\n`);
  
  // Fetch all products from Shopify
  console.log('[Audit] Fetching all products from Shopify...');
  const products = await getAllProducts();
  console.log(`[Audit] Found ${products.length} total products\n`);
  
  const missingOffsets: Array<{
    productId: string;
    productTitle: string;
    variantId: string;
    variantTitle: string;
    vendor: string;
    tags: string;
    currentPrice: string;
    expectedOffset: number | null;
    reason: string;
  }> = [];
  
  let processed = 0;
  let hasOffset = 0;
  let noOffset = 0;
  let notInAudit = 0;
  
  console.log('[Audit] Checking each product...\n');
  
  for (const product of products) {
    const vendor = product.vendor || '';
    const tags = normalizeTags(product.tags);
    const { shippingOffset } = resolveShippingOffset(vendor, tags, { vendorRates, tagRates });
    
    for (const variant of product.variants || []) {
      processed++;
      
      // Check if this variant is in audit database
      const auditResult = await pool.query(`
        SELECT shipping_offset
        FROM shopify_price_audit
        WHERE variant_id = $1
      `, [variant.id]);
      
      if (auditResult.rows.length === 0) {
        // Not in audit database
        notInAudit++;
        
        if (shippingOffset && shippingOffset > 0) {
          // Should have an offset but wasn't processed
          missingOffsets.push({
            productId: product.id,
            productTitle: product.title,
            variantId: variant.id,
            variantTitle: variant.title || 'Default',
            vendor,
            tags: tags.join(', '),
            currentPrice: variant.price,
            expectedOffset: shippingOffset,
            reason: 'Not processed by bulk script'
          });
        } else {
          // No offset needed (vendor has $0 shipping)
          noOffset++;
        }
      } else {
        // In audit database
        const audit = auditResult.rows[0];
        if (audit.shipping_offset && parseFloat(audit.shipping_offset) > 0) {
          hasOffset++;
        } else {
          noOffset++;
        }
      }
      
      // Progress update
      if (processed % 1000 === 0) {
        console.log(`   Processed ${processed} variants...`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total variants processed: ${processed}`);
  console.log(`✅ Has offset applied: ${hasOffset}`);
  console.log(`⚠️  No offset needed (vendor has $0 shipping): ${noOffset}`);
  console.log(`❌ Missing offset (should have but wasn't processed): ${missingOffsets.length}`);
  console.log(`📊 Not in audit database: ${notInAudit}`);
  
  if (missingOffsets.length > 0) {
    console.log(`\n⚠️  Found ${missingOffsets.length} products that need price offsets!\n`);
    
    // Export to CSV
    const outputPath = path.join(process.cwd(), 'outputs', `missing-offsets-${Date.now()}.csv`);
    
    // Create outputs directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const csvHeader = 'product_id,product_title,variant_id,variant_title,vendor,tags,current_price,expected_offset,expected_price,reason\n';
    const csvRows = missingOffsets.map(item => {
      const expectedPrice = (parseFloat(item.currentPrice) + (item.expectedOffset || 0)).toFixed(2);
      return [
        item.productId,
        `"${item.productTitle.replace(/"/g, '""')}"`,
        item.variantId,
        `"${item.variantTitle.replace(/"/g, '""')}"`,
        `"${item.vendor.replace(/"/g, '""')}"`,
        `"${item.tags.replace(/"/g, '""')}"`,
        item.currentPrice,
        item.expectedOffset || 0,
        expectedPrice,
        item.reason
      ].join(',');
    }).join('\n');
    
    fs.writeFileSync(outputPath, csvHeader + csvRows);
    console.log(`✅ Exported missing offsets to: ${outputPath}`);
    
    // Show sample
    console.log(`\n📋 Sample of missing offsets (first 10):\n`);
    missingOffsets.slice(0, 10).forEach((item, i) => {
      console.log(`${i + 1}. ${item.productTitle} (${item.variantTitle})`);
      console.log(`   Vendor: ${item.vendor}`);
      console.log(`   Current: $${item.currentPrice} → Should be: $${(parseFloat(item.currentPrice) + (item.expectedOffset || 0)).toFixed(2)} (+$${item.expectedOffset})`);
      console.log(`   Product ID: ${item.productId}`);
      console.log(`   Variant ID: ${item.variantId}`);
      console.log('');
    });
    
    if (missingOffsets.length > 10) {
      console.log(`   ... and ${missingOffsets.length - 10} more (see CSV for full list)\n`);
    }
  } else {
    console.log('\n✅ All products that need offsets have been processed!\n');
  }
  
  await pool.end();
  console.log('✅ Audit complete!');
})();
