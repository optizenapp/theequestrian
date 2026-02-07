/**
 * GMC Feed Audit Script
 *
 * Usage:
 *  tsx scripts/audit-gmc-feed.ts --feed exports/gmc-feed-latest.xml --previous exports/gmc-feed-YYYYMMDD-HHMMSS.xml --diagnostics reports/gmc-diagnostics.json
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import fs from 'fs';
import path from 'path';
import { getAllProducts, getProductCanonicalUrls } from '../lib/shopify/products';

type FeedItem = {
  id: string;
  itemGroupId: string | null;
  link: string | null;
  imageLink: string | null;
  title: string | null;
};

type Violation = {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  issue: string;
  count: number;
  sample?: string[];
  recommendation: string;
};

type DiagnosticsSummary = {
  imageMismatch?: number;
  duplicateProducts?: number;
  landingPageMismatch?: number;
  structuredDataMismatch?: number;
  invalidGtin?: number;
};

const REQUIRED_ATTRIBUTES = [
  'color',
  'size',
  'gender',
  'age_group',
  'material',
  'pattern',
  'brand',
  'gtin_or_mpn',
];

function getBaseUrl(): string {
  const baseUrl = process.env.GMC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com';
  return baseUrl.replace(/\/+$/, '');
}

function timestampLabel(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function stripGid(gid: string) {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

function getVariantOption(variant: { selectedOptions?: Array<{ name: string; value: string }> }, optionName: string) {
  const match = variant.selectedOptions?.find((option) => option.name.toLowerCase() === optionName.toLowerCase());
  return match?.value ?? null;
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function findColorSpecificImage(
  images: Array<{ node: { url: string; altText: string | null } }>,
  color: string | null
): string | null {
  if (!color) return null;
  const token = normalizeToken(color);
  const match = images.find(({ node }) => {
    const alt = node.altText ? normalizeToken(node.altText) : '';
    const url = normalizeToken(node.url);
    return alt.includes(token) || url.includes(token);
  });
  return match?.node.url ?? null;
}

function parseFeedItems(xml: string): FeedItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return itemBlocks.map((block) => {
    const extract = (tag: string) => {
      const match = block.match(new RegExp(`<g:${tag}>([\\s\\S]*?)<\\/g:${tag}>`));
      return match?.[1]?.trim() ?? null;
    };
    return {
      id: extract('id') ?? '',
      itemGroupId: extract('item_group_id'),
      link: extract('link'),
      imageLink: extract('image_link'),
      title: extract('title'),
    };
  });
}

function parseArgs(args: string[]) {
  const map = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const value = args[i];
    if (value.startsWith('--')) {
      const key = value.replace(/^--/, '');
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        map.set(key, next);
        i += 1;
      } else {
        map.set(key, 'true');
      }
    }
  }
  return map;
}

function listSnapshotFiles() {
  const exportsDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) return [];
  return fs.readdirSync(exportsDir)
    .filter((file) => file.startsWith('gmc-feed-') && file.endsWith('.xml'))
    .map((file) => path.join(exportsDir, file))
    .sort();
}

async function fetchFeedXml(feedUrl: string) {
  const response = await fetch(feedUrl);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch GMC feed (${response.status}): ${errorText}`);
  }
  return response.text();
}

function writeSnapshot(xml: string) {
  const outputDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const stamp = timestampLabel();
  const snapshotPath = path.join(outputDir, `gmc-feed-${stamp}.xml`);
  const latestPath = path.join(outputDir, 'gmc-feed-latest.xml');
  fs.writeFileSync(snapshotPath, xml);
  fs.writeFileSync(latestPath, xml);
  return { snapshotPath, latestPath };
}

function loadDiagnostics(pathValue?: string): DiagnosticsSummary | null {
  if (!pathValue) return null;
  if (!fs.existsSync(pathValue)) {
    console.warn(`⚠️ Diagnostics file not found: ${pathValue}`);
    return null;
  }
  const raw = fs.readFileSync(pathValue, 'utf8');
  try {
    const data = JSON.parse(raw) as DiagnosticsSummary;
    return data;
  } catch {
    console.warn('⚠️ Diagnostics file is not valid JSON. Skipping diagnostics parsing.');
    return null;
  }
}

function buildTitle(parts: Array<string | null>) {
  return parts.filter((value) => value && value.trim()).join(' ');
}

async function auditFeed() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = getBaseUrl();
  const feedUrl = `${baseUrl}/api/feeds/gmc`;

  let feedPath = args.get('feed') ?? null;
  let feedXml: string;

  if (feedPath && fs.existsSync(feedPath)) {
    feedXml = fs.readFileSync(feedPath, 'utf8');
  } else {
    console.log(`📡 Fetching feed from ${feedUrl}`);
    feedXml = await fetchFeedXml(feedUrl);
    const snapshot = writeSnapshot(feedXml);
    feedPath = snapshot.snapshotPath;
  }

  const items = parseFeedItems(feedXml);
  const itemById = new Map(items.map((item) => [item.id, item]));

  const diagnostics = loadDiagnostics(args.get('diagnostics') ?? undefined);

  const products = await getAllProducts();
  const urlMap = await getProductCanonicalUrls(products);

  const violations: Violation[] = [];
  const imageMismatches: string[] = [];
  const missingVariantLinks: string[] = [];
  const titleMissingParts: string[] = [];

  let totalVariants = 0;
  let variantImagesWithMismatch = 0;

  for (const product of products) {
    const productId = stripGid(product.id);
    const canonicalPath = urlMap.get(product.id) ?? `/products/${product.handle}`;
    const productUrl = `${baseUrl}${canonicalPath}`;
    const productImage = product.images.edges[0]?.node.url ?? null;

    for (const { node: variant } of product.variants.edges) {
      totalVariants += 1;
      const variantId = stripGid(variant.id);
      const feedItem = itemById.get(variantId);

      if (!feedItem) {
        continue;
      }

      if (!feedItem.itemGroupId || feedItem.itemGroupId !== productId) {
        violations.push({
          severity: 'Critical',
          issue: 'Variant grouping mismatch (item_group_id)',
          count: 1,
          sample: [`variant_id=${variantId}, item_group_id=${feedItem.itemGroupId ?? 'missing'}, expected=${productId}`],
          recommendation: 'Ensure every variant shares the same item_group_id equal to the parent product ID.',
        });
      }

      const color = getVariantOption(variant, 'color');
      const size = getVariantOption(variant, 'size');
      const variantImage = variant.image?.url ?? null;
      const colorFallbackImage = findColorSpecificImage(product.images.edges, color);
      const expectedImage = variantImage || colorFallbackImage || productImage;

      if (variantImage && feedItem.imageLink && expectedImage && feedItem.imageLink !== expectedImage) {
        variantImagesWithMismatch += 1;
        if (imageMismatches.length < 10) {
          imageMismatches.push(`variant_id=${variantId}, feed_image=${feedItem.imageLink}, expected=${expectedImage}`);
        }
      }

      const expectedLink = `${productUrl}?variant=${variantId}`;
      if (feedItem.link && feedItem.link !== expectedLink) {
        if (missingVariantLinks.length < 10) {
          missingVariantLinks.push(`variant_id=${variantId}, feed_link=${feedItem.link}, expected=${expectedLink}`);
        }
      }

      const expectedTitle = buildTitle([
        product.vendor || null,
        product.title,
        color,
        size,
      ]);
      if (feedItem.title && expectedTitle) {
        const feedTitleLower = feedItem.title.toLowerCase();
        const missingPieces: string[] = [];
        if (product.vendor && !feedTitleLower.includes(product.vendor.toLowerCase())) {
          missingPieces.push('brand');
        }
        if (color && !feedTitleLower.includes(color.toLowerCase())) {
          missingPieces.push('color');
        }
        if (size && !feedTitleLower.includes(size.toLowerCase())) {
          missingPieces.push('size');
        }
        if (missingPieces.length > 0 && titleMissingParts.length < 10) {
          titleMissingParts.push(`variant_id=${variantId}, missing=${missingPieces.join('+')}`);
        }
      }
    }
  }

  if (missingVariantLinks.length > 0) {
    violations.push({
      severity: 'High',
      issue: 'Variant deep links missing ?variant=ID',
      count: missingVariantLinks.length,
      sample: missingVariantLinks,
      recommendation: 'Update feed link to include ?variant=VARIANT_ID for each variant.',
    });
  }

  if (variantImagesWithMismatch > 0) {
    violations.push({
      severity: 'Critical',
      issue: 'Variant image mismatches (uses non-variant image)',
      count: variantImagesWithMismatch,
      sample: imageMismatches,
      recommendation: 'Use variant image when available, otherwise use a color-matched image.',
    });
  }

  if (titleMissingParts.length > 0) {
    violations.push({
      severity: 'Medium',
      issue: 'Title missing brand/color/size components',
      count: titleMissingParts.length,
      sample: titleMissingParts,
      recommendation: 'Use deterministic title: Brand + Title + Color + Size (+ Material if available).',
    });
  }

  const attributeCoverageMissing = REQUIRED_ATTRIBUTES.filter((attr) => {
    if (attr === 'brand') {
      return !feedXml.includes('<g:brand>');
    }
    if (attr === 'color') {
      return !feedXml.includes('<g:color>');
    }
    if (attr === 'size') {
      return !feedXml.includes('<g:size>');
    }
    if (attr === 'gtin_or_mpn') {
      return !feedXml.includes('<g:gtin>') && !feedXml.includes('<g:mpn>');
    }
    return !feedXml.includes(`<g:${attr}>`);
  });

  if (attributeCoverageMissing.length > 0) {
    violations.push({
      severity: 'Medium',
      issue: 'Required attribute coverage missing',
      count: attributeCoverageMissing.length,
      sample: [attributeCoverageMissing.join(', ')],
      recommendation: 'Populate required attributes per category where applicable.',
    });
  }

  const customLabelMissing = ['custom_label_0', 'custom_label_1', 'custom_label_2', 'custom_label_3', 'custom_label_4']
    .filter((label) => !feedXml.includes(`<g:${label}>`));
  if (customLabelMissing.length > 0) {
    violations.push({
      severity: 'Low',
      issue: 'Custom labels missing for paid ads segmentation',
      count: customLabelMissing.length,
      sample: [customLabelMissing.join(', ')],
      recommendation: 'Populate custom_label_0..4 with pricing, margin, seasonality, stock, and performance buckets.',
    });
  }

  if (!feedXml.includes('<g:google_product_category>')) {
    violations.push({
      severity: 'Medium',
      issue: 'Google product category missing',
      count: 1,
      recommendation: 'Map product types to Google taxonomy IDs and include <g:google_product_category>.',
    });
  }

  if (feedXml.includes('<g:identifier_exists>false</g:identifier_exists>') && !feedXml.includes('<g:gtin>')) {
    violations.push({
      severity: 'Medium',
      issue: 'GTIN/MPN not provided (identifier_exists=false)',
      count: 1,
      recommendation: 'Provide GTIN/MPN when available and validate checksum.',
    });
  }

  const previousPath = args.get('previous') ?? null;
  let idChurnSummary = 'Not checked (no previous snapshot provided).';
  if (previousPath && fs.existsSync(previousPath)) {
    const previousXml = fs.readFileSync(previousPath, 'utf8');
    const previousIds = new Set(parseFeedItems(previousXml).map((item) => item.id));
    const currentIds = new Set(items.map((item) => item.id));
    const newIds = [...currentIds].filter((id) => !previousIds.has(id));
    const missingIds = [...previousIds].filter((id) => !currentIds.has(id));
    idChurnSummary = `New IDs: ${newIds.length}, Missing IDs: ${missingIds.length}`;

    if (newIds.length > 0 || missingIds.length > 0) {
      violations.push({
        severity: 'High',
        issue: 'ID stability check detected churn',
        count: newIds.length + missingIds.length,
        sample: [
          `new_ids=${newIds.slice(0, 5).join(', ') || 'none'}`,
          `missing_ids=${missingIds.slice(0, 5).join(', ') || 'none'}`,
        ],
        recommendation: 'Ensure variant IDs are deterministic and stable across refreshes.',
      });
    }
  }

  const sampleFamily = products.find((product) => product.variants.edges.length >= 2);
  const sampleRows: string[] = [];
  if (sampleFamily) {
    const productId = stripGid(sampleFamily.id);
    const canonicalPath = urlMap.get(sampleFamily.id) ?? `/products/${sampleFamily.handle}`;
    const productUrl = `${baseUrl}${canonicalPath}`;

    sampleFamily.variants.edges.slice(0, 2).forEach(({ node: variant }) => {
      const variantId = stripGid(variant.id);
      const color = getVariantOption(variant, 'color');
      const size = getVariantOption(variant, 'size');
      const title = buildTitle([sampleFamily.vendor || null, sampleFamily.title, color, size]);
      const image = variant.image?.url || sampleFamily.images.edges[0]?.node.url || '';
      const link = `${productUrl}?variant=${variantId}`;

      sampleRows.push([
        variantId,
        productId,
        title,
        link,
        image,
        color ?? '',
        size ?? '',
        '',
        sampleFamily.vendor ?? '',
        '',
        'custom_label_0..4',
        variant.price.amount,
        variant.availableForSale ? 'in_stock' : 'out_of_stock',
      ].join(' | '));
    });
  }

  const hasCritical = violations.some((v) => v.severity === 'Critical');
  const hasHigh = violations.some((v) => v.severity === 'High');
  const overallStatus = hasCritical || hasHigh ? 'FAIL' : 'PASS';

  const reportLines: string[] = [];
  reportLines.push(`# GMC Feed Audit Report`);
  reportLines.push('');
  reportLines.push(`- Status: **${overallStatus}**`);
  reportLines.push(`- Feed snapshot: ${feedPath ?? 'N/A'}`);
  reportLines.push(`- Previous snapshot: ${previousPath ?? 'N/A'}`);
  reportLines.push(`- Diagnostics: ${args.get('diagnostics') ?? 'N/A'}`);
  reportLines.push(`- Total variants scanned: ${totalVariants}`);
  reportLines.push('');

  reportLines.push('## Phase 1 — Critical Compliance Audit');
  reportLines.push(`- Variant grouping: ${violations.some((v) => v.issue.includes('Variant grouping')) ? 'Issues found' : 'No issues detected'}`);
  reportLines.push(`- Variant images: ${variantImagesWithMismatch > 0 ? 'Issues found' : 'No issues detected'}`);
  reportLines.push(`- Variant deep links: ${missingVariantLinks.length > 0 ? 'Issues found' : 'No issues detected'}`);
  reportLines.push(`- ID stability: ${idChurnSummary}`);
  reportLines.push('');

  reportLines.push('## Phase 2 — GMC Diagnostics Scan');
  if (diagnostics) {
    reportLines.push(`- Image mismatch: ${diagnostics.imageMismatch ?? 0}`);
    reportLines.push(`- Duplicate product warnings: ${diagnostics.duplicateProducts ?? 0}`);
    reportLines.push(`- Landing page mismatch: ${diagnostics.landingPageMismatch ?? 0}`);
    reportLines.push(`- Structured data mismatch: ${diagnostics.structuredDataMismatch ?? 0}`);
    reportLines.push(`- Invalid GTIN errors: ${diagnostics.invalidGtin ?? 0}`);
  } else {
    reportLines.push('- Diagnostics not provided.');
  }
  reportLines.push('');

  reportLines.push('## Phase 3 — Free Listings Optimisation');
  reportLines.push(`- Title construction: ${titleMissingParts.length > 0 ? 'Missing components detected' : 'No issues detected'}`);
  reportLines.push(`- Google product category mapping: ${feedXml.includes('<g:google_product_category>') ? 'Present' : 'Missing'}`);
  reportLines.push(`- Required attribute coverage: ${attributeCoverageMissing.length > 0 ? `Missing (${attributeCoverageMissing.join(', ')})` : 'OK'}`);
  reportLines.push('');

  reportLines.push('## Phase 4 — Paid Ads Performance Levers');
  reportLines.push(`- Custom labels: ${customLabelMissing.length > 0 ? 'Missing' : 'Present'}`);
  reportLines.push(`- GTIN validation: ${feedXml.includes('<g:gtin>') ? 'Present' : 'Missing'}`);
  reportLines.push('');

  reportLines.push('## Phase 5 — Feed Sampling Audit');
  if (sampleRows.length > 0) {
    reportLines.push('Fields: id | item_group_id | title | link | image_link | color | size | material | brand | gtin | custom_labels | price | availability');
    reportLines.push(...sampleRows.map((row) => `- ${row}`));
  } else {
    reportLines.push('- No sample family found with 2+ variants.');
  }
  reportLines.push('');

  reportLines.push('## Phase 6 — Technical Source Verification');
  reportLines.push('- Feed generation method: `app/api/feeds/gmc` (dynamic XML via Storefront API)');
  reportLines.push('- ID source: Shopify GIDs (numeric tail stripped)');
  reportLines.push('- Update frequency: Cache-Control 15 minutes; GMC scheduled fetch configured in `lib/gmc/content.ts` (03:00 Australia/Sydney)');
  reportLines.push('');

  reportLines.push('## Violations');
  if (violations.length === 0) {
    reportLines.push('- None');
  } else {
    violations.forEach((violation) => {
      reportLines.push(`- [${violation.severity}] ${violation.issue} (count: ${violation.count})`);
      if (violation.sample && violation.sample.length > 0) {
        reportLines.push(`  Samples: ${violation.sample.join(' | ')}`);
      }
      reportLines.push(`  Fix: ${violation.recommendation}`);
    });
  }
  reportLines.push('');

  reportLines.push('## Sample Corrected Field Values');
  if (sampleFamily) {
    const variant = sampleFamily.variants.edges[0]?.node;
    if (variant) {
      const variantId = stripGid(variant.id);
      const color = getVariantOption(variant, 'color');
      const size = getVariantOption(variant, 'size');
      const canonicalPath = urlMap.get(sampleFamily.id) ?? `/products/${sampleFamily.handle}`;
      const productUrl = `${baseUrl}${canonicalPath}`;
      const corrected = {
        id: variantId,
        item_group_id: stripGid(sampleFamily.id),
        title: buildTitle([sampleFamily.vendor || null, sampleFamily.title, color, size]),
        link: `${productUrl}?variant=${variantId}`,
        image_link: variant.image?.url || findColorSpecificImage(sampleFamily.images.edges, color) || sampleFamily.images.edges[0]?.node.url || '',
      };
      reportLines.push(`- id: ${corrected.id}`);
      reportLines.push(`- item_group_id: ${corrected.item_group_id}`);
      reportLines.push(`- title: ${corrected.title}`);
      reportLines.push(`- link: ${corrected.link}`);
      reportLines.push(`- image_link: ${corrected.image_link}`);
    }
  } else {
    reportLines.push('- No sample available.');
  }

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, `gmc-feed-audit-${timestampLabel()}.md`);
  fs.writeFileSync(reportPath, reportLines.join('\n'));

  console.log(`\n✅ Audit complete: ${reportPath}`);
}

if (require.main === module) {
  auditFeed().catch((error) => {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  });
}

export { auditFeed };
