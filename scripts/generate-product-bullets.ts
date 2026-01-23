#!/usr/bin/env tsx

/**
 * AI Product Bullet Points Generator
 * 
 * Generates unique, product-specific bullet points for each product page
 * 
 * Usage:
 *   npm run generate:bullets -- --dry-run --limit=10
 *   npm run generate:bullets -- --start=0 --limit=50
 *   npm run generate:bullets
 *   npm run generate:bullets -- --resume=exports/product-bullet-points-2026-01-23-progress.csv
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
const resumeArg = args.find(arg => arg.startsWith('--resume='));
const startArg = args.find(arg => arg.startsWith('--start='));
const limitArg = args.find(arg => arg.startsWith('--limit='));

const startIndex = startArg ? parseInt(startArg.split('=')[1]) : 0;
const limitCount = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
const resumeFile = resumeArg ? resumeArg.split('=')[1] : null;

console.log('🎯 AI Product Bullet Points Generator\n');
console.log('='.repeat(60));

if (dryRun) {
  console.log('🧪 DRY RUN MODE - No files will be written\n');
}

if (resumeFile) {
  console.log(`🔄 RESUME MODE - Skipping already processed products from: ${resumeFile}\n`);
}

/**
 * Load already-processed products from a resume file
 */
function loadAlreadyProcessed(filePath: string): Set<string> {
  const processedIds = new Set<string>();
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Resume file not found: ${filePath}`);
    return processedIds;
  }

  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<{ product_id?: string; [key: string]: any }>;

    for (const row of records) {
      if (row.product_id) {
        processedIds.add(row.product_id);
      }
    }

    console.log(`✅ Loaded ${processedIds.size} already-processed products from resume file\n`);
  } catch (error) {
    console.error(`❌ Error loading resume file:`, error);
  }

  return processedIds;
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
  console.log(`  🎯 Generating bullets: ${product.title}`);

  // Extract clean description
  const cleanDescription = stripHtml(product.descriptionHtml);
  const descriptionPreview = cleanDescription.substring(0, 1000); // First 1000 chars

  // Build context
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

EXAMPLES OF GOOD BULLETS:
- "AS/NZS 3838 Safety Certified for advanced protection meeting Australian standards"
- "1200D Ripstop outer shell built for harsh weather conditions"
- "Four-way stretch fabric with UPF 50+ sun protection"
- "YKK zippers with elasticated panels for smooth operation"
- "300g polyfill insulation perfect for Australian winter turnout"

EXAMPLES OF BAD BULLETS (too generic):
- "Premium quality materials for long-lasting durability and comfort"
- "Expertly designed for optimal performance in all conditions"
- "Trusted by professionals and enthusiasts worldwide"

Return ONLY valid JSON: {
  "bullet1": "Plain text benefit statement",
  "bullet2": "Plain text benefit statement", 
  "bullet3": "Plain text benefit statement",
  "confidence": 0-100,
  "reasoning": "Brief explanation of why these bullets were chosen"
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
    
    // Validate bullet lengths
    const bullets = [parsed.bullet1, parsed.bullet2, parsed.bullet3];
    const invalidBullets = bullets.filter(b => !b || b.length < 40 || b.length > 120);
    
    const needsReview = invalidBullets.length > 0 || parsed.confidence < 85;
    
    if (invalidBullets.length > 0) {
      console.log(`    ⚠️  Some bullets invalid length (${parsed.confidence}%)`);
    } else if (parsed.confidence >= 85) {
      console.log(`    ✅ High confidence (${parsed.confidence}%)`);
    } else {
      console.log(`    ⚠️  Low confidence (${parsed.confidence}%)`);
    }

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
 * Validate with Claude for low-confidence results
 */
async function validateWithClaude(
  product: Product,
  openaiResult: BulletPointsResult,
  anthropicApiKey: string
): Promise<BulletPointsResult> {
  console.log(`    🔍 Validating with Claude...`);

  const cleanDescription = stripHtml(product.descriptionHtml);
  const descriptionPreview = cleanDescription.substring(0, 1000);

  const prompt = `You are validating product bullet points generated by another AI.

PRODUCT:
Title: ${product.title}
Vendor: ${product.vendor}
Type: ${product.productType}
Description: ${descriptionPreview}

GENERATED BULLETS:
1. ${openaiResult.bullet1}
2. ${openaiResult.bullet2}
3. ${openaiResult.bullet3}

Confidence: ${openaiResult.confidence}%
Reasoning: ${openaiResult.reasoning}

TASK:
1. Are these bullets SPECIFIC and feature-focused? (not generic)
2. Do they accurately represent the product?
3. Are they 40-120 characters each?
4. If NO to any, suggest better bullets

Return ONLY valid JSON: {
  "approved": true/false,
  "bullet1": "improved or same",
  "bullet2": "improved or same",
  "bullet3": "improved or same",
  "confidence": 0-100,
  "reasoning": "explanation"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('    ❌ Claude API error:', await response.text());
      return openaiResult;
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('    ❌ Could not parse Claude response');
      return openaiResult;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.approved && parsed.confidence >= 85) {
      console.log(`    ✅ Claude approved (${parsed.confidence}%)`);
      return {
        bullet1: parsed.bullet1,
        bullet2: parsed.bullet2,
        bullet3: parsed.bullet3,
        confidence: Math.max(openaiResult.confidence, parsed.confidence),
        reasoning: `Dual AI validation - ${parsed.reasoning}`,
        needsReview: false,
      };
    } else {
      console.log(`    ⚠️  Claude suggests improvements (${parsed.confidence}%)`);
      return {
        bullet1: parsed.bullet1,
        bullet2: parsed.bullet2,
        bullet3: parsed.bullet3,
        confidence: parsed.confidence,
        reasoning: `Claude improved: ${parsed.reasoning}`,
        needsReview: parsed.confidence < 85,
      };
    }
  } catch (error) {
    console.error(`    ❌ Error validating with Claude:`, error);
    return openaiResult;
  }
}

/**
 * Save progress to CSV
 */
async function saveProgressToCSV(
  products: Product[],
  results: Map<string, BulletPointsResult>,
  isIncremental: boolean = false
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = isIncremental 
    ? `product-bullet-points-${timestamp}-progress.csv`
    : `product-bullet-points-${timestamp}.csv`;
  
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

  for (const product of products) {
    const result = results.get(product.id);
    if (!result) continue;

    csvRows.push([
      product.id,
      product.handle,
      product.title,
      product.vendor,
      product.productType,
      result.bullet1,
      result.bullet2,
      result.bullet3,
      result.confidence.toString(),
      new Date().toISOString(),
      result.needsReview ? 'true' : 'false',
      result.reasoning,
    ]);
  }

  const csvContent = stringify(csvRows);
  const outputPath = path.join(process.cwd(), 'exports', filename);
  
  fs.writeFileSync(outputPath, csvContent);
  
  if (isIncremental) {
    console.log(`    💾 Progress saved: ${results.size} products processed`);
  } else {
    console.log(`✅ Final export: ${outputPath}`);
  }
}

/**
 * Main processing function
 */
async function main() {
  try {
    // Check API keys
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Step 1: Load already-processed products if resuming
    const alreadyProcessed = resumeFile ? loadAlreadyProcessed(resumeFile) : new Set<string>();

    // Step 2: Fetch all products
    const allProducts = await fetchAllProducts();

    // Step 3: Filter out already-processed products
    const unprocessedProducts = alreadyProcessed.size > 0
      ? allProducts.filter(p => !alreadyProcessed.has(p.id))
      : allProducts;

    if (alreadyProcessed.size > 0) {
      console.log(`✅ Filtered out ${allProducts.length - unprocessedProducts.length} already-processed products`);
      console.log(`📊 Remaining to process: ${unprocessedProducts.length} products\n`);
    }

    // Apply start/limit filters
    const productsToProcess = unprocessedProducts.slice(
      startIndex,
      limitCount ? startIndex + limitCount : undefined
    );

    console.log(`📊 Processing ${productsToProcess.length} products (${startIndex} to ${startIndex + productsToProcess.length})\n`);
    console.log('='.repeat(60));
    console.log();

    // Step 4: Process in batches of 50
    const batchSize = 50;
    const allResults = new Map<string, BulletPointsResult>();
    let totalCost = 0;

    for (let i = 0; i < productsToProcess.length; i += batchSize) {
      const batch = productsToProcess.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(productsToProcess.length / batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} products)\n`);

      for (const product of batch) {
        // Generate bullets with OpenAI
        const openaiResult = await generateBulletPoints(product, openai);
        
        // Validate with Claude if low confidence
        let finalResult = openaiResult;
        if (openaiResult.confidence < 85 || openaiResult.needsReview) {
          finalResult = await validateWithClaude(product, openaiResult, anthropicKey);
        }

        allResults.set(product.id, finalResult);

        // Rate limiting: wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Show batch stats
      const batchResults = new Map(
        Array.from(allResults.entries()).slice(i, i + batch.length)
      );
      const highConfidence = Array.from(batchResults.values()).filter(r => r.confidence >= 85).length;
      const needsReview = Array.from(batchResults.values()).filter(r => r.needsReview).length;
      const avgConfidence = Array.from(batchResults.values()).reduce((sum, r) => sum + r.confidence, 0) / batchResults.size;

      console.log(`\n  Batch Stats:`);
      console.log(`    High confidence (≥85%): ${highConfidence}`);
      console.log(`    Needs review: ${needsReview}`);
      console.log(`    Avg confidence: ${avgConfidence.toFixed(1)}%`);

      // Estimate cost (rough approximation)
      const batchCost = batch.length * 0.001; // ~$0.001 per product
      totalCost += batchCost;
      console.log(`    Estimated cost: $${batchCost.toFixed(3)}`);

      // Save progress after each batch
      if (!dryRun) {
        await saveProgressToCSV(productsToProcess, allResults, true);
      }
    }

    // Step 5: Generate statistics
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 FINAL STATISTICS\n');

    const allResultsArray = Array.from(allResults.values());
    const highConfidence = allResultsArray.filter(r => r.confidence >= 85).length;
    const needsReview = allResultsArray.filter(r => r.needsReview).length;
    const avgConfidence = allResultsArray.reduce((sum, r) => sum + r.confidence, 0) / allResultsArray.length;

    console.log(`Total processed: ${allResultsArray.length}`);
    console.log(`High confidence (≥85%): ${highConfidence} (${(highConfidence / allResultsArray.length * 100).toFixed(1)}%)`);
    console.log(`Needs manual review: ${needsReview} (${(needsReview / allResultsArray.length * 100).toFixed(1)}%)`);
    console.log(`Average confidence: ${avgConfidence.toFixed(1)}%`);
    console.log(`Estimated total cost: $${totalCost.toFixed(2)}`);

    // Step 6: Export final CSV
    if (!dryRun) {
      console.log('\n📝 Exporting final results to CSV...\n');
      await saveProgressToCSV(productsToProcess, allResults, false);
    } else {
      console.log('\n🧪 DRY RUN - Skipping CSV export');
    }

    // Step 7: Next steps
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 NEXT STEPS:\n');
    console.log('1. Review the CSV file: exports/product-bullet-points-YYYY-MM-DD.csv');
    console.log('2. Check products with needs_review=true');
    console.log('3. Edit bullets manually in spreadsheet if needed');
    console.log('4. The CSV will be automatically loaded by the frontend');
    console.log('\n💡 To process more products, run:');
    console.log(`   npm run generate:bullets -- --start=${startIndex + productsToProcess.length} --limit=50\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
