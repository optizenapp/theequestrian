/**
 * Export Collections Script
 * 
 * Exports all collections from your Shopify store with:
 * - Collection handle
 * - Collection title
 * - Product count
 * - Parent collection (if exists)
 * - Product types in collection
 * 
 * Usage: npm run export:collections
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import * as fs from 'fs';
import * as path from 'path';

const GET_ALL_COLLECTIONS = `
  query GetAllCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          description
          parentCollectionMetafield: metafield(namespace: "custom", key: "parent_collection") {
            value
          }
          products(first: 250) {
            edges {
              node {
                productType
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

interface CollectionNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  parentCollectionMetafield: {
    value: string;
  } | null;
  products: {
    edges: Array<{
      node: {
        productType: string;
      };
    }>;
  };
}

interface CollectionData {
  handle: string;
  title: string;
  description: string;
  productCount: number;
  parentCollection: string | null;
  productTypes: Set<string>;
  productTypeCounts: Map<string, number>;
}

async function exportCollections() {
  console.log('🔄 Exporting collections...\n');

  const collections: CollectionData[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalCollections = 0;

  // Fetch all collections
  while (hasNextPage) {
    const data = await shopifyFetch<{
      collections: {
        edges: Array<{ node: CollectionNode }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }>({
      query: GET_ALL_COLLECTIONS,
      variables: { first: 250, after: cursor },
    });

    // Process collections
    for (const { node } of data.collections.edges) {
      totalCollections++;

      const productTypes = new Set<string>();
      const productTypeCounts = new Map<string, number>();

      // Count product types from the products we fetched
      node.products.edges.forEach(({ node: product }) => {
        const productType = product.productType || '(No Product Type)';
        productTypes.add(productType);
        productTypeCounts.set(
          productType,
          (productTypeCounts.get(productType) || 0) + 1
        );
      });

      // Product count is the number of products we fetched (up to 250)
      const productCount = node.products.edges.length;

      collections.push({
        handle: node.handle,
        title: node.title,
        description: node.description || '',
        productCount,
        parentCollection: node.parentCollectionMetafield?.value || null,
        productTypes,
        productTypeCounts,
      });

      console.log(`  Processed: ${node.handle} (${productCount} products)`);
    }

    hasNextPage = data.collections.pageInfo.hasNextPage;
    cursor = data.collections.pageInfo.endCursor || null;
  }

  // Sort by product count (descending)
  collections.sort((a, b) => b.productCount - a.productCount);

  // Export as JSON
  const jsonOutput = {
    exportedAt: new Date().toISOString(),
    totalCollections: collections.length,
    collections: collections.map((col) => ({
      handle: col.handle,
      title: col.title,
      description: col.description,
      productCount: col.productCount,
      parentCollection: col.parentCollection,
      productTypes: Array.from(col.productTypes).map((type) => ({
        productType: type,
        count: col.productTypeCounts.get(type) || 0,
      })),
    })),
  };

  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'collections.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n✅ Exported to: ${jsonPath}`);

  // Export as CSV
  const csvRows = [
    [
      'Handle',
      'Title',
      'Product Count',
      'Parent Collection',
      'Product Types',
      'Product Type Counts',
    ].join(','),
    ...collections.map((col) => {
      const productTypes = Array.from(col.productTypes).join('; ');
      const typeCounts = Array.from(col.productTypeCounts.entries())
        .map(([type, count]) => `${type}: ${count}`)
        .join('; ');
      return [
        col.handle,
        `"${col.title.replace(/"/g, '""')}"`,
        col.productCount,
        col.parentCollection || '',
        `"${productTypes.replace(/"/g, '""')}"`,
        `"${typeCounts.replace(/"/g, '""')}"`,
      ].join(',');
    }),
  ];

  const csvPath = path.join(outputDir, 'collections.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`✅ Exported to: ${csvPath}`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total Collections: ${collections.length}`);
  console.log(`   Collections with products: ${collections.filter((c) => c.productCount > 0).length}`);
  console.log(`   Collections without products: ${collections.filter((c) => c.productCount === 0).length}`);
  console.log(`\n📈 Top 10 Collections:`);
  collections.slice(0, 10).forEach((col, index) => {
    console.log(`   ${index + 1}. ${col.handle} (${col.productCount} products)`);
  });

  return collections;
}

// Run if called directly
if (require.main === module) {
  exportCollections()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportCollections };


 * 
 * Exports all collections from your Shopify store with:
 * - Collection handle
 * - Collection title
 * - Product count
 * - Parent collection (if exists)
 * - Product types in collection
 * 
 * Usage: npm run export:collections
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import * as fs from 'fs';
import * as path from 'path';

const GET_ALL_COLLECTIONS = `
  query GetAllCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          description
          parentCollectionMetafield: metafield(namespace: "custom", key: "parent_collection") {
            value
          }
          products(first: 250) {
            edges {
              node {
                productType
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

interface CollectionNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  parentCollectionMetafield: {
    value: string;
  } | null;
  products: {
    edges: Array<{
      node: {
        productType: string;
      };
    }>;
  };
}

interface CollectionData {
  handle: string;
  title: string;
  description: string;
  productCount: number;
  parentCollection: string | null;
  productTypes: Set<string>;
  productTypeCounts: Map<string, number>;
}

async function exportCollections() {
  console.log('🔄 Exporting collections...\n');

  const collections: CollectionData[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalCollections = 0;

  // Fetch all collections
  while (hasNextPage) {
    const data = await shopifyFetch<{
      collections: {
        edges: Array<{ node: CollectionNode }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }>({
      query: GET_ALL_COLLECTIONS,
      variables: { first: 250, after: cursor },
    });

    // Process collections
    for (const { node } of data.collections.edges) {
      totalCollections++;

      const productTypes = new Set<string>();
      const productTypeCounts = new Map<string, number>();

      // Count product types from the products we fetched
      node.products.edges.forEach(({ node: product }) => {
        const productType = product.productType || '(No Product Type)';
        productTypes.add(productType);
        productTypeCounts.set(
          productType,
          (productTypeCounts.get(productType) || 0) + 1
        );
      });

      // Product count is the number of products we fetched (up to 250)
      const productCount = node.products.edges.length;

      collections.push({
        handle: node.handle,
        title: node.title,
        description: node.description || '',
        productCount,
        parentCollection: node.parentCollectionMetafield?.value || null,
        productTypes,
        productTypeCounts,
      });

      console.log(`  Processed: ${node.handle} (${productCount} products)`);
    }

    hasNextPage = data.collections.pageInfo.hasNextPage;
    cursor = data.collections.pageInfo.endCursor || null;
  }

  // Sort by product count (descending)
  collections.sort((a, b) => b.productCount - a.productCount);

  // Export as JSON
  const jsonOutput = {
    exportedAt: new Date().toISOString(),
    totalCollections: collections.length,
    collections: collections.map((col) => ({
      handle: col.handle,
      title: col.title,
      description: col.description,
      productCount: col.productCount,
      parentCollection: col.parentCollection,
      productTypes: Array.from(col.productTypes).map((type) => ({
        productType: type,
        count: col.productTypeCounts.get(type) || 0,
      })),
    })),
  };

  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'collections.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n✅ Exported to: ${jsonPath}`);

  // Export as CSV
  const csvRows = [
    [
      'Handle',
      'Title',
      'Product Count',
      'Parent Collection',
      'Product Types',
      'Product Type Counts',
    ].join(','),
    ...collections.map((col) => {
      const productTypes = Array.from(col.productTypes).join('; ');
      const typeCounts = Array.from(col.productTypeCounts.entries())
        .map(([type, count]) => `${type}: ${count}`)
        .join('; ');
      return [
        col.handle,
        `"${col.title.replace(/"/g, '""')}"`,
        col.productCount,
        col.parentCollection || '',
        `"${productTypes.replace(/"/g, '""')}"`,
        `"${typeCounts.replace(/"/g, '""')}"`,
      ].join(',');
    }),
  ];

  const csvPath = path.join(outputDir, 'collections.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`✅ Exported to: ${csvPath}`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total Collections: ${collections.length}`);
  console.log(`   Collections with products: ${collections.filter((c) => c.productCount > 0).length}`);
  console.log(`   Collections without products: ${collections.filter((c) => c.productCount === 0).length}`);
  console.log(`\n📈 Top 10 Collections:`);
  collections.slice(0, 10).forEach((col, index) => {
    console.log(`   ${index + 1}. ${col.handle} (${col.productCount} products)`);
  });

  return collections;
}

// Run if called directly
if (require.main === module) {
  exportCollections()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportCollections };

