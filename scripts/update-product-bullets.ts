#!/usr/bin/env tsx

/**
 * Incremental Product Bullet Points Updater
 * 
 * Updates bullet points for new products or products without bullets
 * Designed to run as a scheduled job (daily/weekly)
 * 
 * Usage:
 *   npm run update:bullets
 *   npm run update:bullets -- --dry-run
 *   npm run update:bullets -- --force  (regenerate all bullets)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import OpenAI from 'openai';

interface Product {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface BulletPointRow {
  product_id: string;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  bullet_1: string;
  bullet_2: string;
  bullet_3: string;
  confidence_score: string;
  generated_date: string;
  needs_review: string;
  reasoning: string;
}

interface BulletPointsResult {
  bullet1: string;
  bullet2: string;
  bullet3: string;
  confidence: number;
  reasoning: string;
  needsReview: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

console.log('🔄 Incremental Product Bullet Points Updater\n');
console.log('='.repeat(60));

if (dryRun) {
  console.log('🧪 DRY RUN MODE - No files will be written\n');
}

if (force) {
  console.log('⚡ FORCE MODE - Will regenerate all bullets\n');
}

/**
 * Find the most recent CSV file
 */
function findLatestCSV(): string | null {
  const exportsDir = path.join(process.cwd(), 'exports');
  
  if (!fs.existsSync(exportsDir)) {
    return null;
  }

  const files = fs.readdirSync(exportsDir)
    .filter(f => f.startsWith('product-bullet-points-') && f.endsWith('.csv'))
    .filter(f => !f.includes('progress'))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(exportsDir, files[0]) : null;
}

/**
 * Load existing bullet points from CSV
 */
function loadExistingBullets(): Map<string, BulletPointRow> {
  const csvPath = findLatestCSV();
  
  if (!csvPath) {
    console.log('ℹ️  No existing CSV found, will generate bullets for all products\n');
    return new Map();
  }

  console.log(`📂 Loading existing bullets from: ${path.basename(csvPath)}\n`);

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as BulletPointRow[];

    const bulletMap = new Map<string, BulletPointRow>();

    for (const row of records) {
      bulletMap.set(row.product_id, row);
    }

    console.log(`✅ Loaded ${bulletMap.size} existing products\n`);
    return bulletMap;
  } catch (error) {
    console.error('❌ Error loading CSV:', error);
    return new Map();
  }
}

/**
 * Fetch all products from Shopify
 */
async function fetchAllProducts(): Promise<Product[]> {
  console.log('📦 Fetching products from Shopify...\n');

  const query = `
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            handle
            title
            description
            descriptionHtml
            productType
            vendor
            tags
            priceRange {
              minVariantPrice {
                amount
                currencyCode
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

  console.log(`\n✅ Total products: ${allProducts.length}\n`);

  return allProducts;
}

/**
 * Strip HTML tags from description
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate bullet points using OpenAI GPT-4o
 */
async function generateBulletPoints(
  product: Product,
  openai: OpenAI
): Promise<BulletPointsResult> {
  const cleanDescription = stripHtml(product.descriptionHtml);
  const descriptionPreview = cleanDescription.substring(0, 1000);

  const context = `
PRODUCT INFORMATION:
Title: ${product.title}
Vendor: ${product.vendor}
Product Type: ${product.productType}
Price: $${product.priceRange.minVariantPrice.amount} ${product.priceRange.minVariantPrice.currencyCode}
Tags: ${product.tags.slice(0, 10).join(', ')}

DESCRIPTION:
${descriptionPreview}
`.trim();

  const systemPrompt = `You are an expert at creating compelling, specific product bullet points for equestrian and pet products.

TASK: Generate 3 unique bullet points that highlight the SPECIFIC features and benefits of this product.

RULES:
1. Each bullet MUST be 40-120 characters long
2. Format: Plain text without markdown (no ** for bold)
3. Extract SPECIFIC details from the description (materials, certifications, measurements, technologies)
4. Avoid generic phrases like "premium quality", "expertly designed", "trusted by professionals"
5. Focus on concrete, measurable features (e.g., "1200D Ripstop", "AS/NZS 3838 Certified", "Four-Way Stretch")
6. Prioritize unique selling points that differentiate this product
7. Use Australian spelling and context where relevant

Return ONLY valid JSON: {
  "bullet1": "Plain text benefit statement",
  "bullet2": "Plain text benefit statement", 
  "bullet3": "Plain text benefit statement",
  "confidence": 0-100,
  "reasoning": "Brief explanation"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(response);
    
    const bullets = [parsed.bullet1, parsed.bullet2, parsed.bullet3];
    const invalidBullets = bullets.filter(b => !b || b.length < 40 || b.length > 120);
    
    const needsReview = invalidBullets.length > 0 || parsed.confidence < 85;

    return {
      bullet1: parsed.bullet1 || 'Premium quality materials for durability and comfort',
      bullet2: parsed.bullet2 || 'Expertly designed for optimal performance',
      bullet3: parsed.bullet3 || 'Trusted by professionals worldwide',
      confidence: parsed.confidence || 0,
      reasoning: parsed.reasoning || 'Generated from product information',
      needsReview,
    };
  } catch (error) {
    console.error(`    ❌ Error generating bullets:`, error);
    return {
      bullet1: 'Premium quality materials for long-lasting durability and comfort',
      bullet2: 'Expertly designed for optimal performance in all conditions',
      bullet3: 'Trusted by professionals and enthusiasts worldwide',
      confidence: 0,
      reasoning: `Error during generation: ${error}`,
      needsReview: true,
    };
  }
}

/**
 * Merge existing and new bullets into a single CSV
 */
function mergeAndSaveCSV(
  existingBullets: Map<string, BulletPointRow>,
  newBullets: Map<string, BulletPointsResult>,
  products: Product[]
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `product-bullet-points-${timestamp}.csv`;
  
  const csvRows = [
    [
      'product_id',
      'handle',
      'title',
      'vendor',
      'product_type',
      'bullet_1',
      'bullet_2',
      'bullet_3',
      'confidence_score',
      'generated_date',
      'needs_review',
      'reasoning',
    ],
  ];

  // Create a map of all products
  const productMap = new Map(products.map(p => [p.id, p]));

  // Merge existing and new bullets
  const allProductIds = new Set([
    ...existingBullets.keys(),
    ...newBullets.keys(),
  ]);

  for (const productId of allProductIds) {
    const product = productMap.get(productId);
    if (!product) continue;

    const newBullet = newBullets.get(productId);
    const existingBullet = existingBullets.get(productId);

    // Prefer new bullets if available, otherwise use existing
    if (newBullet) {
      csvRows.push([
        product.id,
        product.handle,
        product.title,
        product.vendor,
        product.productType,
        newBullet.bullet1,
        newBullet.bullet2,
        newBullet.bullet3,
        newBullet.confidence.toString(),
        new Date().toISOString(),
        newBullet.needsReview ? 'true' : 'false',
        newBullet.reasoning,
      ]);
    } else if (existingBullet) {
      csvRows.push([
        existingBullet.product_id,
        existingBullet.handle,
        existingBullet.title,
        existingBullet.vendor,
        existingBullet.product_type,
        existingBullet.bullet_1,
        existingBullet.bullet_2,
        existingBullet.bullet_3,
        existingBullet.confidence_score,
        existingBullet.generated_date,
        existingBullet.needs_review,
        existingBullet.reasoning,
      ]);
    }
  }

  const csvContent = stringify(csvRows);
  const outputPath = path.join(process.cwd(), 'exports', filename);
  
  fs.writeFileSync(outputPath, csvContent);
  console.log(`✅ Saved merged CSV: ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    // Check API keys
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Step 1: Load existing bullets
    const existingBullets = loadExistingBullets();

    // Step 2: Fetch all products
    const allProducts = await fetchAllProducts();

    // Step 3: Identify products needing bullets
    const productsNeedingBullets = force
      ? allProducts
      : allProducts.filter(p => !existingBullets.has(p.id));

    console.log(`📊 Products needing bullets: ${productsNeedingBullets.length}`);
    
    if (productsNeedingBullets.length === 0) {
      console.log('\n✅ All products already have bullet points!');
      console.log('   Use --force to regenerate all bullets\n');
      return;
    }

    console.log(`   Existing: ${existingBullets.size}`);
    console.log(`   New: ${productsNeedingBullets.length}\n`);
    console.log('='.repeat(60));
    console.log();

    // Step 4: Generate bullets for new products
    const newBullets = new Map<string, BulletPointsResult>();
    let processed = 0;

    for (const product of productsNeedingBullets) {
      processed++;
      console.log(`[${processed}/${productsNeedingBullets.length}] ${product.title}`);
      
      const result = await generateBulletPoints(product, openai);
      newBullets.set(product.id, result);

      if (result.confidence >= 85) {
        console.log(`  ✅ High confidence (${result.confidence}%)`);
      } else {
        console.log(`  ⚠️  Low confidence (${result.confidence}%)`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

      // Save progress every 50 products
      if (processed % 50 === 0 && !dryRun) {
        console.log(`\n  💾 Saving progress (${processed} products)...\n`);
        mergeAndSaveCSV(existingBullets, newBullets, allProducts);
      }
    }

    // Step 5: Statistics
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 STATISTICS\n');

    const newBulletsArray = Array.from(newBullets.values());
    const highConfidence = newBulletsArray.filter(r => r.confidence >= 85).length;
    const needsReview = newBulletsArray.filter(r => r.needsReview).length;
    const avgConfidence = newBulletsArray.reduce((sum, r) => sum + r.confidence, 0) / newBulletsArray.length;

    console.log(`New bullets generated: ${newBulletsArray.length}`);
    console.log(`High confidence (≥85%): ${highConfidence} (${(highConfidence / newBulletsArray.length * 100).toFixed(1)}%)`);
    console.log(`Needs review: ${needsReview} (${(needsReview / newBulletsArray.length * 100).toFixed(1)}%)`);
    console.log(`Average confidence: ${avgConfidence.toFixed(1)}%`);
    console.log(`Total in CSV: ${existingBullets.size + newBulletsArray.length}`);

    // Step 6: Save final merged CSV
    if (!dryRun) {
      console.log('\n📝 Saving final merged CSV...\n');
      mergeAndSaveCSV(existingBullets, newBullets, allProducts);
    } else {
      console.log('\n🧪 DRY RUN - Skipping CSV save');
    }

    console.log('\n✅ Update complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
