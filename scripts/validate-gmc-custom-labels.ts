/**
 * Validate rebuilt GMC custom labels against live catalogue economics.
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
  const samples: Record<string, SampleRow[]> = {
    tier_1: [],
    tier_2: [],
    tier_3: [],
    do_not_advertise: [],
  };

  let total = 0;
  let knownMargin = 0;

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

      const bucket = samples[labels.custom_label_2];
      if (bucket && bucket.length < 12) {
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
  lines.push('# GMC Custom Label Validation Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total GMC items processed: ${total}`);
  lines.push(
    `Margin known: ${knownMargin} (${pct(knownMargin, total)}) | unknown: ${total - knownMargin} (${pct(total - knownMargin, total)})`
  );
  lines.push('');
  lines.push('## Margin source audit');
  lines.push('- Primary: Shopify Admin `ProductVariant.inventoryItem.unitCost` (variant-level)');
  lines.push('- Override: product tag `margin:<number>` / `margin:<number>%` (product-level) when present');
  lines.push('- Ignored: qualitative `margin:high|medium|low` (not exact %)');
  lines.push('- Formula: margin% = (selling_price − unit_cost) / selling_price × 100');
  lines.push('- Selling price: GMC advertised price (sale_price when present)');
  lines.push('- Profitability uses exact margin%, never the custom_label_1 band midpoint');
  lines.push('- Unknown margin → custom_label_1=unknown, custom_label_2=do_not_advertise');
  lines.push('- do_not_advertise items remain in the feed');
  lines.push('');
  lines.push('### Source distribution');
  lines.push(...formatDist(marginSource, ['unit_cost', 'tag', 'unknown'], total));
  lines.push('');
  lines.push('## custom_label_0 (price tier)');
  lines.push(
    ...formatDist(label0, ['under_50', '50_to_100', '100_to_150', '150_to_300', '300_plus'], total)
  );
  lines.push('');
  lines.push('## custom_label_1 (margin range)');
  lines.push(
    ...formatDist(
      label1,
      [
        'margin_under_10',
        'margin_10_19',
        'margin_20_29',
        'margin_30_39',
        'margin_40_plus',
        'unknown',
      ],
      total
    )
  );
  if ((label1.unknown || 0) / total > 0.2) {
    lines.push('');
    lines.push(
      `⚠️ Flag: unknown margin is ${pct(label1.unknown || 0, total)} (>20%). Check cost coverage.`
    );
  }
  lines.push('');
  lines.push('## custom_label_2 (profitability)');
  lines.push(
    ...formatDist(label2, ['tier_1', 'tier_2', 'tier_3', 'do_not_advertise'], total)
  );
  lines.push('');
  lines.push('## custom_label_3 (stock pressure)');
  lines.push(...formatDist(label3, ['high_stock', 'low_stock'], total));
  lines.push('');
  lines.push('## custom_label_4 (performance)');
  lines.push(...formatDist(label4, ['bestseller', 'slow_mover', 'unknown'], total));
  lines.push('');

  for (const tier of ['tier_1', 'tier_2', 'tier_3', 'do_not_advertise']) {
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
        `  Margin: ${row.marginPercent == null ? 'unknown' : `${row.marginPercent.toFixed(2)}%`} (${row.marginSource})`
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
  const outPath = path.join(outDir, `gmc-custom-labels-validation-${stamp}.md`);
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(lines.join('\n'));
  console.log(`\nWrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
