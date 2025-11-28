/**
 * Import Mapping Script (3-Level Hierarchy)
 * 
 * Reads the mapping CSV and maps products to collection hierarchy:
 * - Maps products by productType to: top_level/parent_category/subcategory_handle
 * - Product URLs remain: /products/{handle} (canonical)
 * - Handles exclusions, merges, and includes
 * 
 * Usage: 
 *   npm run import:mapping -- --dry-run --file=exports/mapping-template-draft2.csv
 *   npm run import:mapping -- --apply --file=exports/mapping-template-draft2.csv
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';

interface MappingRow {
  top_level: string;
  parent_category: string;
  subcategory_handle: string;
  product_type: string;
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

const GET_ALL_PRODUCTS = `
  query GetAllProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          handle
          title
          productType
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

async function loadMapping(filePath?: string): Promise<Map<string, MappingRow>> {
  const mappingPath = filePath 
    ? path.resolve(process.cwd(), filePath)
    : path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
  
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}\n\nPlease create the mapping CSV file.`);
  }

  console.log(`📂 Loading mapping from: ${mappingPath}`);

  const csvContent = fs.readFileSync(mappingPath, 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as MappingRow[];

  // Index by product_type for fast lookup
  const mappingByProductType = new Map<string, MappingRow>();
  
  for (const row of records) {
    if (row.product_type && row.product_type.trim()) {
      mappingByProductType.set(row.product_type.trim(), row);
    }
  }

  console.log(`✅ Loaded ${mappingByProductType.size} product type mappings\n`);
  return mappingByProductType;
}

function determinePrimaryCollection(
  productType: string,
  mapping: Map<string, MappingRow>
): { primaryCollection: string | null; reason: string } {
  
  if (!productType || productType.trim() === '') {
    return {
      primaryCollection: null,
      reason: 'No product type defined',
    };
  }

  // Find exact product type match
  const mappingRow = mapping.get(productType);
  
  if (!mappingRow) {
    return {
      primaryCollection: null,
      reason: `No mapping found for product type: ${productType}`,
    };
  }

  // Handle excluded types
  if (mappingRow.action === 'exclude') {
    return {
      primaryCollection: null,
      reason: `Excluded: ${mappingRow.notes || 'Generic product type'}`,
    };
  }

  // Handle merged types
  if (mappingRow.action === 'merge' && mappingRow.merge_to) {
    // Find the target mapping
    const targetMapping = Array.from(mapping.values()).find(
      (m) => 
        m.top_level === mappingRow.top_level &&
        m.parent_category === mappingRow.parent_category &&
        (m.subcategory_handle === mappingRow.merge_to || 
         m.parent_category === mappingRow.merge_to)
    );

    if (targetMapping) {
      const collectionPath = buildCollectionPath(targetMapping);
      return {
        primaryCollection: collectionPath,
        reason: `Merged from ${productType} to ${mappingRow.merge_to}`,
      };
    } else {
      // Fallback: build path from current row
      const collectionPath = buildCollectionPath(mappingRow);
      return {
        primaryCollection: collectionPath,
        reason: `Merged (fallback): ${productType}`,
      };
    }
  }

  // Handle included types
  if (mappingRow.action === 'include') {
    const collectionPath = buildCollectionPath(mappingRow);
    return {
      primaryCollection: collectionPath,
      reason: `Mapped to ${collectionPath}`,
    };
  }

  return {
    primaryCollection: null,
    reason: `Unknown action: ${mappingRow.action}`,
  };
}

function buildCollectionPath(row: MappingRow): string {
  const parts: string[] = [];
  
  if (row.top_level && row.top_level.trim()) {
    parts.push(row.top_level.trim());
  }
  
  if (row.parent_category && row.parent_category.trim()) {
    parts.push(row.parent_category.trim());
  }
  
  if (row.subcategory_handle && row.subcategory_handle.trim()) {
    parts.push(row.subcategory_handle.trim());
  }

  return parts.join('/');
}

async function applyMapping(dryRun: boolean = true, filePath?: string) {
  console.log(`\n🔄 ${dryRun ? 'DRY RUN: ' : ''}Applying 3-level collection mapping...\n`);

  const mapping = await loadMapping(filePath);
  const updates: ProductUpdate[] = [];
  const noProductType: string[] = [];
  const noMapping: { handle: string; productType: string }[] = [];
  
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalProcessed = 0;

  // Fetch all products
  console.log('📦 Fetching products from Shopify...\n');
  
  while (hasNextPage) {
    const data = await shopifyFetch<{
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            productType: string;
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
      
      // Track products without product type
      if (!product.productType || product.productType.trim() === '') {
        noProductType.push(product.handle);
        continue;
      }

      const { primaryCollection, reason } = determinePrimaryCollection(
        product.productType,
        mapping
      );

      // Track products without mapping
      if (primaryCollection === null && !reason.includes('Excluded')) {
        noMapping.push({ handle: product.handle, productType: product.productType });
      }

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

      if (totalProcessed % 250 === 0) {
        console.log(`  Processed ${totalProcessed} products...`);
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor || null;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total Products Processed: ${totalProcessed}`);
  console.log(`   Products Without Product Type: ${noProductType.length}`);
  console.log(`   Products Without Mapping: ${noMapping.length}`);
  console.log(`   Products to Update: ${updates.length}`);
  console.log(`   Products Unchanged: ${totalProcessed - updates.length - noProductType.length - noMapping.length}`);

  if (noProductType.length > 0) {
    console.log(`\n⚠️  Products without product type (first 10):`);
    noProductType.slice(0, 10).forEach((handle) => {
      console.log(`   - ${handle}`);
    });
    if (noProductType.length > 10) {
      console.log(`   ... and ${noProductType.length - 10} more`);
    }
  }

  if (noMapping.length > 0) {
    console.log(`\n⚠️  Products without mapping (first 10):`);
    noMapping.slice(0, 10).forEach(({ handle, productType }) => {
      console.log(`   - ${handle} (${productType})`);
    });
    if (noMapping.length > 10) {
      console.log(`   ... and ${noMapping.length - 10} more`);
    }
  }

  if (updates.length === 0) {
    console.log('\n✅ No changes needed!');
    return;
  }

  // Show sample updates
  console.log(`\n📝 Sample Updates (first 20):`);
  updates.slice(0, 20).forEach((update, index) => {
    console.log(`\n   ${index + 1}. ${update.handle}`);
    console.log(`      Product Type: ${update.productType}`);
    console.log(`      Current: ${update.currentPrimaryCollection || '(none)'}`);
    console.log(`      New: ${update.newPrimaryCollection || '(none)'}`);
    console.log(`      Reason: ${update.reason}`);
  });

  if (updates.length > 20) {
    console.log(`\n   ... and ${updates.length - 20} more`);
  }

  // Export updates
  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const updatesPath = path.join(outputDir, `updates-${dryRun ? 'dry-run' : 'applied'}-${timestamp}.json`);
  
  fs.writeFileSync(updatesPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun,
    summary: {
      totalProcessed,
      noProductType: noProductType.length,
      noMapping: noMapping.length,
      toUpdate: updates.length,
      unchanged: totalProcessed - updates.length - noProductType.length - noMapping.length,
    },
    updates,
    noProductType: noProductType.slice(0, 100),
    noMapping: noMapping.slice(0, 100),
  }, null, 2));
  
  console.log(`\n✅ Full report saved to: ${updatesPath}`);

  // Apply updates if not dry run
  if (!dryRun) {
    console.log(`\n⚠️  APPLY MODE NOT YET IMPLEMENTED`);
    console.log(`   This requires Shopify Admin API to set metafields.`);
    console.log(`   Updates are saved in JSON format above.`);
    console.log(`   You can import these via Shopify Admin API or bulk operations.`);
  } else {
    console.log(`\n✅ Dry run complete! Review the updates above.`);
    console.log(`   To apply changes, run: npm run import:mapping -- --apply --file=${filePath || 'exports/mapping-template-draft2.csv'}`);
  }

  return { updates, noProductType, noMapping };
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');
const fileIndex = args.findIndex(arg => arg === '--file');
const filePath = fileIndex !== -1 && args[fileIndex + 1] ? args[fileIndex + 1] : undefined;

// Run if called directly
if (require.main === module) {
  applyMapping(dryRun, filePath)
    .then(() => {
      console.log('\n✅ Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      console.error(error.stack);
      process.exit(1);
    });
}

export { applyMapping, loadMapping };
