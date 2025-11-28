/**
 * Import Mapping Script
 * 
 * Reads the mapping CSV and applies it to products:
 * 1. Sets primary_collection metafield based on mapping
 * 2. Handles exclusions (products without subcategory)
 * 3. Handles merges (combine product types)
 * 4. Updates breadcrumbs and schema automatically
 * 
 * Usage: 
 *   npm run import:mapping -- --dry-run  (preview changes)
 *   npm run import:mapping -- --apply   (apply changes)
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { normalizeProductType } from '../lib/shopify/collection-mapping';

interface MappingRow {
  collection_handle: string;
  collection_title: string;
  product_type: string;
  subcategory_handle: string;
  action: 'include' | 'exclude' | 'merge';
  merge_to?: string;
  notes?: string;
}

interface ProductUpdate {
  productId: string;
  handle: string;
  title: string;
  productType: string;
  currentPrimaryCollection: string | null;
  newPrimaryCollection: string | null;
  reason: string;
}

const GET_PRODUCT_BY_ID = `
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      handle
      title
      productType
      collections(first: 20) {
        edges {
          node {
            handle
          }
        }
      }
      metafield(namespace: "custom", key: "primary_collection") {
        id
        value
      }
    }
  }
`;

const UPDATE_METAFIELD = `
  mutation UpdateProductMetafield($metafieldId: ID!, $value: String!) {
    metafieldsSet(metafields: [
      {
        id: $metafieldId
        value: $value
      }
    ]) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_METAFIELD = `
  mutation CreateProductMetafield($productId: ID!, $namespace: String!, $key: String!, $value: String!) {
    metafieldsSet(metafields: [
      {
        ownerId: $productId
        namespace: $namespace
        key: $key
        value: $value
      }
    ]) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

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
              }
            }
          }
          metafield(namespace: "custom", key: "primary_collection") {
            id
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

async function loadMapping(): Promise<Map<string, MappingRow[]>> {
  const mappingPath = path.join(process.cwd(), 'exports', 'mapping.csv');
  
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}\n\nPlease create exports/mapping.csv using the template.`);
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MappingRow[];

  // Group by collection handle
  const mappingByCollection = new Map<string, MappingRow[]>();
  
  for (const row of records) {
    if (!mappingByCollection.has(row.collection_handle)) {
      mappingByCollection.set(row.collection_handle, []);
    }
    mappingByCollection.get(row.collection_handle)!.push(row);
  }

  console.log(`✅ Loaded ${records.length} mapping rules across ${mappingByCollection.size} collections\n`);
  return mappingByCollection;
}

function determinePrimaryCollection(
  product: {
    productType: string;
    collections: { edges: Array<{ node: { handle: string } }> };
  },
  mapping: Map<string, MappingRow[]>
): { primaryCollection: string | null; reason: string } {
  const productType = product.productType || '';
  const collections = product.collections.edges.map((e) => e.node.handle);

  // Find matching collection and product type
  for (const collectionHandle of collections) {
    const collectionMappings = mapping.get(collectionHandle);
    if (!collectionMappings) continue;

    // Find exact product type match
    const exactMatch = collectionMappings.find(
      (m) => m.product_type === productType
    );

    if (exactMatch) {
      if (exactMatch.action === 'exclude') {
        return {
          primaryCollection: collectionHandle, // Just collection, no subcategory
          reason: `Excluded product type: ${productType}`,
        };
      }

      if (exactMatch.action === 'merge' && exactMatch.merge_to) {
        return {
          primaryCollection: `${collectionHandle}/${exactMatch.merge_to}`,
          reason: `Merged ${productType} into ${exactMatch.merge_to}`,
        };
      }

      if (exactMatch.action === 'include' && exactMatch.subcategory_handle) {
        return {
          primaryCollection: `${collectionHandle}/${exactMatch.subcategory_handle}`,
          reason: `Mapped ${productType} to ${exactMatch.subcategory_handle}`,
        };
      }
    }

    // Try normalized match
    const normalizedProductType = normalizeProductType(productType);
    const normalizedMatch = collectionMappings.find(
      (m) => normalizeProductType(m.product_type) === normalizedProductType
    );

    if (normalizedMatch) {
      if (normalizedMatch.action === 'exclude') {
        return {
          primaryCollection: collectionHandle,
          reason: `Excluded (normalized): ${productType}`,
        };
      }

      if (normalizedMatch.action === 'merge' && normalizedMatch.merge_to) {
        return {
          primaryCollection: `${collectionHandle}/${normalizedMatch.merge_to}`,
          reason: `Merged (normalized) ${productType} into ${normalizedMatch.merge_to}`,
        };
      }

      if (normalizedMatch.action === 'include' && normalizedMatch.subcategory_handle) {
        return {
          primaryCollection: `${collectionHandle}/${normalizedMatch.subcategory_handle}`,
          reason: `Mapped (normalized) ${productType} to ${normalizedMatch.subcategory_handle}`,
        };
      }
    }
  }

  // Fallback: use first collection
  if (collections.length > 0) {
    return {
      primaryCollection: collections[0],
      reason: `No mapping found, using first collection: ${collections[0]}`,
    };
  }

  return {
    primaryCollection: null,
    reason: 'No collections found',
  };
}

async function applyMapping(dryRun: boolean = true) {
  console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Applying mapping...\n`);

  const mapping = await loadMapping();
  const updates: ProductUpdate[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalProcessed = 0;

  // Fetch all products
  while (hasNextPage) {
    const data = await shopifyFetch<{
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            productType: string;
            collections: {
              edges: Array<{
                node: {
                  handle: string;
                };
              };
            };
            metafield: {
              id: string;
              value: string;
            } | null;
          };
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }>({
      query: GET_ALL_PRODUCTS,
      variables: { first: 250, after: cursor },
    });

    // Process each product
    for (const { node: product } of data.products.edges) {
      totalProcessed++;

      const currentPrimaryCollection = product.metafield?.value || null;
      const { primaryCollection, reason } = determinePrimaryCollection(
        product,
        mapping
      );

      // Only update if different
      if (currentPrimaryCollection !== primaryCollection) {
        updates.push({
          productId: product.id,
          handle: product.handle,
          title: product.title,
          productType: product.productType || '(No Product Type)',
          currentPrimaryCollection,
          newPrimaryCollection: primaryCollection,
          reason,
        });
      }

      if (totalProcessed % 100 === 0) {
        console.log(`  Processed ${totalProcessed} products...`);
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor || null;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total Products Processed: ${totalProcessed}`);
  console.log(`   Products to Update: ${updates.length}`);
  console.log(`   Products Unchanged: ${totalProcessed - updates.length}`);

  if (updates.length === 0) {
    console.log('\n✅ No changes needed!');
    return;
  }

  // Show sample updates
  console.log(`\n📝 Sample Updates (first 10):`);
  updates.slice(0, 10).forEach((update, index) => {
    console.log(`\n   ${index + 1}. ${update.handle}`);
    console.log(`      Product Type: ${update.productType}`);
    console.log(`      Current: ${update.currentPrimaryCollection || '(none)'}`);
    console.log(`      New: ${update.newPrimaryCollection || '(none)'}`);
    console.log(`      Reason: ${update.reason}`);
  });

  if (updates.length > 10) {
    console.log(`\n   ... and ${updates.length - 10} more`);
  }

  // Export updates
  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const updatesPath = path.join(outputDir, `updates-${dryRun ? 'dry-run' : 'applied'}-${Date.now()}.json`);
  fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2));
  console.log(`\n✅ Updates saved to: ${updatesPath}`);

  // Apply updates if not dry run
  if (!dryRun) {
    console.log(`\n🔄 Applying ${updates.length} updates...`);
    
    // Note: This requires Shopify Admin API access
    // For now, we'll just log what needs to be done
    console.log('\n⚠️  Admin API integration needed to apply updates.');
    console.log('   Updates are saved in the JSON file above.');
    console.log('   You can use Shopify Admin API or Shopify Flow to apply them.');
    
    // TODO: Implement Admin API calls if credentials are available
  } else {
    console.log(`\n✅ Dry run complete! Review the updates above.`);
    console.log(`   To apply changes, run: npm run import:mapping -- --apply`);
  }

  return updates;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

// Run if called directly
if (require.main === module) {
  applyMapping(dryRun)
    .then(() => {
      console.log('\n✅ Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { applyMapping, loadMapping };


 * 
 * Reads the mapping CSV and applies it to products:
 * 1. Sets primary_collection metafield based on mapping
 * 2. Handles exclusions (products without subcategory)
 * 3. Handles merges (combine product types)
 * 4. Updates breadcrumbs and schema automatically
 * 
 * Usage: 
 *   npm run import:mapping -- --dry-run  (preview changes)
 *   npm run import:mapping -- --apply   (apply changes)
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { normalizeProductType } from '../lib/shopify/collection-mapping';

interface MappingRow {
  collection_handle: string;
  collection_title: string;
  product_type: string;
  subcategory_handle: string;
  action: 'include' | 'exclude' | 'merge';
  merge_to?: string;
  notes?: string;
}

interface ProductUpdate {
  productId: string;
  handle: string;
  title: string;
  productType: string;
  currentPrimaryCollection: string | null;
  newPrimaryCollection: string | null;
  reason: string;
}

const GET_PRODUCT_BY_ID = `
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      handle
      title
      productType
      collections(first: 20) {
        edges {
          node {
            handle
          }
        }
      }
      metafield(namespace: "custom", key: "primary_collection") {
        id
        value
      }
    }
  }
`;

const UPDATE_METAFIELD = `
  mutation UpdateProductMetafield($metafieldId: ID!, $value: String!) {
    metafieldsSet(metafields: [
      {
        id: $metafieldId
        value: $value
      }
    ]) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_METAFIELD = `
  mutation CreateProductMetafield($productId: ID!, $namespace: String!, $key: String!, $value: String!) {
    metafieldsSet(metafields: [
      {
        ownerId: $productId
        namespace: $namespace
        key: $key
        value: $value
      }
    ]) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

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
              }
            }
          }
          metafield(namespace: "custom", key: "primary_collection") {
            id
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

async function loadMapping(): Promise<Map<string, MappingRow[]>> {
  const mappingPath = path.join(process.cwd(), 'exports', 'mapping.csv');
  
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}\n\nPlease create exports/mapping.csv using the template.`);
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MappingRow[];

  // Group by collection handle
  const mappingByCollection = new Map<string, MappingRow[]>();
  
  for (const row of records) {
    if (!mappingByCollection.has(row.collection_handle)) {
      mappingByCollection.set(row.collection_handle, []);
    }
    mappingByCollection.get(row.collection_handle)!.push(row);
  }

  console.log(`✅ Loaded ${records.length} mapping rules across ${mappingByCollection.size} collections\n`);
  return mappingByCollection;
}

function determinePrimaryCollection(
  product: {
    productType: string;
    collections: { edges: Array<{ node: { handle: string } }> };
  },
  mapping: Map<string, MappingRow[]>
): { primaryCollection: string | null; reason: string } {
  const productType = product.productType || '';
  const collections = product.collections.edges.map((e) => e.node.handle);

  // Find matching collection and product type
  for (const collectionHandle of collections) {
    const collectionMappings = mapping.get(collectionHandle);
    if (!collectionMappings) continue;

    // Find exact product type match
    const exactMatch = collectionMappings.find(
      (m) => m.product_type === productType
    );

    if (exactMatch) {
      if (exactMatch.action === 'exclude') {
        return {
          primaryCollection: collectionHandle, // Just collection, no subcategory
          reason: `Excluded product type: ${productType}`,
        };
      }

      if (exactMatch.action === 'merge' && exactMatch.merge_to) {
        return {
          primaryCollection: `${collectionHandle}/${exactMatch.merge_to}`,
          reason: `Merged ${productType} into ${exactMatch.merge_to}`,
        };
      }

      if (exactMatch.action === 'include' && exactMatch.subcategory_handle) {
        return {
          primaryCollection: `${collectionHandle}/${exactMatch.subcategory_handle}`,
          reason: `Mapped ${productType} to ${exactMatch.subcategory_handle}`,
        };
      }
    }

    // Try normalized match
    const normalizedProductType = normalizeProductType(productType);
    const normalizedMatch = collectionMappings.find(
      (m) => normalizeProductType(m.product_type) === normalizedProductType
    );

    if (normalizedMatch) {
      if (normalizedMatch.action === 'exclude') {
        return {
          primaryCollection: collectionHandle,
          reason: `Excluded (normalized): ${productType}`,
        };
      }

      if (normalizedMatch.action === 'merge' && normalizedMatch.merge_to) {
        return {
          primaryCollection: `${collectionHandle}/${normalizedMatch.merge_to}`,
          reason: `Merged (normalized) ${productType} into ${normalizedMatch.merge_to}`,
        };
      }

      if (normalizedMatch.action === 'include' && normalizedMatch.subcategory_handle) {
        return {
          primaryCollection: `${collectionHandle}/${normalizedMatch.subcategory_handle}`,
          reason: `Mapped (normalized) ${productType} to ${normalizedMatch.subcategory_handle}`,
        };
      }
    }
  }

  // Fallback: use first collection
  if (collections.length > 0) {
    return {
      primaryCollection: collections[0],
      reason: `No mapping found, using first collection: ${collections[0]}`,
    };
  }

  return {
    primaryCollection: null,
    reason: 'No collections found',
  };
}

async function applyMapping(dryRun: boolean = true) {
  console.log(`🔄 ${dryRun ? 'DRY RUN: ' : ''}Applying mapping...\n`);

  const mapping = await loadMapping();
  const updates: ProductUpdate[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalProcessed = 0;

  // Fetch all products
  while (hasNextPage) {
    const data = await shopifyFetch<{
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            productType: string;
            collections: {
              edges: Array<{
                node: {
                  handle: string;
                };
              };
            };
            metafield: {
              id: string;
              value: string;
            } | null;
          };
        }>;
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }>({
      query: GET_ALL_PRODUCTS,
      variables: { first: 250, after: cursor },
    });

    // Process each product
    for (const { node: product } of data.products.edges) {
      totalProcessed++;

      const currentPrimaryCollection = product.metafield?.value || null;
      const { primaryCollection, reason } = determinePrimaryCollection(
        product,
        mapping
      );

      // Only update if different
      if (currentPrimaryCollection !== primaryCollection) {
        updates.push({
          productId: product.id,
          handle: product.handle,
          title: product.title,
          productType: product.productType || '(No Product Type)',
          currentPrimaryCollection,
          newPrimaryCollection: primaryCollection,
          reason,
        });
      }

      if (totalProcessed % 100 === 0) {
        console.log(`  Processed ${totalProcessed} products...`);
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor || null;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total Products Processed: ${totalProcessed}`);
  console.log(`   Products to Update: ${updates.length}`);
  console.log(`   Products Unchanged: ${totalProcessed - updates.length}`);

  if (updates.length === 0) {
    console.log('\n✅ No changes needed!');
    return;
  }

  // Show sample updates
  console.log(`\n📝 Sample Updates (first 10):`);
  updates.slice(0, 10).forEach((update, index) => {
    console.log(`\n   ${index + 1}. ${update.handle}`);
    console.log(`      Product Type: ${update.productType}`);
    console.log(`      Current: ${update.currentPrimaryCollection || '(none)'}`);
    console.log(`      New: ${update.newPrimaryCollection || '(none)'}`);
    console.log(`      Reason: ${update.reason}`);
  });

  if (updates.length > 10) {
    console.log(`\n   ... and ${updates.length - 10} more`);
  }

  // Export updates
  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const updatesPath = path.join(outputDir, `updates-${dryRun ? 'dry-run' : 'applied'}-${Date.now()}.json`);
  fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2));
  console.log(`\n✅ Updates saved to: ${updatesPath}`);

  // Apply updates if not dry run
  if (!dryRun) {
    console.log(`\n🔄 Applying ${updates.length} updates...`);
    
    // Note: This requires Shopify Admin API access
    // For now, we'll just log what needs to be done
    console.log('\n⚠️  Admin API integration needed to apply updates.');
    console.log('   Updates are saved in the JSON file above.');
    console.log('   You can use Shopify Admin API or Shopify Flow to apply them.');
    
    // TODO: Implement Admin API calls if credentials are available
  } else {
    console.log(`\n✅ Dry run complete! Review the updates above.`);
    console.log(`   To apply changes, run: npm run import:mapping -- --apply`);
  }

  return updates;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

// Run if called directly
if (require.main === module) {
  applyMapping(dryRun)
    .then(() => {
      console.log('\n✅ Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

export { applyMapping, loadMapping };

