/**
 * Export Product Types Script
 * 
 * Exports all product types from your Shopify store with:
 * - Product type name
 * - Product count
 * - Sample products
 * - Current collections products are in
 * 
 * Usage: npm run export:product-types
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import * as fs from 'fs';
import * as path from 'path';

const GET_ALL_PRODUCTS = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          productType
          collections(first: 20) {
            edges {
              node {
                handle
                title
              }
            }
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

interface ProductNode {
  id: string;
  handle: string;
  title: string;
  productType: string;
  collections: {
    edges: Array<{
      node: {
        handle: string;
        title: string;
      };
    }>;
  };
}

interface ProductTypeData {
  productType: string;
  count: number;
  sampleProducts: Array<{
    handle: string;
    title: string;
  }>;
  collections: Set<string>;
  collectionHandles: string[];
}

async function exportProductTypes() {
  console.log('🔄 Exporting product types...\n');

  const productTypeMap = new Map<string, ProductTypeData>();
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalProducts = 0;

  // Fetch all products
  while (hasNextPage) {
    const data = await shopifyFetch<{
      products: {
        edges: Array<{ node: ProductNode }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }>({
      query: GET_ALL_PRODUCTS,
      variables: { first: 250, after: cursor },
    });

    // Process products
    for (const { node } of data.products.edges) {
      totalProducts++;
      const productType = node.productType || '(No Product Type)';

      if (!productTypeMap.has(productType)) {
        productTypeMap.set(productType, {
          productType,
          count: 0,
          sampleProducts: [],
          collections: new Set(),
          collectionHandles: [],
        });
      }

      const typeData = productTypeMap.get(productType)!;
      typeData.count++;

      // Add sample products (max 5)
      if (typeData.sampleProducts.length < 5) {
        typeData.sampleProducts.push({
          handle: node.handle,
          title: node.title,
        });
      }

      // Track collections
      node.collections.edges.forEach(({ node: collection }) => {
        typeData.collections.add(`${collection.handle} (${collection.title})`);
      });
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor || null;

    console.log(`  Processed ${totalProducts} products...`);
  }

  // Convert collections Set to array
  const productTypes = Array.from(productTypeMap.values()).map((type) => ({
    ...type,
    collectionHandles: Array.from(type.collections),
  }));

  // Sort by count (descending)
  productTypes.sort((a, b) => b.count - a.count);

  // Export as JSON
  const jsonOutput = {
    exportedAt: new Date().toISOString(),
    totalProducts,
    totalProductTypes: productTypes.length,
    productTypes: productTypes.map((type) => ({
      productType: type.productType,
      count: type.count,
      sampleProducts: type.sampleProducts,
      collections: type.collectionHandles,
    })),
  };

  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'product-types.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n✅ Exported to: ${jsonPath}`);

  // Export as CSV
  const csvRows = [
    ['Product Type', 'Count', 'Sample Products', 'Collections'].join(','),
    ...productTypes.map((type) => {
      const samples = type.sampleProducts.map((p) => p.handle).join('; ');
      const collections = type.collectionHandles.join('; ');
      return [
        `"${type.productType.replace(/"/g, '""')}"`,
        type.count,
        `"${samples}"`,
        `"${collections.replace(/"/g, '""')}"`,
      ].join(',');
    }),
  ];

  const csvPath = path.join(outputDir, 'product-types.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`✅ Exported to: ${csvPath}`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total Products: ${totalProducts}`);
  console.log(`   Total Product Types: ${productTypes.length}`);
  console.log(`   Products without type: ${productTypes.find((t) => t.productType === '(No Product Type)')?.count || 0}`);
  console.log(`\n📈 Top 10 Product Types:`);
  productTypes.slice(0, 10).forEach((type, index) => {
    console.log(`   ${index + 1}. ${type.productType} (${type.count} products)`);
  });

  return productTypes;
}

// Run if called directly
if (require.main === module) {
  exportProductTypes()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportProductTypes };


 * 
 * Exports all product types from your Shopify store with:
 * - Product type name
 * - Product count
 * - Sample products
 * - Current collections products are in
 * 
 * Usage: npm run export:product-types
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import * as fs from 'fs';
import * as path from 'path';

const GET_ALL_PRODUCTS = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          productType
          collections(first: 20) {
            edges {
              node {
                handle
                title
              }
            }
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

interface ProductNode {
  id: string;
  handle: string;
  title: string;
  productType: string;
  collections: {
    edges: Array<{
      node: {
        handle: string;
        title: string;
      };
    }>;
  };
}

interface ProductTypeData {
  productType: string;
  count: number;
  sampleProducts: Array<{
    handle: string;
    title: string;
  }>;
  collections: Set<string>;
  collectionHandles: string[];
}

async function exportProductTypes() {
  console.log('🔄 Exporting product types...\n');

  const productTypeMap = new Map<string, ProductTypeData>();
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalProducts = 0;

  // Fetch all products
  while (hasNextPage) {
    const data = await shopifyFetch<{
      products: {
        edges: Array<{ node: ProductNode }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }>({
      query: GET_ALL_PRODUCTS,
      variables: { first: 250, after: cursor },
    });

    // Process products
    for (const { node } of data.products.edges) {
      totalProducts++;
      const productType = node.productType || '(No Product Type)';

      if (!productTypeMap.has(productType)) {
        productTypeMap.set(productType, {
          productType,
          count: 0,
          sampleProducts: [],
          collections: new Set(),
          collectionHandles: [],
        });
      }

      const typeData = productTypeMap.get(productType)!;
      typeData.count++;

      // Add sample products (max 5)
      if (typeData.sampleProducts.length < 5) {
        typeData.sampleProducts.push({
          handle: node.handle,
          title: node.title,
        });
      }

      // Track collections
      node.collections.edges.forEach(({ node: collection }) => {
        typeData.collections.add(`${collection.handle} (${collection.title})`);
      });
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor || null;

    console.log(`  Processed ${totalProducts} products...`);
  }

  // Convert collections Set to array
  const productTypes = Array.from(productTypeMap.values()).map((type) => ({
    ...type,
    collectionHandles: Array.from(type.collections),
  }));

  // Sort by count (descending)
  productTypes.sort((a, b) => b.count - a.count);

  // Export as JSON
  const jsonOutput = {
    exportedAt: new Date().toISOString(),
    totalProducts,
    totalProductTypes: productTypes.length,
    productTypes: productTypes.map((type) => ({
      productType: type.productType,
      count: type.count,
      sampleProducts: type.sampleProducts,
      collections: type.collectionHandles,
    })),
  };

  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'product-types.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n✅ Exported to: ${jsonPath}`);

  // Export as CSV
  const csvRows = [
    ['Product Type', 'Count', 'Sample Products', 'Collections'].join(','),
    ...productTypes.map((type) => {
      const samples = type.sampleProducts.map((p) => p.handle).join('; ');
      const collections = type.collectionHandles.join('; ');
      return [
        `"${type.productType.replace(/"/g, '""')}"`,
        type.count,
        `"${samples}"`,
        `"${collections.replace(/"/g, '""')}"`,
      ].join(',');
    }),
  ];

  const csvPath = path.join(outputDir, 'product-types.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`✅ Exported to: ${csvPath}`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total Products: ${totalProducts}`);
  console.log(`   Total Product Types: ${productTypes.length}`);
  console.log(`   Products without type: ${productTypes.find((t) => t.productType === '(No Product Type)')?.count || 0}`);
  console.log(`\n📈 Top 10 Product Types:`);
  productTypes.slice(0, 10).forEach((type, index) => {
    console.log(`   ${index + 1}. ${type.productType} (${type.count} products)`);
  });

  return productTypes;
}

// Run if called directly
if (require.main === module) {
  exportProductTypes()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportProductTypes };

