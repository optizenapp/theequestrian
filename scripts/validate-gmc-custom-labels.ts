/**
 * Validate GMC labels including Trailrace paid-demand custom_label_3.
 *
 * Usage: npx tsx --env-file=.env.local scripts/validate-gmc-custom-labels.ts
 */
import fs from 'fs';
import path from 'path';
import {
  filterPublishedForHeadless,
  getAllProducts,
} from '../lib/shopify/products';
import { getCompareAtSalePair } from '../lib/shopify/product-discount';
import { buildGmcCustomLabels, getVendorLabel } from '../lib/gmc/custom-labels';
import { loadVariantEconomicsMap } from '../lib/gmc/variant-economics';
import {
  loadTrailraceDemandIndex,
  resolveTrailracePaidDemand,
  type TrailraceMatchMethod,
  type TrailracePaidLabel,
} from '../lib/gmc/trailrace-paid-demand';

type Dist = Record<string, number>;

type SampleRow = {
  productTitle: string;
  variantTitle: string;
  gmcItemId: string;
  sellingPrice: number;
  marginPercent: number | null;
  marginSource: string;
  grossContribution: number | null;
  labels: ReturnType<typeof buildGmcCustomLabels>;
  trailraceMethod: TrailraceMatchMethod;
};

type ReviewRow = {
  equestrian_id: string;
  equestrian_title: string;
  trailrace_candidate_id: string;
  trailrace_candidate_title: string;
  match_method: string;
  match_confidence: string;
  trailrace_paid_label: string;
  reason_for_review: string;
};

function stripGid(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

function bump(dist: Dist, key: string) {
  dist[key] = (dist[key] || 0) + 1;
}

function pct(n: number, total: number): string {
  if (!total) return '0.0%';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function formatDist(dist: Dist, keys: string[], total: number): string[] {
  return keys.map((key) => {
    const count = dist[key] || 0;
    return `  ${key}: ${count} (${pct(count, total)})`;
  });
}

function formatMatrix(
  matrix: Record<string, Dist>,
  rowKeys: string[],
  colKeys: string[]
): string[] {
  const header = ['Paid label', ...colKeys].join(' | ');
  const lines = [
    header,
    ...rowKeys.map((row) => {
      const cells = colKeys.map((col) => String(matrix[row]?.[col] || 0));
      return [row, ...cells].join(' | ');
    }),
  ];
  return lines.map((line) => `  ${line}`);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function main() {
  console.log('Loading Storefront products + Admin economics + Trailrace demand…');
  const [allProducts, economicsMap, trailraceDemand] = await Promise.all([
    getAllProducts(),
    loadVariantEconomicsMap(),
    Promise.resolve(loadTrailraceDemandIndex()),
  ]);
  const products = await filterPublishedForHeadless(allProducts);

  const label0: Dist = {};
  const label1: Dist = {};
  const label2: Dist = {};
  const label3: Dist = {};
  const label4: Dist = {};
  const matchMethods: Dist = {};
  const paidXDemand: Record<string, Dist> = {
    prime: {},
    strong: {},
    test: {},
    do_not_advertise: {},
  };
  const paidXVendor: Record<string, Dist> = {
    prime: {},
    strong: {},
    test: {},
    do_not_advertise: {},
  };
  const samples: Record<string, SampleRow[]> = {
    prime: [],
    strong: [],
    test: [],
    do_not_advertise: [],
  };
  const reviewRows: ReviewRow[] = [];
  const spotCheck: SampleRow[] = [];
  const coreByVendor: Dist = {};

  let total = 0;
  let knownMargin = 0;
  let matched = 0;
  let corePool = 0;
  const sanityErrors: string[] = [];
  const validDemand = new Set<TrailracePaidLabel>([
    'tr_a',
    'tr_b',
    'tr_c',
    'tr_none',
    'tr_unmatched',
  ]);

  const marginKeys = [
    'margin_under_10',
    'margin_10_19',
    'margin_20_29',
    'margin_30_39',
    'margin_40_plus',
    'unknown',
  ];
  const priceKeys = ['under_50', '50_to_100', '100_to_150', '150_to_300', '300_plus'];
  const paidKeys = ['prime', 'strong', 'test', 'do_not_advertise'];
  const demandKeys = ['tr_a', 'tr_b', 'tr_c', 'tr_none', 'tr_unmatched'];

  for (const product of products) {
    for (const { node: variant } of product.variants.edges) {
      const imageUrl =
        variant.image?.url || product.images.edges[0]?.node.url || null;
      if (!imageUrl) continue;

      const compareAtAmount =
        variant.compareAtPrice?.amount ||
        product.compareAtPriceRange?.minVariantPrice?.amount;
      const salePair = getCompareAtSalePair(variant.price.amount, compareAtAmount);
      const sellingPriceAud = Number(salePair?.saleAmount ?? variant.price.amount);
      const economics = economicsMap.get(stripGid(variant.id));
      const isAvailable = product.availableForSale && variant.availableForSale;
      const variantId = stripGid(variant.id);

      const trailraceMatch = resolveTrailracePaidDemand(trailraceDemand, {
        marketplaceVariantId: variantId,
        sku: variant.sku,
        vendor: product.vendor,
        productTitle: product.title,
        variantTitle: variant.title,
        selectedOptions: variant.selectedOptions,
      });

      const labels = buildGmcCustomLabels({
        sellingPriceAud: Number.isFinite(sellingPriceAud) ? sellingPriceAud : NaN,
        tags: product.tags,
        vendor: product.vendor,
        unitCostAud: economics?.unitCostAud ?? null,
        availableForSale: isAvailable,
        quantityAvailable: economics?.quantityAvailable ?? null,
        tracked: economics?.tracked ?? null,
        inventoryPolicy: economics?.inventoryPolicy ?? null,
        trailracePaidLabel: trailraceMatch.label,
      });

      total += 1;
      bump(label0, labels.custom_label_0);
      bump(label1, labels.custom_label_1);
      bump(label2, labels.custom_label_2);
      bump(label3, labels.custom_label_3);
      bump(label4, labels.custom_label_4);
      bump(matchMethods, trailraceMatch.method);
      if (labels.marginPercent != null) knownMargin += 1;
      if (trailraceMatch.label !== 'tr_unmatched') matched += 1;

      bump(paidXDemand[labels.custom_label_2], labels.custom_label_3);
      bump(paidXVendor[labels.custom_label_2], labels.custom_label_4);

      if (
        (labels.custom_label_2 === 'prime' || labels.custom_label_2 === 'strong') &&
        (labels.custom_label_3 === 'tr_a' || labels.custom_label_3 === 'tr_b')
      ) {
        corePool += 1;
        bump(coreByVendor, labels.custom_label_4);
      }

      if (!validDemand.has(labels.custom_label_3)) {
        sanityErrors.push(
          `invalid custom_label_3=${labels.custom_label_3} id=${variantId}`
        );
      }
      if (labels.custom_label_4 !== getVendorLabel(product.vendor)) {
        sanityErrors.push(`vendor label mismatch id=${variantId}`);
      }
      if (trailraceMatch.confidence === 'ambiguous') {
        reviewRows.push({
          equestrian_id: variantId,
          equestrian_title: `${product.title} ${variant.title}`.trim(),
          trailrace_candidate_id: trailraceMatch.trailraceItemId ?? '',
          trailrace_candidate_title: trailraceMatch.trailraceTitle ?? '',
          match_method: trailraceMatch.method,
          match_confidence: trailraceMatch.confidence,
          trailrace_paid_label: trailraceMatch.label,
          reason_for_review: trailraceMatch.reviewReason ?? 'ambiguous',
        });
      }

      if (
        (labels.custom_label_3 === 'tr_a' || labels.custom_label_3 === 'tr_b') &&
        spotCheck.length < 25
      ) {
        spotCheck.push({
          productTitle: product.title,
          variantTitle: variant.title,
          gmcItemId: variantId,
          sellingPrice: sellingPriceAud,
          marginPercent: labels.marginPercent,
          marginSource: labels.marginSource,
          grossContribution: labels.grossContributionAud,
          labels,
          trailraceMethod: trailraceMatch.method,
        });
      }

      const bucket = samples[labels.custom_label_2];
      if (bucket && bucket.length < 8) {
        bucket.push({
          productTitle: product.title,
          variantTitle: variant.title,
          gmcItemId: variantId,
          sellingPrice: sellingPriceAud,
          marginPercent: labels.marginPercent,
          marginSource: labels.marginSource,
          grossContribution: labels.grossContributionAud,
          labels,
          trailraceMethod: trailraceMatch.method,
        });
      }
    }
  }

  const lines: string[] = [];
  lines.push('# GMC Label Validation (Trailrace demand)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total GMC items processed: ${total}`);
  lines.push(
    `Margin known: ${knownMargin} (${pct(knownMargin, total)}) | unknown: ${total - knownMargin} (${pct(total - knownMargin, total)})`
  );
  lines.push(`Trailrace source period: ${trailraceDemand.sourcePeriod}`);
  lines.push('');
  lines.push('## Matching');
  lines.push(`  matched (not tr_unmatched): ${matched} (${pct(matched, total)})`);
  lines.push(`  unmatched: ${total - matched} (${pct(total - matched, total)})`);
  lines.push('  match method counts:');
  for (const method of [
    'variant_map',
    'sku',
    'normalized_title',
    'trailrace_presence',
    'none',
  ]) {
    lines.push(`    ${method}: ${matchMethods[method] || 0}`);
  }
  lines.push('');
  lines.push('## custom_label_3 — Trailrace paid demand');
  lines.push(...formatDist(label3, demandKeys, total));
  lines.push('');
  lines.push('## Cross-tab: custom_label_2 × custom_label_3');
  lines.push(...formatMatrix(paidXDemand, paidKeys, demandKeys));
  lines.push('');
  const pairs: Array<[string, string]> = [
    ['prime', 'tr_a'],
    ['prime', 'tr_b'],
    ['strong', 'tr_a'],
    ['strong', 'tr_b'],
    ['test', 'tr_a'],
    ['test', 'tr_b'],
  ];
  for (const [paid, demand] of pairs) {
    const n = paidXDemand[paid]?.[demand] || 0;
    lines.push(`  ${paid} + ${demand}: ${n} (${pct(n, total)})`);
  }
  lines.push('');
  lines.push(
    `Core pool (prime|strong ∩ tr_a|tr_b): ${corePool} (${pct(corePool, total)})`
  );
  lines.push('');
  lines.push('## Core pool × custom_label_4 (vendor)');
  const vendorKeys = Object.keys(coreByVendor).sort(
    (a, b) => (coreByVendor[b] || 0) - (coreByVendor[a] || 0)
  );
  lines.push(...formatDist(coreByVendor, vendorKeys, corePool || 1));
  lines.push('');
  lines.push('## custom_label_2');
  lines.push(...formatDist(label2, paidKeys, total));
  lines.push('');
  lines.push('## Sanity check errors');
  if (sanityErrors.length === 0) lines.push('  none');
  else {
    lines.push(`  ${sanityErrors.length} errors (showing first 20)`);
    for (const err of sanityErrors.slice(0, 20)) lines.push(`  - ${err}`);
  }
  lines.push('');
  lines.push('## Spot-check A/B matches');
  for (const row of spotCheck.slice(0, 20)) {
    lines.push(
      `- ${row.productTitle} / ${row.variantTitle} → ${row.labels.custom_label_3} (${row.trailraceMethod}) | paid=${row.labels.custom_label_2} vendor=${row.labels.custom_label_4}`
    );
  }
  lines.push('');

  const outDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `gmc-trailrace-demand-validation-${stamp}.md`);
  fs.writeFileSync(outPath, lines.join('\n'));

  const reviewPath = path.join(outDir, `gmc-trailrace-demand-review-${stamp}.csv`);
  const reviewHeader = [
    'equestrian_id',
    'equestrian_title',
    'trailrace_candidate_id',
    'trailrace_candidate_title',
    'match_method',
    'match_confidence',
    'trailrace_paid_label',
    'reason_for_review',
  ];
  const reviewCsv = [
    reviewHeader.join(','),
    ...reviewRows.map((row) =>
      reviewHeader.map((key) => csvEscape(String(row[key as keyof ReviewRow]))).join(',')
    ),
  ].join('\n');
  fs.writeFileSync(reviewPath, reviewCsv);

  console.log(lines.join('\n'));
  console.log(`\nWrote ${outPath}`);
  console.log(`Wrote ${reviewPath} (${reviewRows.length} ambiguous rows)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
