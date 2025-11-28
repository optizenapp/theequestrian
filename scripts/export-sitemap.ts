/**
 * Export Current Sitemap Script
 * 
 * Exports current URL structure from your store:
 * - Product URLs
 * - Collection URLs
 * - Current primary_collection metafield values
 * - Current product types
 * 
 * Usage: npm run export:sitemap
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

const GET_ALL_COLLECTIONS = `
  query GetAllCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          handle
          title
        }
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
  metafield: {
    value: string;
  } | null;
}

interface SitemapEntry {
  productHandle: string;
  productTitle: string;
  productType: string;
  currentPrimaryCollection: string | null;
  currentUrl: string;
  collections: Array<{
    handle: string;
    title: string;
  }>;
  newPrimaryCollection?: string;
  newUrl?: string;
  status?: 'mapped' | 'needs-review' | 'excluded';
}

async function exportSitemap() {
  console.log('🔄 Exporting current sitemap...\n');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';
  const products: SitemapEntry[] = [];
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

      const currentPrimaryCollection = node.metafield?.value || null;
      const currentUrl = currentPrimaryCollection
        ? `${siteUrl}/${currentPrimaryCollection}/${node.handle}`
        : `${siteUrl}/products/${node.handle}`;

      products.push({
        productHandle: node.handle,
        productTitle: node.title,
        productType: node.productType || '(No Product Type)',
        currentPrimaryCollection,
        currentUrl,
        collections: node.collections.edges.map(({ node: col }) => ({
          handle: col.handle,
          title: col.title,
        })),
      });

      if (totalProducts % 100 === 0) {
        console.log(`  Processed ${totalProducts} products...`);
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor || null;
  }

  // Fetch collections for reference
  const collectionsData = await shopifyFetch<{
    collections: {
      edges: Array<{
        node: {
          handle: string;
          title: string;
        };
      }>;
    };
  }>({
    query: GET_ALL_COLLECTIONS,
    variables: { first: 250 },
  });

  const collections = collectionsData.collections.edges.map(({ node }) => ({
    handle: node.handle,
    title: node.title,
  }));

  // Export as JSON
  const jsonOutput = {
    exportedAt: new Date().toISOString(),
    siteUrl,
    totalProducts: products.length,
    totalCollections: collections.length,
    products,
    collections,
  };

  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'sitemap-current.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n✅ Exported to: ${jsonPath}`);

  // Export as CSV
  const csvRows = [
    [
      'Product Handle',
      'Product Title',
      'Product Type',
      'Current Primary Collection',
      'Current URL',
      'Collections',
    ].join(','),
    ...products.map((product) => {
      const collections = product.collections.map((c) => c.handle).join('; ');
      return [
        product.productHandle,
        `"${product.productTitle.replace(/"/g, '""')}"`,
        `"${product.productType.replace(/"/g, '""')}"`,
        product.currentPrimaryCollection || '',
        product.currentUrl,
        `"${collections.replace(/"/g, '""')}"`,
      ].join(',');
    }),
  ];

  const csvPath = path.join(outputDir, 'sitemap-current.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`✅ Exported to: ${csvPath}`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total Products: ${products.length}`);
  console.log(`   Products with primary_collection: ${products.filter((p) => p.currentPrimaryCollection).length}`);
  console.log(`   Products without primary_collection: ${products.filter((p) => !p.currentPrimaryCollection).length}`);
  console.log(`   Total Collections: ${collections.length}`);

  return { products, collections };
}

// Run if called directly
if (require.main === module) {
  exportSitemap()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportSitemap };


 * 
 * Exports current URL structure from your store:
 * - Product URLs
 * - Collection URLs
 * - Current primary_collection metafield values
 * - Current product types
 * 
 * Usage: npm run export:sitemap
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

const GET_ALL_COLLECTIONS = `
  query GetAllCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          handle
          title
        }
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
  metafield: {
    value: string;
  } | null;
}

interface SitemapEntry {
  productHandle: string;
  productTitle: string;
  productType: string;
  currentPrimaryCollection: string | null;
  currentUrl: string;
  collections: Array<{
    handle: string;
    title: string;
  }>;
  newPrimaryCollection?: string;
  newUrl?: string;
  status?: 'mapped' | 'needs-review' | 'excluded';
}

async function exportSitemap() {
  console.log('🔄 Exporting current sitemap...\n');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';
  const products: SitemapEntry[] = [];
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

      const currentPrimaryCollection = node.metafield?.value || null;
      const currentUrl = currentPrimaryCollection
        ? `${siteUrl}/${currentPrimaryCollection}/${node.handle}`
        : `${siteUrl}/products/${node.handle}`;

      products.push({
        productHandle: node.handle,
        productTitle: node.title,
        productType: node.productType || '(No Product Type)',
        currentPrimaryCollection,
        currentUrl,
        collections: node.collections.edges.map(({ node: col }) => ({
          handle: col.handle,
          title: col.title,
        })),
      });

      if (totalProducts % 100 === 0) {
        console.log(`  Processed ${totalProducts} products...`);
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor || null;
  }

  // Fetch collections for reference
  const collectionsData = await shopifyFetch<{
    collections: {
      edges: Array<{
        node: {
          handle: string;
          title: string;
        };
      }>;
    };
  }>({
    query: GET_ALL_COLLECTIONS,
    variables: { first: 250 },
  });

  const collections = collectionsData.collections.edges.map(({ node }) => ({
    handle: node.handle,
    title: node.title,
  }));

  // Export as JSON
  const jsonOutput = {
    exportedAt: new Date().toISOString(),
    siteUrl,
    totalProducts: products.length,
    totalCollections: collections.length,
    products,
    collections,
  };

  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'sitemap-current.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\n✅ Exported to: ${jsonPath}`);

  // Export as CSV
  const csvRows = [
    [
      'Product Handle',
      'Product Title',
      'Product Type',
      'Current Primary Collection',
      'Current URL',
      'Collections',
    ].join(','),
    ...products.map((product) => {
      const collections = product.collections.map((c) => c.handle).join('; ');
      return [
        product.productHandle,
        `"${product.productTitle.replace(/"/g, '""')}"`,
        `"${product.productType.replace(/"/g, '""')}"`,
        product.currentPrimaryCollection || '',
        product.currentUrl,
        `"${collections.replace(/"/g, '""')}"`,
      ].join(',');
    }),
  ];

  const csvPath = path.join(outputDir, 'sitemap-current.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  console.log(`✅ Exported to: ${csvPath}`);

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Total Products: ${products.length}`);
  console.log(`   Products with primary_collection: ${products.filter((p) => p.currentPrimaryCollection).length}`);
  console.log(`   Products without primary_collection: ${products.filter((p) => !p.currentPrimaryCollection).length}`);
  console.log(`   Total Collections: ${collections.length}`);

  return { products, collections };
}

// Run if called directly
if (require.main === module) {
  exportSitemap()
    .then(() => {
      console.log('\n✅ Export complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export failed:', error);
      process.exit(1);
    });
}

export { exportSitemap };

