#!/usr/bin/env tsx
/**
 * Audit primary_collection metafield coverage across all products
 * Check how many products have it set vs. missing
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

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

interface Product {
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

async function auditAllProducts() {
  console.log('🔍 Auditing primary_collection metafield coverage...\n');

  const query = `
    query getProducts($after: String) {
      products(first: 250, after: $after) {
        edges {
          node {
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
  let totalProducts = 0;
  let withMetafield = 0;
  let withoutMetafield = 0;
  const productsWithout: Array<{ handle: string; title: string; productType: string }> = [];
  const metafieldValues = new Map<string, number>(); // Track metafield value distribution

  while (true) {
    const data: ProductsResponse = await client.request(query, { after: cursor });

    for (const { node } of data.products.edges) {
      totalProducts++;

      if (node.metafield?.value) {
        withMetafield++;
        // Track which collection paths are used
        const value = node.metafield.value;
        metafieldValues.set(value, (metafieldValues.get(value) || 0) + 1);
      } else {
        withoutMetafield++;
        productsWithout.push({
          handle: node.handle,
          title: node.title,
          productType: node.productType || 'NO TYPE',
        });
      }
    }

    console.log(`   Checked ${totalProducts} products...`);

    if (!data.products.pageInfo.hasNextPage) {
      break;
    }

    cursor = data.products.pageInfo.endCursor;
  }

  // Results
  console.log(`\n📊 RESULTS:\n`);
  console.log(`   Total Products: ${totalProducts}`);
  console.log(`   ✅ With primary_collection: ${withMetafield} (${Math.round((withMetafield / totalProducts) * 100)}%)`);
  console.log(`   ❌ Without primary_collection: ${withoutMetafield} (${Math.round((withoutMetafield / totalProducts) * 100)}%)`);

  // Show metafield value distribution
  if (metafieldValues.size > 0) {
    console.log(`\n📋 Collection Path Distribution (top 20):\n`);
    const sorted = Array.from(metafieldValues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    sorted.forEach(([path, count]) => {
      console.log(`   ${count.toString().padStart(5, ' ')}x  /${path}`);
    });
  }

  // Show products without metafield
  if (productsWithout.length > 0) {
    console.log(`\n❌ Products WITHOUT primary_collection (showing first 50):\n`);
    productsWithout.slice(0, 50).forEach((p) => {
      console.log(`   - ${p.handle}`);
      console.log(`     Title: ${p.title}`);
      console.log(`     Product Type: "${p.productType}"`);
      console.log('');
    });

    if (productsWithout.length > 50) {
      console.log(`   ... and ${productsWithout.length - 50} more\n`);
    }
  }

  // Summary
  console.log('\n📌 SUMMARY:\n');
  if (withoutMetafield === 0) {
    console.log('   ✅ Perfect! All products have primary_collection set.');
    console.log('   ✅ No fallback logic needed.');
  } else {
    console.log(`   ⚠️  ${withoutMetafield} products are missing primary_collection metafield.`);
    console.log('   ⚠️  These will fall back to productType mapping or /products/');
    console.log('   💡 Run a script to populate missing metafields.');
  }

  console.log('\n');
}

auditAllProducts().catch(console.error);
