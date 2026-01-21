#!/usr/bin/env tsx

/**
 * AI Product Type Classifier
 * 
 * Automatically classifies products without proper product types using AI
 * 
 * Usage:
 *   npm run ai:classify-products -- --dry-run
 *   npm run ai:classify-products -- --start=0 --limit=50
 *   npm run ai:classify-products
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import { ProductClassifier } from '../lib/ai/product-classifier';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

interface Product {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  tags: string[];
  collections: { edges: Array<{ node: { handle: string } }> };
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const startArg = args.find(arg => arg.startsWith('--start='));
const limitArg = args.find(arg => arg.startsWith('--limit='));

const startIndex = startArg ? parseInt(startArg.split('=')[1]) : 0;
const limitCount = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

console.log('🤖 AI Product Type Classifier\n');
console.log('='.repeat(60));

if (dryRun) {
  console.log('🧪 DRY RUN MODE - No files will be written\n');
}

/**
 * Load valid product types from mapping CSV
 */
function loadValidProductTypes(): string[] {
  const mappingPath = path.join(process.cwd(), 'exports', 'mapping-template-draft2.csv');
  
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}`);
  }

  const csvContent = fs.readFileSync(mappingPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<{ action?: string; product_type?: string; [key: string]: any }>;

  // Extract unique product types (excluding excluded ones)
  const productTypes = new Set<string>();
  
  for (const row of records) {
    if (row.action !== 'exclude' && row.product_type && row.product_type.trim()) {
      productTypes.add(row.product_type.trim());
    }
  }

  const types = Array.from(productTypes).sort();
  console.log(`✅ Loaded ${types.length} valid product types from mapping\n`);
  
  return types;
}

/**
 * Fetch products needing classification from Shopify
 */
async function fetchProductsNeedingClassification(): Promise<Product[]> {
  console.log('📦 Fetching products from Shopify...\n');

  const problemTypes = [
    '(No Product Type)',
    '',
    'Default',
    'Veterinary',
    'Clothing',
    'Accessories',
    'Pet',
    'General',
  ];

  const query = `
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            handle
            title
            productType
            vendor
            tags
            collections(first: 10) {
              edges {
                node {
                  handle
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

  let allProducts: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const result = await shopifyFetch<any>({
      query,
      variables: { first: 250, after: cursor },
      cache: 'no-store',
    });

    allProducts.push(...result.products.edges.map((e: any) => e.node));
    hasNextPage = result.products.pageInfo.hasNextPage;
    cursor = result.products.pageInfo.endCursor;

    console.log(`  Fetched ${allProducts.length} products...`);
  }

  // Filter products with problem types
  const productsNeedingTypes = allProducts.filter(p => 
    !p.productType || 
    p.productType.trim() === '' ||
    problemTypes.includes(p.productType)
  );

  console.log(`\n✅ Total products: ${allProducts.length}`);
  console.log(`⚠️  Products needing classification: ${productsNeedingTypes.length}\n`);

  // Group by current type
  const grouped = new Map<string, number>();
  productsNeedingTypes.forEach(p => {
    const type = p.productType || '(No Product Type)';
    grouped.set(type, (grouped.get(type) || 0) + 1);
  });

  console.log('Breakdown by current type:');
  for (const [type, count] of grouped.entries()) {
    console.log(`  ${type}: ${count} products`);
  }
  console.log();

  return productsNeedingTypes;
}

/**
 * Main classification process
 */
async function main() {
  try {
    // Step 1: Load valid product types
    const validProductTypes = loadValidProductTypes();

    // Step 2: Fetch products needing classification
    const allProducts = await fetchProductsNeedingClassification();

    // Apply start/limit filters
    const productsToClassify = allProducts.slice(
      startIndex,
      limitCount ? startIndex + limitCount : undefined
    );

    console.log(`📊 Processing ${productsToClassify.length} products (${startIndex} to ${startIndex + productsToClassify.length})\n`);
    console.log('='.repeat(60));
    console.log();

    // Step 3: Initialize classifier
    const classifier = new ProductClassifier(validProductTypes);

    // Step 4: Process in batches of 50
    const batchSize = 50;
    const allResults = new Map();

    for (let i = 0; i < productsToClassify.length; i += batchSize) {
      const batch = productsToClassify.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(productsToClassify.length / batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} products)\n`);

      const batchResults = await classifier.classifyBatch(
        batch.map(p => ({
          id: p.id,
          handle: p.handle,
          title: p.title,
          vendor: p.vendor,
          tags: p.tags,
          collections: p.collections.edges.map(e => e.node.handle),
          currentType: p.productType,
        }))
      );

      // Merge results
      for (const [id, result] of batchResults.entries()) {
        allResults.set(id, result);
      }

      // Show batch stats
      const batchStats = ProductClassifier.getStats(batchResults);
      console.log(`\n  Batch Stats:`);
      console.log(`    Both AIs agree: ${batchStats.bothAgree}`);
      console.log(`    Claude validated (total): ${batchStats.claudeValidated}`);
      console.log(`    Needs review: ${batchStats.needsReview}`);
      console.log(`    Avg confidence: ${batchStats.avgConfidence.toFixed(1)}%`);
    }

    // Step 5: Generate statistics
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 FINAL STATISTICS\n');

    const stats = ProductClassifier.getStats(allResults);
    console.log(`Total classified: ${stats.total}`);
    console.log(`Both AIs agree: ${stats.bothAgree} (${(stats.bothAgree / stats.total * 100).toFixed(1)}%)`);
    console.log(`Claude validated (total): ${stats.claudeValidated} (${(stats.claudeValidated / stats.total * 100).toFixed(1)}%)`);
    console.log(`Needs manual review: ${stats.needsReview} (${(stats.needsReview / stats.total * 100).toFixed(1)}%)`);
    console.log(`Average confidence: ${stats.avgConfidence.toFixed(1)}%`);

    // Step 6: Export to CSV
    if (!dryRun) {
      console.log('\n📝 Exporting results to CSV...\n');
      
      const csvRows = [
        [
          'Product ID',
          'Handle',
          'Title',
          'Current Product Type',
          'Vendor',
          'Tags (first 5)',
          'Collections (first 3)',
          'AI Suggested Type',
          'Confidence %',
          'Validation Status',
          'Reasoning',
          'Alternative Types',
          'Manual Override',
        ],
      ];

      for (const product of productsToClassify) {
        const result = allResults.get(product.id);
        if (!result) continue;

        csvRows.push([
          product.id.replace('gid://shopify/Product/', ''),
          product.handle,
          product.title,
          product.productType || '(No Product Type)',
          product.vendor,
          product.tags.slice(0, 5).join('; '),
          product.collections.edges.slice(0, 3).map(e => e.node.handle).join('; '),
          result.suggestedType,
          result.confidence.toString(),
          result.validationStatus,
          result.reasoning,
          result.alternativeTypes?.join('; ') || '',
          '', // Manual override - empty for user to fill
        ]);
      }

      const csvContent = stringify(csvRows);
      const outputPath = path.join(process.cwd(), 'exports', 'products-classified-by-ai.csv');
      
      fs.writeFileSync(outputPath, csvContent);
      
      console.log(`✅ Exported to: ${outputPath}`);
    } else {
      console.log('\n🧪 DRY RUN - Skipping CSV export');
    }

    // Step 7: Next steps
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 NEXT STEPS:\n');
    console.log('1. Review the CSV file: exports/products-classified-by-ai.csv');
    console.log('2. Check "Needs manual review" rows and fill "Manual Override" if needed');
    console.log('3. Use Shopify bulk editor to import product types:');
    console.log('   - Go to Products → Import');
    console.log('   - Map "AI Suggested Type" → "Product Type"');
    console.log('   - Or use "Manual Override" column for reviewed items');
    console.log('4. Verify products appear on headless frontend');
    console.log('\n💡 To process more products, run:');
    console.log(`   npm run ai:classify-products -- --start=${startIndex + productsToClassify.length} --limit=50\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
