/**
 * Validate GMC paid-acquisition custom labels against the live catalogue.
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
import { buildGmcCustomLabels } from '../lib/gmc/custom-labels';
import { loadVariantEconomicsMap } from '../lib/gmc/variant-economics';

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
  const lines = [header, ...rowKeys.map((row) => {
    const cells = colKeys.map((col) => String(matrix[row]?.[col] || 0));
    return [row, ...cells].join(' | ');
  })];
  return lines.map((line) => `  ${line}`);
}

async function main() {
  console.log('Loading Storefront products + Admin variant economics…');
  const [allProducts, economicsMap] = await Promise.all([
    getAllProducts(),
    loadVariantEconomicsMap(),
  ]);
  const products = await filterPublishedForHeadless(allProducts);

  const label0: Dist = {};
  const label1: Dist = {};
  const label2: Dist = {};
  const label3: Dist = {};
  const label4: Dist = {};
  const marginSource: Dist = {};
  const primeByMargin: Dist = {};
  const primeByPrice: Dist = {};
  const primeByContribution: Dist = {};
  const paidXMargin: Record<string, Dist> = {
    prime: {},
    strong: {},
    test: {},
    do_not_advertise: {},
  };
  const paidXPrice: Record<string, Dist> = {
    prime: {},
    strong: {},
    test: {},
    do_not_advertise: {},
  };
  const paidXStock: Record<string, Dist> = {
    prime: {},
    strong: {},
    test: {},
    do_not_advertise: {},
  };
  const primeHighStockByMargin: Dist = {};
  const primeHighStockByPrice: Dist = {};
  const primeHighStockByContribution: Dist = {};
  const samples: Record<string, SampleRow[]> = {
    prime: [],
    strong: [],
    test: [],
    do_not_advertise: [],
  };

  let total = 0;
  let knownMargin = 0;
  const sanityErrors: string[] = [];

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

      const labels = buildGmcCustomLabels({
        sellingPriceAud: Number.isFinite(sellingPriceAud) ? sellingPriceAud : NaN,
        tags: product.tags,
        unitCostAud: economics?.unitCostAud ?? null,
        availableForSale: isAvailable,
        quantityAvailable: economics?.quantityAvailable ?? null,
        tracked: economics?.tracked ?? null,
        inventoryPolicy: economics?.inventoryPolicy ?? null,
      });

      total += 1;
      bump(label0, labels.custom_label_0);
      bump(label1, labels.custom_label_1);
      bump(label2, labels.custom_label_2);
      bump(label3, labels.custom_label_3);
      bump(label4, labels.custom_label_4);
      bump(marginSource, labels.marginSource);
      if (labels.marginPercent != null) knownMargin += 1;

      bump(paidXMargin[labels.custom_label_2], labels.custom_label_1);
      bump(paidXPrice[labels.custom_label_2], labels.custom_label_0);
      bump(paidXStock[labels.custom_label_2], labels.custom_label_3);

      if (labels.custom_label_2 === 'prime') {
        bump(primeByMargin, labels.custom_label_1);
        bump(primeByPrice, labels.custom_label_0);
        const c = labels.grossContributionAud ?? 0;
        if (c < 30) bump(primeByContribution, '20_to_30');
        else if (c < 50) bump(primeByContribution, '30_to_50');
        else bump(primeByContribution, '50_plus');

        if (labels.custom_label_3 === 'high_stock') {
          bump(primeHighStockByMargin, labels.custom_label_1);
          bump(primeHighStockByPrice, labels.custom_label_0);
          if (c < 30) bump(primeHighStockByContribution, '20_to_30');
          else if (c < 50) bump(primeHighStockByContribution, '30_to_50');
          else bump(primeHighStockByContribution, '50_plus');
        }
      }

      // Sanity checks from brief §12
      const m = labels.marginPercent;
      const c = labels.grossContributionAud;
      if (labels.custom_label_2 === 'prime') {
        if (m == null || m < 30 - 1e-9) {
          sanityErrors.push(`prime with margin ${m} id=${stripGid(variant.id)}`);
        }
        if (c == null || c < 20 - 1e-9) {
          sanityErrors.push(`prime with contrib ${c} id=${stripGid(variant.id)}`);
        }
      }
      if (labels.custom_label_2 === 'strong') {
        if (m == null || m < 20 - 1e-9) {
          sanityErrors.push(`strong with margin ${m} id=${stripGid(variant.id)}`);
        }
        if (c == null || c < 20 - 1e-9) {
          sanityErrors.push(`strong with contrib ${c} id=${stripGid(variant.id)}`);
        }
      }
      if (labels.custom_label_2 === 'test') {
        if (m == null || m < 20 - 1e-9) {
          sanityErrors.push(`test with margin ${m} id=${stripGid(variant.id)}`);
        }
        if (c == null || c < 10 - 1e-9) {
          sanityErrors.push(`test with contrib ${c} id=${stripGid(variant.id)}`);
        }
      }
      if (m == null && labels.custom_label_2 !== 'do_not_advertise') {
        sanityErrors.push(`unknown margin not DNA id=${stripGid(variant.id)}`);
      }

      const bucket = samples[labels.custom_label_2];
      if (bucket && bucket.length < 10) {
        bucket.push({
          productTitle: product.title,
          variantTitle: variant.title,
          gmcItemId: stripGid(variant.id),
          sellingPrice: sellingPriceAud,
          marginPercent: labels.marginPercent,
          marginSource: labels.marginSource,
          grossContribution: labels.grossContributionAud,
          labels,
        });
      }
    }
  }

  const lines: string[] = [];
  lines.push('# GMC Paid Acquisition Label Validation');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total GMC items processed: ${total}`);
  lines.push(
    `Margin known: ${knownMargin} (${pct(knownMargin, total)}) | unknown: ${total - knownMargin} (${pct(total - knownMargin, total)})`
  );
  lines.push('');
  lines.push('## custom_label_2 — Paid acquisition potential');
  lines.push(...formatDist(label2, paidKeys, total));
  lines.push('');
  const eligible =
    (label2.prime || 0) + (label2.strong || 0) + (label2.test || 0);
  lines.push(
    `Eligible (prime+strong+test): ${eligible} (${pct(eligible, total)})`
  );
  lines.push(`Prime count: ${label2.prime || 0}`);
  lines.push('');
  lines.push('## Cross-tab: custom_label_2 × custom_label_3 (stock)');
  const stockKeys = ['high_stock', 'low_stock'];
  for (const paid of paidKeys) {
    if (paid === 'do_not_advertise') continue;
    for (const stock of stockKeys) {
      const n = paidXStock[paid]?.[stock] || 0;
      lines.push(`  ${paid} + ${stock}: ${n} (${pct(n, total)})`);
    }
  }
  const primeHigh = paidXStock.prime?.high_stock || 0;
  lines.push('');
  lines.push(`prime + high_stock total: ${primeHigh} (${pct(primeHigh, total)} of catalogue, ${pct(primeHigh, label2.prime || 0)} of prime)`);
  lines.push('');
  lines.push('## prime + high_stock by margin band');
  lines.push(
    ...formatDist(
      primeHighStockByMargin,
      ['margin_30_39', 'margin_40_plus', 'margin_20_29', 'margin_10_19', 'margin_under_10', 'unknown'],
      primeHigh
    )
  );
  lines.push('');
  lines.push('## prime + high_stock by price tier');
  lines.push(...formatDist(primeHighStockByPrice, priceKeys, primeHigh));
  lines.push('');
  lines.push('## prime + high_stock contribution distribution');
  lines.push(
    ...formatDist(
      primeHighStockByContribution,
      ['20_to_30', '30_to_50', '50_plus'],
      primeHigh
    )
  );
  lines.push('');
  lines.push('## Prime (all stock) by margin band');
  lines.push(
    ...formatDist(
      primeByMargin,
      ['margin_30_39', 'margin_40_plus', 'margin_20_29', 'margin_10_19', 'margin_under_10', 'unknown'],
      label2.prime || 0
    )
  );
  lines.push('');
  lines.push('## Prime (all stock) by price tier');
  lines.push(...formatDist(primeByPrice, priceKeys, label2.prime || 0));
  lines.push('');
  lines.push('## Prime (all stock) contribution distribution');
  lines.push(
    ...formatDist(primeByContribution, ['20_to_30', '30_to_50', '50_plus'], label2.prime || 0)
  );
  lines.push('');
  lines.push('## Cross-tab: custom_label_2 × custom_label_1');
  lines.push(...formatMatrix(paidXMargin, paidKeys, marginKeys));
  lines.push('');
  lines.push('## Cross-tab: custom_label_2 × custom_label_0');
  lines.push(...formatMatrix(paidXPrice, paidKeys, priceKeys));
  lines.push('');
  lines.push('## custom_label_0 / 1 / 3 / 4 (unchanged rules)');
  lines.push('### label_0');
  lines.push(...formatDist(label0, priceKeys, total));
  lines.push('### label_1');
  lines.push(...formatDist(label1, marginKeys, total));
  lines.push('### label_3');
  lines.push(...formatDist(label3, ['high_stock', 'low_stock'], total));
  lines.push('### label_4');
  lines.push(...formatDist(label4, ['bestseller', 'slow_mover', 'unknown'], total));
  lines.push('');
  lines.push('## Sanity check errors');
  if (sanityErrors.length === 0) {
    lines.push('  none');
  } else {
    lines.push(`  ${sanityErrors.length} errors (showing first 20)`);
    for (const err of sanityErrors.slice(0, 20)) lines.push(`  - ${err}`);
  }
  lines.push('');

  for (const tier of paidKeys) {
    lines.push(`## Samples — ${tier}`);
    const rows = samples[tier] || [];
    if (!rows.length) {
      lines.push('_No samples_');
      lines.push('');
      continue;
    }
    for (const row of rows) {
      lines.push(`- Product: ${row.productTitle}`);
      lines.push(`  Variant: ${row.variantTitle}`);
      lines.push(`  GMC item ID: ${row.gmcItemId}`);
      lines.push(`  Price: A$${row.sellingPrice.toFixed(2)}`);
      lines.push(
        `  Margin: ${row.marginPercent == null ? 'unknown' : `${row.marginPercent.toFixed(4)}%`} (${row.marginSource})`
      );
      lines.push(
        `  Contribution: ${row.grossContribution == null ? 'n/a' : `A$${row.grossContribution.toFixed(2)}`}`
      );
      lines.push(
        `  Labels: 0=${row.labels.custom_label_0} | 1=${row.labels.custom_label_1} | 2=${row.labels.custom_label_2} | 3=${row.labels.custom_label_3} | 4=${row.labels.custom_label_4}`
      );
      lines.push('');
    }
  }

  const outDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `gmc-paid-acquisition-validation-${stamp}.md`);
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(lines.join('\n'));
  console.log(`\nWrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
