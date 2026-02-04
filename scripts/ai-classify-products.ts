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
 *   npm run ai:classify-products -- --resume=exports/ai-classified-products-2026-01-21.csv
 * 
 * Options:
 *   --dry-run                    Test mode, no files written
 *   --start=N                    Start at product index N
 *   --limit=N                    Process only N products
 *   --resume=path/to/file.csv    Skip products already in this CSV file
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import { ProductClassifier } from '../lib/ai/product-classifier';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@vercel/postgres';

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
const resumeArg = args.find(arg => arg.startsWith('--resume='));
const startArg = args.find(arg => arg.startsWith('--start='));
const limitArg = args.find(arg => arg.startsWith('--limit='));

const startIndex = startArg ? parseInt(startArg.split('=')[1]) : 0;
const limitCount = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
const resumeFile = resumeArg ? resumeArg.split('=')[1] : null;

console.log('🤖 AI Product Type Classifier\n');
console.log('='.repeat(60));

if (dryRun) {
  console.log('🧪 DRY RUN MODE - No files will be written\n');
}

if (resumeFile) {
  console.log(`🔄 RESUME MODE - Skipping already classified products from: ${resumeFile}\n`);
}

/**
 * Load already-classified products from a resume file
 */
function loadAlreadyClassified(filePath: string): Set<string> {
  const classifiedIds = new Set<string>();
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Resume file not found: ${filePath}`);
    return classifiedIds;
  }

  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<{ shopify_id?: string; [key: string]: any }>;

    for (const row of records) {
      if (row.shopify_id) {
        classifiedIds.add(row.shopify_id);
      }
    }

    console.log(`✅ Loaded ${classifiedIds.size} already-classified products from resume file\n`);
  } catch (error) {
    console.error(`❌ Error loading resume file:`, error);
  }

  return classifiedIds;
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
 * Load allowed vendors from vendor-shipping.csv and DB table
 */
async function loadAllowedVendors(): Promise<Set<string>> {
  const vendorFile = path.join(process.cwd(), 'vendor-shipping.csv');
  const allowed = new Set<string>();

  if (fs.existsSync(vendorFile)) {
    const csvContent = fs.readFileSync(vendorFile, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<{ Vendor?: string }>;

    records.forEach((row) => {
      if (row.Vendor && row.Vendor.trim()) {
        allowed.add(row.Vendor.trim().toLowerCase());
      }
    });
  }

  try {
    const result = await sql`
      SELECT DISTINCT vendor
      FROM vendor_shipping_rates
    `;
    result.rows.forEach((row) => {
      if (row.vendor) {
        allowed.add(String(row.vendor).trim().toLowerCase());
      }
    });
  } catch (error) {
    console.warn('⚠️  Unable to read vendor_shipping_rates table, using CSV only.');
  }

  console.log(`✅ Loaded ${allowed.size} allowed vendors\n`);
  return allowed;
}

/**
 * Fetch products needing classification from Shopify
 */
async function fetchProductsNeedingClassification(allowedVendors: Set<string>): Promise<Product[]> {
  console.log('📦 Fetching products from Shopify...\n');

  // Only classify products with truly missing product types
  const problemTypes = [
    '(No Product Type)',
    '',
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
    const result: any = await shopifyFetch<any>({
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

  const vendorFiltered = productsNeedingTypes.filter((p) =>
    allowedVendors.has((p.vendor || '').toLowerCase())
  );

  console.log(`\n✅ Total products: ${allProducts.length}`);
  console.log(`✅ Allowed vendors: ${allowedVendors.size}`);
  console.log(`⚠️  Products needing classification: ${productsNeedingTypes.length}\n`);
  console.log(`🔒 Products after vendor filter: ${vendorFiltered.length}\n`);

  // Group by current type
  const grouped = new Map<string, number>();
  vendorFiltered.forEach(p => {
    const type = p.productType || '(No Product Type)';
    grouped.set(type, (grouped.get(type) || 0) + 1);
  });

  console.log('Breakdown by current type:');
  for (const [type, count] of grouped.entries()) {
    console.log(`  ${type}: ${count} products`);
  }
  console.log();

  return vendorFiltered;
}

/**
 * Save progress to database and CSV
 */
async function saveProgressToDatabase(
  products: Product[],
  results: Map<string, any>,
  isIncremental: boolean = false
): Promise<void> {
  // Save to database directly
  let saved = 0;
  for (const product of products) {
    const result = results.get(product.id);
    if (!result) continue;

    // Extract OpenAI and Claude details from the result
    const openaiType = result.openaiType || result.suggestedType;
    const openaiConfidence = result.openaiConfidence || result.confidence;
    const claudeType = result.claudeType || result.alternativeTypes?.[0] || result.suggestedType;
    const claudeConfidence = result.claudeConfidence || result.confidence;
    const bothAgree = result.validationStatus === 'claude-validated' && !result.alternativeTypes;
    const needsReview = result.validationStatus === 'needs-review';

    try {
      await sql`
        INSERT INTO ai_product_classifications (
          shopify_id,
          handle,
          title,
          vendor,
          current_type,
          suggested_type,
          confidence,
          openai_type,
          openai_confidence,
          claude_type,
          claude_confidence,
          both_agree,
          needs_review,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${product.id},
          ${product.handle},
          ${product.title},
          ${product.vendor || null},
          ${product.productType || null},
          ${result.suggestedType},
          ${result.confidence},
          ${openaiType},
          ${openaiConfidence},
          ${claudeType || null},
          ${claudeConfidence || null},
          ${bothAgree},
          ${needsReview},
          'pending',
          NOW(),
          NOW()
        )
        ON CONFLICT (shopify_id) DO UPDATE
        SET
          handle = EXCLUDED.handle,
          title = EXCLUDED.title,
          vendor = EXCLUDED.vendor,
          current_type = EXCLUDED.current_type,
          suggested_type = EXCLUDED.suggested_type,
          confidence = EXCLUDED.confidence,
          openai_type = EXCLUDED.openai_type,
          openai_confidence = EXCLUDED.openai_confidence,
          claude_type = EXCLUDED.claude_type,
          claude_confidence = EXCLUDED.claude_confidence,
          both_agree = EXCLUDED.both_agree,
          needs_review = EXCLUDED.needs_review,
          updated_at = NOW()
      `;
      saved++;
    } catch (error) {
      console.error(`Failed to save classification for ${product.handle}:`, error);
    }
  }

  if (isIncremental) {
    console.log(`    💾 Progress saved to database: ${saved} products`);
  } else {
    console.log(`✅ Saved ${saved} classifications to database`);
  }
}

/**
 * Save progress to CSV (incremental or final)
 */
async function saveProgressToCSV(
  products: Product[],
  results: Map<string, any>,
  isIncremental: boolean = false
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = isIncremental 
    ? `ai-classified-products-${timestamp}-progress.csv`
    : `ai-classified-products-${timestamp}.csv`;
  
  const csvRows = [
    [
      'shopify_id',
      'handle',
      'title',
      'vendor',
      'current_type',
      'suggested_type',
      'confidence',
      'validation_status',
      'reasoning',
      'alternative_types',
      'tags',
      'collections',
    ],
  ];

  for (const product of products) {
    const result = results.get(product.id);
    if (!result) continue;

    csvRows.push([
      product.id,
      product.handle,
      product.title,
      product.vendor,
      product.productType || '(No Product Type)',
      result.suggestedType,
      result.confidence.toString(),
      result.validationStatus,
      result.reasoning,
      result.alternativeTypes?.join('; ') || '',
      product.tags.slice(0, 5).join('; '),
      product.collections.edges.slice(0, 3).map((e: any) => e.node.handle).join('; '),
    ]);
  }

  const csvContent = stringify(csvRows);
  const outputPath = path.join(process.cwd(), 'exports', filename);
  
  fs.writeFileSync(outputPath, csvContent);
  
  if (isIncremental) {
    console.log(`    💾 Progress saved to CSV: ${results.size} products classified`);
  } else {
    console.log(`✅ Final CSV export: ${outputPath}`);
  }
}

/**
 * Main classification process
 */
async function main() {
  try {
    // Step 1: Load valid product types
    const validProductTypes = loadValidProductTypes();

    // Step 2: Load allowed vendors
    const allowedVendors = await loadAllowedVendors();

    // Step 3: Load already-classified products if resuming
    const alreadyClassified = resumeFile ? loadAlreadyClassified(resumeFile) : new Set<string>();

    // Step 4: Fetch products needing classification
    const allProducts = await fetchProductsNeedingClassification(allowedVendors);

    // Step 5: Filter out already-classified products
    const unclassifiedProducts = alreadyClassified.size > 0
      ? allProducts.filter(p => !alreadyClassified.has(p.id))
      : allProducts;

    if (alreadyClassified.size > 0) {
      console.log(`✅ Filtered out ${allProducts.length - unclassifiedProducts.length} already-classified products`);
      console.log(`📊 Remaining to classify: ${unclassifiedProducts.length} products\n`);
    }

    // Apply start/limit filters
    const productsToClassify = unclassifiedProducts.slice(
      startIndex,
      limitCount ? startIndex + limitCount : undefined
    );

    console.log(`📊 Processing ${productsToClassify.length} products (${startIndex} to ${startIndex + productsToClassify.length})\n`);
    console.log('='.repeat(60));
    console.log();

    // Step 6: Initialize classifier
    const classifier = new ProductClassifier(validProductTypes);

    // Step 7: Process in batches of 50
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

      // Save progress after each batch (incremental save)
      if (!dryRun) {
        await saveProgressToDatabase(productsToClassify, allResults, true);
        await saveProgressToCSV(productsToClassify, allResults, true);
      }
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

    // Step 6: Export final results
    if (!dryRun) {
      console.log('\n📝 Saving final results...\n');
      await saveProgressToDatabase(productsToClassify, allResults, false);
      await saveProgressToCSV(productsToClassify, allResults, false);
    } else {
      console.log('\n🧪 DRY RUN - Skipping database and CSV export');
    }

    // Step 7: Next steps
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 NEXT STEPS:\n');
    console.log('1. Review classifications at: /admin/ai-classifications');
    console.log('2. Approve or reject each suggestion');
    console.log('3. Click "Apply to Shopify" to update product types via API');
    console.log('4. Or use "Apply All Approved" to batch update');
    console.log('5. Verify products appear on headless frontend');
    console.log('\n💡 To process more products, run:');
    console.log(`   npm run ai:classify-products -- --start=${startIndex + productsToClassify.length} --limit=50\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
