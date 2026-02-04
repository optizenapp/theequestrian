import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@vercel/postgres';
import { shopifyFetch } from '@/lib/shopify/client';
import { ProductClassifier } from '@/lib/ai/product-classifier';

interface Product {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  tags: string[];
  collections: { edges: Array<{ node: { handle: string } }> };
}

interface RunOptions {
  start?: number;
  limit?: number;
  dryRun?: boolean;
  saveCsv?: boolean;
  saveDb?: boolean;
}

async function ensureClassificationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS ai_product_classifications (
      id SERIAL PRIMARY KEY,
      shopify_id TEXT NOT NULL UNIQUE,
      handle TEXT NOT NULL,
      title TEXT NOT NULL,
      vendor TEXT,
      current_type TEXT,
      suggested_type TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      openai_type TEXT NOT NULL,
      openai_confidence INTEGER NOT NULL,
      claude_type TEXT,
      claude_confidence INTEGER,
      both_agree BOOLEAN DEFAULT FALSE,
      needs_review BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

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
  }) as Array<{ action?: string; product_type?: string }>;

  const productTypes = new Set<string>();
  for (const row of records) {
    if (row.action !== 'exclude' && row.product_type && row.product_type.trim()) {
      productTypes.add(row.product_type.trim());
    }
  }

  return Array.from(productTypes).sort();
}

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

  return allowed;
}

async function fetchProductsNeedingClassification(
  allowedVendors: Set<string>
): Promise<Product[]> {
  const problemTypes = ['(No Product Type)', ''];

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
                node { handle }
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
  }

  const productsNeedingTypes = allProducts.filter(
    (p) => !p.productType || p.productType.trim() === '' || problemTypes.includes(p.productType)
  );

  return productsNeedingTypes.filter((p) =>
    allowedVendors.has((p.vendor || '').toLowerCase())
  );
}

export async function getRemainingToClassifyCount(): Promise<number> {
  const allowedVendors = await loadAllowedVendors();
  const products = await fetchProductsNeedingClassification(allowedVendors);
  return products.length;
}

async function saveProgressToDatabase(
  products: Product[],
  results: Map<string, any>,
  isIncremental: boolean
): Promise<number> {
  await ensureClassificationsTable();
  let saved = 0;

  for (const product of products) {
    const result = results.get(product.id);
    if (!result) continue;

    const openaiType = result.openaiType || result.suggestedType;
    const openaiConfidence = result.openaiConfidence || result.confidence;
    const claudeType = result.claudeType || result.alternativeTypes?.[0] || result.suggestedType;
    const claudeConfidence = result.claudeConfidence || result.confidence;
    const bothAgree = result.validationStatus === 'claude-validated' && !result.alternativeTypes;
    const needsReview = result.validationStatus === 'needs-review';

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
  }

  if (isIncremental) {
    console.log(`    💾 Progress saved to database: ${saved} products`);
  } else {
    console.log(`✅ Saved ${saved} classifications to database`);
  }

  return saved;
}

async function saveProgressToCSV(
  products: Product[],
  results: Map<string, any>,
  isIncremental: boolean
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

export async function runClassification(options: RunOptions = {}) {
  const { start = 0, limit, dryRun = false, saveCsv = true, saveDb = true } = options;

  const validProductTypes = loadValidProductTypes();
  const allowedVendors = await loadAllowedVendors();
  const allProducts = await fetchProductsNeedingClassification(allowedVendors);

  const productsToClassify =
    limit != null ? allProducts.slice(start, start + limit) : allProducts.slice(start);

  const classifier = new ProductClassifier(validProductTypes);
  const batchSize = 50;
  const allResults = new Map<string, any>();
  let totalSaved = 0;

  for (let i = 0; i < productsToClassify.length; i += batchSize) {
    const batch = productsToClassify.slice(i, i + batchSize);
    const batchResults = await classifier.classifyBatch(
      batch.map((p) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        vendor: p.vendor,
        tags: p.tags,
        collections: p.collections.edges.map((e: any) => e.node.handle),
        currentType: p.productType,
      }))
    );

    for (const [id, result] of batchResults.entries()) {
      allResults.set(id, result);
    }

    if (!dryRun) {
      if (saveDb) {
        totalSaved += await saveProgressToDatabase(productsToClassify, allResults, true);
      }
      if (saveCsv) {
        await saveProgressToCSV(productsToClassify, allResults, true);
      }
    }
  }

  if (!dryRun) {
    if (saveDb) {
      totalSaved += await saveProgressToDatabase(productsToClassify, allResults, false);
    }
    if (saveCsv) {
      try {
        await saveProgressToCSV(productsToClassify, allResults, false);
      } catch (error) {
        // Ignore CSV save errors in production (read-only filesystem)
        console.warn('⚠️  Could not save CSV (read-only filesystem):', (error as Error).message);
      }
    }
  }

  return {
    total: productsToClassify.length,
    saved: totalSaved,
  };
}
