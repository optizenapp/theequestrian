import { shopifyFetch } from './client';
import type { ShopifyProduct } from '@/types/shopify';

/**
 * Batch-fetch variant trees for product handles (Storefront API).
 * Used when Postgres-sourced brand grids need real variant IDs for cart CTAs.
 */
export async function fetchProductVariantsByHandles(
  handles: string[]
): Promise<Map<string, ShopifyProduct['variants']>> {
  const map = new Map<string, ShopifyProduct['variants']>();
  if (handles.length === 0) return map;

  const CHUNK_SIZE = 25;
  try {
    for (let start = 0; start < handles.length; start += CHUNK_SIZE) {
      const chunk = handles
        .slice(start, start + CHUNK_SIZE)
        .map((h) => h.trim())
        .filter(Boolean);
      if (chunk.length === 0) continue;

      const aliases = chunk
        .map((handle, index) => {
          const escaped = handle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return `
          p${index}: product(handle: "${escaped}") {
            handle
            variants(first: 50) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        `;
        })
        .join('\n');

      const query = `query ProductVariantsByHandlesChunk { ${aliases} }`;
      const data = await shopifyFetch<
        Record<string, { handle: string; variants: ShopifyProduct['variants'] } | null>
      >({
        query,
        cache: 'force-cache',
        tags: chunk.map((handle) => `product-${handle}`),
      });

      for (const entry of Object.values(data)) {
        if (entry?.handle && entry.variants?.edges?.length) {
          map.set(entry.handle.toLowerCase(), entry.variants);
        }
      }
    }
  } catch (error) {
    console.error('[fetchProductVariantsByHandles] batch failed', error);
  }

  return map;
}
