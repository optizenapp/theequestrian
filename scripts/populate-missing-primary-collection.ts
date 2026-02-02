#!/usr/bin/env tsx
/**
 * Populate missing primary_collection metafields for all products
 * Uses the Postgres collection_mapping to determine the correct path
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { GraphQLClient } from 'graphql-request';
import { neon } from '@neondatabase/serverless';

const SHOPIFY_STORE = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!SHOPIFY_STORE || !SHOPIFY_STOREFRONT_TOKEN || !SHOPIFY_ADMIN_TOKEN) {
  console.error('Missing Shopify credentials');
  process.exit(1);
}

const storefrontClient = new GraphQLClient(`https://${SHOPIFY_STORE}/api/2023-10/graphql.json`, {
  headers: {
    'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
  },
});

const adminClient = new GraphQLClient(`https://${SHOPIFY_STORE}/admin/api/2024-01/graphql.json`, {
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
  },
});

const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || '');

const DRY_RUN = process.argv.includes('--dry-run');

// Simple delay function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Product {
  id: string;
  handle: string;
  title: string;
  productType: string;
  metafield: { value: string } | null;
}

interface ProductsResponse {
  products: {
    edges: Array<{
      node: Product;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

interface MappingRow {
  product_type: string;
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  action: string;
}

/**
 * Get collection path from mapping for a productType
 */
async function getCollectionPathForProductType(productType: string): Promise<string | null> {
  if (!productType || !productType.trim()) {
    return null;
  }

  const mappings = await sql<MappingRow[]>`
    SELECT 
      product_type,
      top_level,
      parent_category,
      subcategory_handle,
      action
    FROM collection_mapping
    WHERE LOWER(TRIM(product_type)) = LOWER(TRIM(${productType}))
      AND action IN ('include', 'merge')
    LIMIT 1
  `;

  if (mappings.length === 0) {
    return null;
  }

  const row = mappings[0];
  const pathParts = [row.top_level, row.parent_category, row.subcategory_handle].filter(Boolean);
  
  if (pathParts.length === 0) {
    return null;
  }

  return pathParts.join('/');
}

/**
 * Set primary_collection metafield for a product using Admin API
 */
async function setPrimaryCollectionMetafield(productGid: string, collectionPath: string): Promise<boolean> {
  const mutation = `
    mutation setMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response: any = await adminClient.request(mutation, {
      metafields: [
        {
          ownerId: productGid,
          namespace: 'custom',
          key: 'primary_collection',
          value: collectionPath,
          type: 'single_line_text_field',
        },
      ],
    });

    if (response.metafieldsSet.userErrors?.length > 0) {
      console.error(`   ❌ Error: ${response.metafieldsSet.userErrors[0].message}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`   ❌ GraphQL Error: ${error.message}`);
    return false;
  }
}

async function populateMissingMetafields() {
  console.log('🔍 Finding products without primary_collection metafield...\n');
  
  if (DRY_RUN) {
    console.log('🔒 DRY RUN MODE - No changes will be made\n');
  }

  const query = `
    query getProducts($after: String) {
      products(first: 250, after: $after) {
        edges {
          node {
            id
            handle
            title
            productType
            metafield(namespace: "custom", key: "primary_collection") {
              value
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let cursor: string | null = null;
  let totalChecked = 0;
  let missingMetafield = 0;
  let canMap = 0;
  let cannotMap = 0;
  let updated = 0;
  let errors = 0;

  const productsToUpdate: Array<{ id: string; handle: string; title: string; productType: string; path: string }> = [];
  const unmappable: Array<{ handle: string; productType: string }> = [];

  // Phase 1: Scan all products and identify what needs updating
  console.log('📊 Phase 1: Scanning all products...\n');

  while (true) {
    const data: ProductsResponse = await storefrontClient.request(query, { after: cursor });

    for (const { node } of data.products.edges) {
      totalChecked++;

      // Skip if metafield already set
      if (node.metafield?.value) {
        continue;
      }

      missingMetafield++;

      // Try to find collection path for this productType
      const collectionPath = await getCollectionPathForProductType(node.productType);

      if (collectionPath) {
        canMap++;
        productsToUpdate.push({
          id: node.id,
          handle: node.handle,
          title: node.title,
          productType: node.productType,
          path: collectionPath,
        });
      } else {
        cannotMap++;
        unmappable.push({
          handle: node.handle,
          productType: node.productType || 'NO TYPE',
        });
      }
    }

    if (totalChecked % 250 === 0) {
      console.log(`   Scanned ${totalChecked} products...`);
    }

    if (!data.products.pageInfo.hasNextPage) {
      break;
    }

    cursor = data.products.pageInfo.endCursor;
  }

  console.log(`\n📊 Scan Results:\n`);
  console.log(`   Total products: ${totalChecked}`);
  console.log(`   Missing metafield: ${missingMetafield}`);
  console.log(`   ✅ Can map from productType: ${canMap}`);
  console.log(`   ❌ Cannot map (no mapping found): ${cannotMap}`);

  // Show unmappable products
  if (unmappable.length > 0) {
    console.log(`\n⚠️  Products that cannot be mapped (showing first 20):\n`);
    unmappable.slice(0, 20).forEach((p) => {
      console.log(`   - ${p.handle} (productType: "${p.productType}")`);
    });
    if (unmappable.length > 20) {
      console.log(`   ... and ${unmappable.length - 20} more`);
    }
  }

  // Phase 2: Update metafields
  if (productsToUpdate.length === 0) {
    console.log('\n✅ No products need updating!\n');
    return;
  }

  if (DRY_RUN) {
    console.log(`\n🔒 DRY RUN: Would update ${productsToUpdate.length} products`);
    console.log('\n📋 Sample updates (first 10):\n');
    productsToUpdate.slice(0, 10).forEach((p) => {
      console.log(`   ${p.handle} → /${p.path}`);
    });
    console.log('\n💡 Run without --dry-run to apply changes\n');
    return;
  }

  console.log(`\n📝 Phase 2: Updating ${productsToUpdate.length} products...\n`);
  console.log('⚠️  This will take a while (rate limited to 2 req/sec)...\n');

  for (let i = 0; i < productsToUpdate.length; i++) {
    const product = productsToUpdate[i];

    const success = await setPrimaryCollectionMetafield(product.id, product.path);

    if (success) {
      updated++;
      console.log(`   ✅ [${i + 1}/${productsToUpdate.length}] ${product.handle} → /${product.path}`);
    } else {
      errors++;
      console.log(`   ❌ [${i + 1}/${productsToUpdate.length}] ${product.handle} - FAILED`);
    }

    // Rate limit: 2 requests per second
    await delay(500);
  }

  console.log(`\n✅ COMPLETE!\n`);
  console.log(`   Successfully updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Cannot map (no productType mapping): ${cannotMap}`);
  console.log('\n');
}

populateMissingMetafields().catch(console.error);
