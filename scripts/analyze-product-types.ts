/**
 * Script to analyze all product types in the Shopify store
 * This helps identify:
 * 1. All unique product types
 * 2. Products without product types
 * 3. Distribution of products across types
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

interface ProductNode {
  id: string;
  handle: string;
  title: string;
  productType: string;
  tags: string[];
  collections: {
    edges: Array<{
      node: {
        handle: string;
        title: string;
      };
    }>;
  };
}

interface ProductsResponse {
  products: {
    edges: Array<{
      node: ProductNode;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
}

const PRODUCTS_QUERY = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          productType
          tags
          collections(first: 10) {
            edges {
              node {
                handle
                title
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

async function analyzeProductTypes() {
  console.log('🔍 Analyzing Product Types in Your Store...\n');

  const productTypeMap = new Map<string, ProductNode[]>();
  const productsWithoutType: ProductNode[] = [];
  let totalProducts = 0;
  let hasNextPage = true;
  let cursor: string | null = null;

  // Fetch all products
  while (hasNextPage) {
    const variables = {
      first: 250,
      ...(cursor && { after: cursor }),
    };

    const response = await shopifyFetch<ProductsResponse>({
      query: PRODUCTS_QUERY,
      variables,
    });
    const edges = response.products.edges;

    for (const edge of edges) {
      const product = edge.node;
      totalProducts++;

      if (!product.productType || product.productType.trim() === '') {
        productsWithoutType.push(product);
      } else {
        const normalizedType = product.productType.trim();
        if (!productTypeMap.has(normalizedType)) {
          productTypeMap.set(normalizedType, []);
        }
        productTypeMap.get(normalizedType)!.push(product);
      }

      cursor = edge.cursor;
    }

    hasNextPage = response.products.pageInfo.hasNextPage;
    console.log(`  Processed ${totalProducts} products...`);
  }

  // Sort product types by count
  const sortedTypes = Array.from(productTypeMap.entries())
    .sort((a, b) => b[1].length - a[1].length);

  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCT TYPE ANALYSIS');
  console.log('='.repeat(80));
  console.log(`\nTotal Products: ${totalProducts}`);
  console.log(`Unique Product Types: ${sortedTypes.length}`);
  console.log(`Products Without Type: ${productsWithoutType.length}\n`);

  // Show all product types with counts
  console.log('📦 Product Types (sorted by count):');
  console.log('-'.repeat(80));
  sortedTypes.forEach(([type, products], index) => {
    const percentage = ((products.length / totalProducts) * 100).toFixed(1);
    console.log(`${(index + 1).toString().padStart(3)}. ${type.padEnd(40)} ${products.length.toString().padStart(5)} products (${percentage}%)`);
  });

  // Show products without types
  if (productsWithoutType.length > 0) {
    console.log('\n⚠️  Products WITHOUT Product Type:');
    console.log('-'.repeat(80));
    productsWithoutType.slice(0, 20).forEach((product, index) => {
      const collectionNames = product.collections.edges.map(e => e.node.title).join(', ');
      const tags = product.tags.slice(0, 5).join(', ');
      console.log(`${(index + 1).toString().padStart(3)}. ${product.title}`);
      console.log(`     Handle: ${product.handle}`);
      if (collectionNames) console.log(`     Collections: ${collectionNames}`);
      if (tags) console.log(`     Tags: ${tags}`);
      console.log('');
    });
    if (productsWithoutType.length > 20) {
      console.log(`     ... and ${productsWithoutType.length - 20} more\n`);
    }
  }

  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATIONS FOR URL STRUCTURE');
  console.log('='.repeat(80));
  console.log(`
1. CORE COLLECTIONS (Top-Level URLs)
   These should be your main navigation categories.
   Example: /womens-clothing, /mens-clothing, /accessories, etc.

2. SUBCOLLECTIONS (Second-Level URLs)
   Use product types as subcategories within collections.
   Example: /womens-clothing/tights, /womens-clothing/breeches

3. HANDLING PRODUCTS WITHOUT TYPES:
   ${productsWithoutType.length > 0 ? `
   ⚠️  You have ${productsWithoutType.length} products without product types.
   
   Options:
   a) Bulk assign product types in Shopify Admin
   b) Use tags as fallback for subcategory
   c) Place in collection root (e.g., /womens-clothing/other)
   d) Set a default type like "Uncategorized"
   ` : `
   ✅ All products have product types! This makes automation easier.
   `}

4. AUTOMATION STRATEGY:
   - Use 'productType' as the primary subcategory identifier
   - Fallback to specific tags if productType is empty
   - Set 'primary_collection' metafield format: "collection-handle/product-type"
   - Example: "womens-clothing/tights"

5. NEXT STEPS:
   a) Define your core collections (5-10 main categories)
   b) Map product types to these collections
   c) Update automation logic to use productType
   d) Handle edge cases (products without types)
`);

  // Export detailed report
  const report = {
    summary: {
      totalProducts,
      uniqueProductTypes: sortedTypes.length,
      productsWithoutType: productsWithoutType.length,
    },
    productTypes: sortedTypes.map(([type, products]) => ({
      type,
      count: products.length,
      percentage: ((products.length / totalProducts) * 100).toFixed(1),
      sampleProducts: products.slice(0, 3).map(p => ({
        handle: p.handle,
        title: p.title,
        collections: p.collections.edges.map(e => e.node.handle),
      })),
    })),
    productsWithoutType: productsWithoutType.map(p => ({
      handle: p.handle,
      title: p.title,
      tags: p.tags,
      collections: p.collections.edges.map(e => e.node.handle),
    })),
  };

  // Save to file
  const fs = require('fs');
  const reportPath = './product-types-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);
}

// Run the analysis
analyzeProductTypes().catch(console.error);


 * This helps identify:
 * 1. All unique product types
 * 2. Products without product types
 * 3. Distribution of products across types
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

interface ProductNode {
  id: string;
  handle: string;
  title: string;
  productType: string;
  tags: string[];
  collections: {
    edges: Array<{
      node: {
        handle: string;
        title: string;
      };
    }>;
  };
}

interface ProductsResponse {
  products: {
    edges: Array<{
      node: ProductNode;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
}

const PRODUCTS_QUERY = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          productType
          tags
          collections(first: 10) {
            edges {
              node {
                handle
                title
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

async function analyzeProductTypes() {
  console.log('🔍 Analyzing Product Types in Your Store...\n');

  const productTypeMap = new Map<string, ProductNode[]>();
  const productsWithoutType: ProductNode[] = [];
  let totalProducts = 0;
  let hasNextPage = true;
  let cursor: string | null = null;

  // Fetch all products
  while (hasNextPage) {
    const variables = {
      first: 250,
      ...(cursor && { after: cursor }),
    };

    const response = await shopifyFetch<ProductsResponse>({
      query: PRODUCTS_QUERY,
      variables,
    });
    const edges = response.products.edges;

    for (const edge of edges) {
      const product = edge.node;
      totalProducts++;

      if (!product.productType || product.productType.trim() === '') {
        productsWithoutType.push(product);
      } else {
        const normalizedType = product.productType.trim();
        if (!productTypeMap.has(normalizedType)) {
          productTypeMap.set(normalizedType, []);
        }
        productTypeMap.get(normalizedType)!.push(product);
      }

      cursor = edge.cursor;
    }

    hasNextPage = response.products.pageInfo.hasNextPage;
    console.log(`  Processed ${totalProducts} products...`);
  }

  // Sort product types by count
  const sortedTypes = Array.from(productTypeMap.entries())
    .sort((a, b) => b[1].length - a[1].length);

  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCT TYPE ANALYSIS');
  console.log('='.repeat(80));
  console.log(`\nTotal Products: ${totalProducts}`);
  console.log(`Unique Product Types: ${sortedTypes.length}`);
  console.log(`Products Without Type: ${productsWithoutType.length}\n`);

  // Show all product types with counts
  console.log('📦 Product Types (sorted by count):');
  console.log('-'.repeat(80));
  sortedTypes.forEach(([type, products], index) => {
    const percentage = ((products.length / totalProducts) * 100).toFixed(1);
    console.log(`${(index + 1).toString().padStart(3)}. ${type.padEnd(40)} ${products.length.toString().padStart(5)} products (${percentage}%)`);
  });

  // Show products without types
  if (productsWithoutType.length > 0) {
    console.log('\n⚠️  Products WITHOUT Product Type:');
    console.log('-'.repeat(80));
    productsWithoutType.slice(0, 20).forEach((product, index) => {
      const collectionNames = product.collections.edges.map(e => e.node.title).join(', ');
      const tags = product.tags.slice(0, 5).join(', ');
      console.log(`${(index + 1).toString().padStart(3)}. ${product.title}`);
      console.log(`     Handle: ${product.handle}`);
      if (collectionNames) console.log(`     Collections: ${collectionNames}`);
      if (tags) console.log(`     Tags: ${tags}`);
      console.log('');
    });
    if (productsWithoutType.length > 20) {
      console.log(`     ... and ${productsWithoutType.length - 20} more\n`);
    }
  }

  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATIONS FOR URL STRUCTURE');
  console.log('='.repeat(80));
  console.log(`
1. CORE COLLECTIONS (Top-Level URLs)
   These should be your main navigation categories.
   Example: /womens-clothing, /mens-clothing, /accessories, etc.

2. SUBCOLLECTIONS (Second-Level URLs)
   Use product types as subcategories within collections.
   Example: /womens-clothing/tights, /womens-clothing/breeches

3. HANDLING PRODUCTS WITHOUT TYPES:
   ${productsWithoutType.length > 0 ? `
   ⚠️  You have ${productsWithoutType.length} products without product types.
   
   Options:
   a) Bulk assign product types in Shopify Admin
   b) Use tags as fallback for subcategory
   c) Place in collection root (e.g., /womens-clothing/other)
   d) Set a default type like "Uncategorized"
   ` : `
   ✅ All products have product types! This makes automation easier.
   `}

4. AUTOMATION STRATEGY:
   - Use 'productType' as the primary subcategory identifier
   - Fallback to specific tags if productType is empty
   - Set 'primary_collection' metafield format: "collection-handle/product-type"
   - Example: "womens-clothing/tights"

5. NEXT STEPS:
   a) Define your core collections (5-10 main categories)
   b) Map product types to these collections
   c) Update automation logic to use productType
   d) Handle edge cases (products without types)
`);

  // Export detailed report
  const report = {
    summary: {
      totalProducts,
      uniqueProductTypes: sortedTypes.length,
      productsWithoutType: productsWithoutType.length,
    },
    productTypes: sortedTypes.map(([type, products]) => ({
      type,
      count: products.length,
      percentage: ((products.length / totalProducts) * 100).toFixed(1),
      sampleProducts: products.slice(0, 3).map(p => ({
        handle: p.handle,
        title: p.title,
        collections: p.collections.edges.map(e => e.node.handle),
      })),
    })),
    productsWithoutType: productsWithoutType.map(p => ({
      handle: p.handle,
      title: p.title,
      tags: p.tags,
      collections: p.collections.edges.map(e => e.node.handle),
    })),
  };

  // Save to file
  const fs = require('fs');
  const reportPath = './product-types-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}\n`);
}

// Run the analysis
analyzeProductTypes().catch(console.error);

