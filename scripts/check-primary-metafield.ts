#!/usr/bin/env tsx
/**
 * Check if primary_collection metafield is set for products
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

async function checkProduct(handle: string) {
  try {
    const data = await client.request<ProductResponse>(query, { handle });
    console.log('\n=== Product:', handle, '===');
    console.log('Title:', data.product.title);
    console.log('Product Type:', data.product.productType);
    console.log('Primary Collection:', data.product.metafield?.value || '❌ NOT SET');
    return data.product.metafield?.value;
  } catch (error: any) {
    console.error('Error:', error.message);
    return null;
  }
}

(async () => {
  // First check specific products
  console.log('🔍 Checking specific product types...\n');
  
  const checkQuery = `
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
      metafield: { value: string } | null;
    };
  }
  
  const boots = ['ariat-duraterrain-h20-ladies', 'ariat-durayard-h20-mens'];
  for (const handle of boots) {
    try {
      const data = await client.request<ProductResponse>(checkQuery, { handle });
      console.log(`${data.product.handle}:`);
      console.log(`  Type: "${data.product.productType}"`);
      console.log(`  Primary: ${data.product.metafield?.value || 'none'}`);
    } catch (e: any) {
      console.log(`${handle}: Not found`);
    }
  }
  
  console.log('\n🔍 Checking primary_collection metafield coverage...\n');
  
  const sampleQuery = `
    query getSampleProducts($after: String) {
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
  
  interface SampleResponse {
    products: {
      edges: Array<{
        node: {
          handle: string;
          title: string;
          productType: string;
          metafield: { value: string } | null;
        };
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  }
  
  let withMetafield = 0;
  let withoutMetafield = 0;
  const examplesWithout: string[] = [];
  let cursor: string | null = null;
  let totalChecked = 0;
  const targetCount = 1000;
  
  console.log(`Checking first ${targetCount} products...\n`);
  
  while (totalChecked < targetCount) {
    const data: SampleResponse = await client.request<SampleResponse>(sampleQuery, { after: cursor });
    
    data.products.edges.forEach(({ node }) => {
      if (totalChecked >= targetCount) return;
      
      totalChecked++;
      if (node.metafield?.value) {
        withMetafield++;
      } else {
        withoutMetafield++;
        if (examplesWithout.length < 20) {
          examplesWithout.push(`  - ${node.handle} (${node.productType || 'NO TYPE'})`);
        }
      }
    });
    
    if (totalChecked % 250 === 0) {
      console.log(`   Checked ${totalChecked} products...`);
    }
    
    if (!data.products.pageInfo.hasNextPage || totalChecked >= targetCount) {
      break;
    }
    
    cursor = data.products.pageInfo.endCursor;
  }
  
  console.log(`\n📊 Results (${totalChecked} products):`);
  console.log(`   ✅ With primary_collection: ${withMetafield} (${Math.round(withMetafield / totalChecked * 100)}%)`);
  console.log(`   ❌ Without primary_collection: ${withoutMetafield} (${Math.round(withoutMetafield / totalChecked * 100)}%)`);
  
  if (examplesWithout.length > 0) {
    console.log(`\n❌ Examples without metafield (showing ${Math.min(examplesWithout.length, 20)}):`);
    examplesWithout.forEach(ex => console.log(ex));
  }
  
  console.log('\n✅ Done!');
})();
