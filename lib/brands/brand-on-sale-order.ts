import { unstable_cache } from 'next/cache';
import { sql } from '@/lib/db/client';
import { BRAND_ON_SALE_RANK_REVALIDATE_SECONDS } from '@/lib/config/route-revalidate';
import { getLiveStatusByProductIds } from '@/lib/products/postgres-adapter';
import { hasRealCompareAtDiscount } from '@/lib/shopify/product-discount';

/** Storefront `nodes(ids:)` ceiling per request. */
const LIVE_STATUS_CHUNK = 250;

/** Upper bound on IDs ranked per request — keeps Storefront fan-out to 4 calls. */
export const BRAND_ON_SALE_RANK_LIMIT = 1000;

type RankResult = { ids: string[]; complete: boolean };

/**
 * Stable-partitions product IDs so real compare-at discounts come first,
 * in-stock before out-of-stock inside each group. Neon has no prices, so
 * sale status comes from live Storefront data. IDs whose status chunk fails
 * keep their original position in the non-sale group and `complete` is false.
 */
export async function orderProductIdsOnSaleFirst(ids: string[]): Promise<RankResult> {
  const onSaleInStock: string[] = [];
  const onSaleOutOfStock: string[] = [];
  const rest: string[] = [];
  let complete = true;

  for (let i = 0; i < ids.length; i += LIVE_STATUS_CHUNK) {
    const chunk = ids.slice(i, i + LIVE_STATUS_CHUNK);
    const { ok, map } = await getLiveStatusByProductIds(chunk);
    if (!ok) complete = false;
    for (const id of chunk) {
      const live = ok ? map.get(id) : undefined;
      const onSale =
        live !== undefined &&
        hasRealCompareAtDiscount({
          priceRange: { minVariantPrice: { amount: live.price } },
          compareAtPriceRange: { minVariantPrice: { amount: live.compareAtPrice } },
        });
      if (!onSale) rest.push(id);
      else if (live.available) onSaleInStock.push(id);
      else onSaleOutOfStock.push(id);
    }
  }

  return { ids: [...onSaleInStock, ...onSaleOutOfStock, ...rest], complete };
}

async function queryRankedIds(whereClause: string): Promise<RankResult> {
  const rows = (await sql.unsafe(`
    SELECT p.id
    FROM products p
    WHERE ${whereClause}
    ORDER BY p.available_for_sale DESC, p.shopify_created_at DESC NULLS LAST, p.updated_at DESC
    LIMIT ${BRAND_ON_SALE_RANK_LIMIT}
  `)) as unknown as Array<{ id: string }>;
  return orderProductIdsOnSaleFirst(rows.map((r) => r.id));
}

/**
 * Brand product IDs matching `whereClause` (default brand order), ranked sale-first.
 * Cached per brand + filters; a ranking built during a Storefront outage is
 * served once but never cached.
 */
export async function rankBrandProductIdsOnSaleFirst(
  brandHandle: string,
  whereClause: string
): Promise<string[]> {
  const partial: { ids: string[] | null } = { ids: null };
  try {
    return await unstable_cache(
      async () => {
        const result = await queryRankedIds(whereClause);
        if (!result.complete) {
          partial.ids = result.ids;
          throw new Error('incomplete Storefront live status');
        }
        return result.ids;
      },
      ['brand-on-sale-rank', brandHandle, whereClause],
      { revalidate: BRAND_ON_SALE_RANK_REVALIDATE_SECONDS, tags: [`brand-${brandHandle}`] }
    )();
  } catch (error) {
    if (partial.ids) {
      console.warn(`[rankBrandProductIdsOnSaleFirst] uncached partial ranking for ${brandHandle}`);
      return partial.ids;
    }
    throw error;
  }
}
