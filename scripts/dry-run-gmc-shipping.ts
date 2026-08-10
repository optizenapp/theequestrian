/**
 * Dry-run: sample products → Collective cached shipping rate + canonical URL.
 *
 * Usage:
 *   npx tsx scripts/dry-run-gmc-shipping.ts
 *   npx tsx scripts/dry-run-gmc-shipping.ts --limit=25
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import {
  filterPublishedForHeadless,
  getAllProducts,
  getProductCanonicalUrls,
} from '@/lib/shopify/products';
import { getGmcBaseUrl } from '@/lib/gmc/content';
import {
  loadCollectiveShippingLookups,
  pickCollectiveRateForVariant,
  resolveGmcShippingFromCollectiveRate,
} from '@/lib/gmc/feed-shipping';

function stripGid(gid: string) {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 20) : 20;

  const baseUrl = getGmcBaseUrl();
  const allProducts = await getAllProducts();
  const products = await filterPublishedForHeadless(allProducts);
  const allVariantIds = products.flatMap((product) =>
    product.variants.edges.map(({ node }) => stripGid(node.id))
  );
  const allProductIds = products.map((product) => stripGid(product.id));
  const [urlMap, lookups] = await Promise.all([
    getProductCanonicalUrls(products),
    loadCollectiveShippingLookups({
      variantIds: allVariantIds,
      productIds: allProductIds,
    }),
  ]);

  console.log(`Products (storefront): ${allProducts.length}`);
  console.log(`Products (headless-published): ${products.length}`);
  console.log(
    `Collective cache: ${lookups.byVariant.size} variant rows / ${lookups.byProduct.size} products (${allVariantIds.length} variants)`
  );
  console.log(`Sampling first ${limit} products (first variant each)\n`);

  const rows = [];
  for (const product of products.slice(0, limit)) {
    const variant = product.variants.edges[0]?.node;
    if (!variant) continue;
    const variantId = stripGid(variant.id);
    const productId = stripGid(product.id);
    const canonicalPath = urlMap.get(product.id) ?? `/products/${product.handle}`;
    const shipping = resolveGmcShippingFromCollectiveRate({
      tags: product.tags,
      collectiveRate: pickCollectiveRateForVariant({
        lookups,
        variantId,
        productId,
      }),
    });
    rows.push({
      handle: product.handle,
      vendor: product.vendor?.trim() || '(missing)',
      variantId,
      rateAud: shipping.rateAud,
      shippingLabel: shipping.shippingLabel,
      link: `${baseUrl}${canonicalPath}?variant=${variantId}`,
    });
  }

  console.table(rows);

  const labelCounts = new Map<string, number>();
  let withRate = 0;
  let viaProductFallback = 0;
  for (const product of products) {
    const productId = stripGid(product.id);
    for (const { node: variant } of product.variants.edges) {
      const variantId = stripGid(variant.id);
      const direct = lookups.byVariant.has(variantId);
      const rate = pickCollectiveRateForVariant({ lookups, variantId, productId });
      const shipping = resolveGmcShippingFromCollectiveRate({
        tags: product.tags,
        collectiveRate: rate,
      });
      labelCounts.set(shipping.shippingLabel, (labelCounts.get(shipping.shippingLabel) || 0) + 1);
      if (shipping.rateAud !== null) {
        withRate += 1;
        if (!direct && rate) viaProductFallback += 1;
      }
    }
  }

  console.log('\nShipping label distribution (all variants):');
  console.table(
    [...labelCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([label, count]) => ({ label, count }))
  );
  console.log(`Variants with Collective rate (incl. product fallback): ${withRate}`);
  console.log(`Variants resolved via product fallback: ${viaProductFallback}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
