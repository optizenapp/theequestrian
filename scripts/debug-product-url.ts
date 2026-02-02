#!/usr/bin/env tsx
/**
 * Debug why a specific product is getting /products/ URL instead of hierarchical URL
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

// Import neon directly to avoid module resolution issues
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');
import { GraphQLClient } from 'graphql-request';

const SHOPIFY_STORE = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!SHOPIFY_STORE || !SHOPIFY_TOKEN) {
  console.error('Missing Shopify credentials');
  process.exit(1);
}

const client = new GraphQLClient(`https://${SHOPIFY_STORE}/api/2023-10/graphql.json`, {
  headers: {
    'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
  },
});

const productHandle = process.argv[2] || 'waldhausen-esperia-saddle-pad-dressage';

async function debugProduct() {
  console.log(`\n🔍 Debugging product: ${productHandle}\n`);

  // 1. Get product from Shopify
  const query = `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        handle
        title
        productType
        metafield(namespace: "custom", key: "primary_collection") {
          value
        }
      }
    }
  `;

  interface ProductResponse {
    product: {
      handle: string;
      title: string;
      productType: string;
      metafield: {
        value: string;
      } | null;
    };
  }

  let product: ProductResponse['product'];
  try {
    const data = await client.request<ProductResponse>(query, { handle: productHandle });
    product = data.product;
    console.log('📦 Product in Shopify:');
    console.log(`   Title: ${product.title}`);
    console.log(`   Product Type: "${product.productType}"`);
    console.log(`   Primary Collection Metafield: ${product.metafield?.value || '❌ NOT SET'}`);
  } catch (error: any) {
    console.error('❌ Product not found in Shopify');
    process.exit(1);
  }

  // 2. Check if productType exists in mapping
  console.log(`\n🗺️  Checking mapping for productType: "${product.productType}"\n`);

  const mappings = await sql`
    SELECT 
      product_type,
      top_level,
      parent_category,
      subcategory_handle,
      action
    FROM collection_mapping
    WHERE LOWER(TRIM(product_type)) = LOWER(TRIM(${product.productType}))
  `;

  if (mappings.length === 0) {
    console.log(`❌ No exact match found in mapping for "${product.productType}"`);
    
    // Search for similar matches
    console.log(`\n🔍 Searching for similar product types in mapping...\n`);
    
    const similarMappings = await sql`
      SELECT 
        product_type,
        top_level,
        parent_category,
        subcategory_handle,
        action
      FROM collection_mapping
      WHERE LOWER(product_type) LIKE ${`%${product.productType.toLowerCase().split(' ')[0]}%`}
      LIMIT 10
    `;
    
    if (similarMappings.length > 0) {
      console.log('📋 Similar matches found:');
      similarMappings.forEach((row: any) => {
        const path = [row.top_level, row.parent_category, row.subcategory_handle].filter(Boolean).join('/');
        console.log(`   - "${row.product_type}" → /${path} (${row.action})`);
      });
    } else {
      console.log('   No similar matches found');
    }
  } else {
    console.log('✅ Exact matches found in mapping:');
    mappings.forEach((row: any) => {
      const path = [row.top_level, row.parent_category, row.subcategory_handle].filter(Boolean).join('/');
      console.log(`   - "${row.product_type}" → /${path} (${row.action})`);
    });
  }

  // 3. Show what URL would be generated
  console.log(`\n🔗 URL Generation:\n`);
  
  if (product.metafield?.value) {
    console.log(`   ✅ Has metafield: /${product.metafield.value}/${product.handle}`);
  } else if (mappings.length > 0 && mappings[0].action !== 'exclude') {
    const row = mappings[0];
    const path = [row.top_level, row.parent_category, row.subcategory_handle].filter(Boolean).join('/');
    console.log(`   ✅ Has mapping: /${path}/${product.handle}`);
  } else {
    console.log(`   ❌ Fallback: /products/${product.handle}`);
    console.log(`\n💡 Reason: No metafield AND no mapping match for productType "${product.productType}"`);
  }

  console.log('\n');
}

debugProduct().catch(console.error);
