import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { sql } from '@vercel/postgres';
import { shopifyFetch } from '@/lib/shopify/client';
import { getProductOverridesByHandles } from '@/lib/content/product-overrides';
import type { ProductContentOverride } from '@/lib/content/product-overrides';
import { getAllPublishedBrandContent } from '@/lib/content/brand-content';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import { getPrimaryCategoryPath, getProductCanonicalUrls } from '@/lib/shopify/products';
import {
  ProductClassifier,
  type BrandSeed,
  type ClassificationModel,
  type ClassificationResult,
} from '@/lib/ai/product-classifier';

interface Product {
  id: string;
  handle: string;
  title: string;
  productType: string;
  vendor: string;
  description: string;
  descriptionHtml: string;
  onlineStoreUrl?: string | null;
  seo?: {
    title?: string | null;
    description?: string | null;
  } | null;
  tags: string[];
  collections: { edges: Array<{ node: { handle: string } }> };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: {
    edges: Array<{
      node: {
        title: string;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  metafield?: { value: string } | null;
}

interface ShopifyProductsResponse {
  products: {
    edges: Array<{ node: Product }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

interface RunOptions {
  start?: number;
  limit?: number;
  dryRun?: boolean;
  saveCsv?: boolean;
  saveDb?: boolean;
  model?: ClassificationModel;
  exportCsvInDryRun?: boolean;
  includeAllProducts?: boolean;
  includeAllVendors?: boolean;
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
      suggested_type TEXT,
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

  await sql`
    ALTER TABLE ai_product_classifications
    ALTER COLUMN suggested_type DROP NOT NULL
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
  } catch {
    console.warn('⚠️  Unable to read vendor_shipping_rates table, using CSV only.');
  }

  return allowed;
}

async function fetchProductsForClassification(
  allowedVendors: Set<string>,
  options: { includeAllProducts?: boolean; includeAllVendors?: boolean } = {}
): Promise<Product[]> {
  const { includeAllProducts = false, includeAllVendors = false } = options;
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
            description
            descriptionHtml
            onlineStoreUrl
            seo {
              title
              description
            }
            tags
            collections(first: 10) {
              edges {
                node { handle }
              }
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  title
                  selectedOptions {
                    name
                    value
                  }
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

  const allProducts: Product[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const pageData: ShopifyProductsResponse = await shopifyFetch<ShopifyProductsResponse>({
      query,
      variables: { first: 250, after: cursor },
      cache: 'no-store',
    });

    allProducts.push(...pageData.products.edges.map((e) => e.node));
    hasNextPage = pageData.products.pageInfo.hasNextPage;
    cursor = pageData.products.pageInfo.endCursor;
  }

  const scopedProducts = includeAllProducts
    ? allProducts
    : allProducts.filter(
        (p) => !p.productType || p.productType.trim() === '' || problemTypes.includes(p.productType)
      );

  if (includeAllVendors) {
    return scopedProducts;
  }

  return scopedProducts.filter((p) => allowedVendors.has((p.vendor || '').toLowerCase()));
}

export async function getRemainingToClassifyCount(): Promise<number> {
  const allowedVendors = await loadAllowedVendors();
  const products = await fetchProductsForClassification(allowedVendors);
  return products.length;
}

async function saveProgressToDatabase(
  products: Product[],
  results: Map<string, ClassificationResult>,
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
        ${result.suggestedType || null},
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
  results: Map<string, ClassificationResult>,
  isIncremental: boolean,
  model: ClassificationModel,
  canonicalById: Map<string, string>
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = isIncremental
    ? `ai-classified-products-${model}-${timestamp}-progress.csv`
    : `ai-classified-products-${model}-${timestamp}.csv`;

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
      'cat_title',
      'cat_slug',
      'current_canonical_url',
      'proposed_canonical_url',
      'redirect_required',
      'redirect_from',
      'redirect_to',
      'tags',
      'collections',
      'model_used',
      'vision_escalated',
      'suggested_brand_handles',
    ],
  ];

  for (const product of products) {
    const result = results.get(product.id);
    if (!result) continue;
    const currentCanonical = canonicalById.get(product.id) || `/products/${product.handle}`;
    const proposedCanonical = result.proposedCanonicalUrl || currentCanonical;
    const redirectRequired = currentCanonical !== proposedCanonical ? 'yes' : 'no';

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
      result.categoryTitle || '',
      result.categorySlug || '',
      currentCanonical,
      proposedCanonical,
      redirectRequired,
      redirectRequired === 'yes' ? currentCanonical : '',
      redirectRequired === 'yes' ? proposedCanonical : '',
      product.tags.slice(0, 5).join('; '),
      product.collections.edges.slice(0, 3).map((e) => e.node.handle).join('; '),
      result.modelUsed || model,
      result.visionEscalated ? 'yes' : 'no',
      result.brandHandles?.join('; ') || '',
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
  const {
    start = 0,
    limit,
    dryRun = false,
    saveCsv = true,
    saveDb = true,
    model = 'gpt-4o',
    exportCsvInDryRun = false,
    includeAllProducts = false,
    includeAllVendors = false,
  } = options;

  const validProductTypes = loadValidProductTypes();
  const validTypeMap = new Map(
    validProductTypes.map((type) => [type.toLowerCase(), type])
  );
  const brands = await getAllPublishedBrandContent();
  const brandSeeds: BrandSeed[] = brands.map((brand) => ({
    handle: brand.handle,
    title: brand.title,
  }));
  const allowedVendors = await loadAllowedVendors();
  const allProducts = await fetchProductsForClassification(allowedVendors, {
    includeAllProducts,
    includeAllVendors,
  });

  const productsToClassify =
    limit != null ? allProducts.slice(start, start + limit) : allProducts.slice(start);
  const overrideMap = await getProductOverridesByHandles(productsToClassify.map((p) => p.handle));
  const currentCanonicalById = await getProductCanonicalUrls(
    productsToClassify.map((p) => ({
      id: p.id,
      handle: p.handle,
      productType: p.productType,
      metafield: p.metafield,
    }))
  );

  const classifier = new ProductClassifier(validProductTypes, { model, brands: brandSeeds });
  const batchSize = 50;
  const allResults = new Map<string, ClassificationResult>();
  let totalSaved = 0;
  const shouldSaveDb = saveDb && !dryRun;
  const shouldSaveCsv = saveCsv && (!dryRun || exportCsvInDryRun);

  for (let i = 0; i < productsToClassify.length; i += batchSize) {
    const batch = productsToClassify.slice(i, i + batchSize);
    const batchResults = await classifier.classifyBatch(
      batch.map((p) => ({
        id: p.id,
        handle: p.handle,
        title: p.title,
        vendor: p.vendor,
        tags: p.tags,
        collections: p.collections.edges.map((e) => e.node.handle),
        currentType: p.productType,
        description: p.description || '',
        descriptionHtml: p.descriptionHtml || '',
        productUrl: p.onlineStoreUrl || '',
        canonicalCollection: p.metafield?.value || '',
        seoTitle: p.seo?.title || '',
        seoDescription: p.seo?.description || '',
        variantTitles: p.variants.edges.map((e) => e.node.title).filter(Boolean).slice(0, 10),
        variantOptions: p.variants.edges
          .flatMap((e) => e.node.selectedOptions || [])
          .map((opt) => `${opt.name}: ${opt.value}`)
          .slice(0, 20),
        imageUrls: p.images.edges.map((e) => e.node.url).filter(Boolean).slice(0, 5),
        imageAltTexts: p.images.edges
          .map((e) => e.node.altText || '')
          .filter(Boolean)
          .slice(0, 5),
        overrideBullets: extractOverrideBullets(overrideMap.get(p.handle)?.bullet_points),
        overrideDescriptionHtml:
          pickHeadlessDescription(overrideMap.get(p.handle)) || '',
        overrideTopDescriptionHtml:
          overrideMap.get(p.handle)?.use_headless_top_description
            ? overrideMap.get(p.handle)?.top_description_html || ''
            : '',
        overrideBottomDescriptionHtml:
          overrideMap.get(p.handle)?.use_headless_bottom_description
            ? overrideMap.get(p.handle)?.bottom_description_html || ''
            : '',
      }))
    );

    for (const [id, result] of batchResults.entries()) {
      const suggestedRaw = (result?.suggestedType || '').trim();
      const suggested = validTypeMap.get(suggestedRaw.toLowerCase());
      let finalSuggested = suggested || null;

      if (!finalSuggested && Array.isArray(result?.alternativeTypes)) {
        const alt = result.alternativeTypes.find((type: string) =>
          validTypeMap.has(type.toLowerCase())
        );
        finalSuggested = alt ? validTypeMap.get(alt.toLowerCase()) || null : null;
      }

      if (!finalSuggested) {
        result.suggestedType = '';
        result.validationStatus = 'needs-review';
        result.confidence = 0;
      } else {
        result.suggestedType = finalSuggested;
      }
      if (result.suggestedType) {
        const categoryReview = await deriveCategoryReviewFields(result.suggestedType);
        result.categoryTitle = categoryReview.catTitle;
        result.categorySlug = categoryReview.catSlug;
        result.proposedCanonicalUrl = await buildProposedCanonicalUrl(
          result.suggestedType,
          pHandleFromId(productsToClassify, id),
          overrideMap
        );
      } else {
        result.categoryTitle = '';
        result.categorySlug = '';
        result.proposedCanonicalUrl = currentCanonicalById.get(id) || '';
      }
      allResults.set(id, result);
    }

    if (shouldSaveDb || shouldSaveCsv) {
      if (shouldSaveDb) {
        totalSaved += await saveProgressToDatabase(productsToClassify, allResults, true);
      }
      if (shouldSaveCsv) {
        await saveProgressToCSV(productsToClassify, allResults, true, model, currentCanonicalById);
      }
    }
  }

  if (shouldSaveDb || shouldSaveCsv) {
    if (shouldSaveDb) {
      totalSaved += await saveProgressToDatabase(productsToClassify, allResults, false);
    }
    if (shouldSaveCsv) {
      try {
        await saveProgressToCSV(productsToClassify, allResults, false, model, currentCanonicalById);
      } catch (error) {
        // Ignore CSV save errors in production (read-only filesystem)
        console.warn('⚠️  Could not save CSV (read-only filesystem):', (error as Error).message);
      }
    }
  }

  return {
    total: productsToClassify.length,
    saved: totalSaved,
    model,
  };
}

function pHandleFromId(products: Product[], id: string): string {
  return products.find((p) => p.id === id)?.handle || '';
}

function extractOverrideBullets(bullets: unknown): string[] {
  if (!Array.isArray(bullets)) return [];
  return bullets
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const text = (item as { text?: string; title?: string }).text || (item as { title?: string }).title;
        return (text || '').trim();
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 12);
}

function pickHeadlessDescription(
  override: ProductContentOverride | undefined
): string {
  if (!override) return '';
  if (override.use_headless_description && override.description_html) {
    return override.description_html;
  }
  return '';
}

async function deriveCategoryReviewFields(
  suggestedType: string
): Promise<{ catTitle: string; catSlug: string }> {
  try {
    const breadcrumbPaths = await getBreadcrumbsForProduct(suggestedType);
    if (!breadcrumbPaths || breadcrumbPaths.length === 0) {
      return { catTitle: '', catSlug: '' };
    }
    const primary = breadcrumbPaths[0]; // deepest path first
    const catTitle = primary.map((crumb) => crumb.label).join(' > ');
    const catSlug = primary[primary.length - 1]?.href || '';
    return { catTitle, catSlug };
  } catch {
    return { catTitle: '', catSlug: '' };
  }
}

async function buildProposedCanonicalUrl(
  suggestedType: string,
  productHandle: string,
  overrideMap: Map<string, ProductContentOverride>
): Promise<string> {
  const override = overrideMap.get(productHandle);
  const slugOverride = override?.use_headless_slug ? override.slug_override : null;
  const resolvedHandle = slugOverride || productHandle;
  const categoryPath = await getPrimaryCategoryPath(suggestedType);
  if (categoryPath) {
    return `${categoryPath}/${resolvedHandle}`;
  }
  return `/products/${resolvedHandle}`;
}
