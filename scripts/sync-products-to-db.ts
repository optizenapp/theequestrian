/**
 * Sync Products from Shopify to Neon Database
 * 
 * This script fetches all products from Shopify and stores them in Postgres
 * for fast querying. Price and inventory are NOT stored - always fetched real-time.
 * 
 * Usage:
 *   npm run sync-products
 *   or
 *   npx tsx scripts/sync-products-to-db.ts
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { sql } from '@/lib/db/client';
import { getAllProducts } from '@/lib/shopify/products';
import { syncProductToDb } from './lib/sync-product-to-db';
import type { ProductWithPrimaryCollection } from '@/types/shopify';

interface SyncStats {
  total: number;
  inserted: number;
  updated: number;
  failed: number;
  duration: number;
  errors: Array<{ productId: string; error: string }>;
}

async function syncProduct(product: ProductWithPrimaryCollection): Promise<'inserted' | 'updated' | 'failed'> {
  return syncProductToDb(product);
}

/**
 * Main sync function
 */
async function syncProductsFromShopify(): Promise<SyncStats> {
  const startTime = Date.now();
  const stats: SyncStats = {
    total: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    duration: 0,
    errors: [],
  };
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Starting Product Sync from Shopify to Postgres');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Log sync start
  const syncLogResult = await sql`
    INSERT INTO sync_log (sync_type, started_at)
    VALUES ('full', NOW())
    RETURNING id
  `;
  const syncLogId = syncLogResult[0].id;
  
  try {
    // Fetch all products from Shopify
    console.log('📥 Fetching all products from Shopify...');
    const allProducts = await getAllProducts();
    stats.total = allProducts.length;
    
    console.log(`✅ Fetched ${stats.total} products from Shopify\n`);
    console.log('💾 Syncing products to database...');
    
    // Sync products in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      
      // Process batch in parallel
      const results = await Promise.all(
        batch.map(product => syncProduct(product))
      );
      
      // Count results
      results.forEach(result => {
        if (result === 'inserted') stats.inserted++;
        else if (result === 'updated') stats.updated++;
        else if (result === 'failed') stats.failed++;
      });
      
      // Progress update
      const progress = Math.min(i + batchSize, allProducts.length);
      const percentage = ((progress / allProducts.length) * 100).toFixed(1);
      console.log(`   Progress: ${progress}/${allProducts.length} (${percentage}%)`);
    }
    
    stats.duration = Date.now() - startTime;
    
    // Update sync log
    await sql`
      UPDATE sync_log
      SET 
        products_synced = ${stats.inserted + stats.updated},
        products_failed = ${stats.failed},
        duration_ms = ${stats.duration},
        completed_at = NOW()
      WHERE id = ${syncLogId}
    `;
    
    // Print summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Sync Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total products:     ${stats.total}`);
    console.log(`Successfully synced: ${stats.inserted + stats.updated}`);
    console.log(`Failed:             ${stats.failed}`);
    console.log(`Duration:           ${(stats.duration / 1000).toFixed(2)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return stats;
  } catch (error) {
    // Log sync failure
    await sql`
      UPDATE sync_log
      SET 
        products_failed = ${stats.failed},
        error_message = ${error instanceof Error ? error.message : 'Unknown error'},
        completed_at = NOW()
      WHERE id = ${syncLogId}
    `;
    
    console.error('\n❌ Sync failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  syncProductsFromShopify()
    .then(stats => {
      console.log('🎉 Sync completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    });
}

export { syncProductsFromShopify };
