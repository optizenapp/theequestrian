/**
 * Product Status API
 * 
 * Lightweight endpoint to fetch real-time price and inventory data
 * for a list of product IDs. Used for client-side hydration to ensure
 * users always see accurate pricing and availability.
 * 
 * @route POST /api/products/status
 * @body { productIds: string[] }
 * @returns { [productId]: { price: number, compareAtPrice?: number, stock: number, available: boolean } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify/client';

interface ProductStatusRequest {
  productIds: string[];
}

interface ProductStatusResponse {
  [productId: string]: {
    price: number;
    compareAtPrice?: number;
    stock: number;
    available: boolean;
  };
}

type StatusCacheEntry = {
  data: ProductStatusResponse;
  expiresAt: number;
};

const statusCache = new Map<string, StatusCacheEntry>();
const inFlightRequests = new Map<string, Promise<ProductStatusResponse>>();
const MAX_CACHE_ENTRIES = Number(process.env.PRODUCT_STATUS_CACHE_MAX_ENTRIES || 500);

function getTtlMs(mode: 'soft' | 'strict'): number {
  if (mode === 'strict') {
    return Number(process.env.PRODUCT_STATUS_CACHE_STRICT_MS || 3000);
  }
  return Number(process.env.PRODUCT_STATUS_CACHE_SOFT_MS || 15000);
}

function buildCacheKey(mode: 'soft' | 'strict', productIds: string[]): string {
  // Sort + dedupe so repeated requests with same IDs in different order hit cache.
  const normalizedIds = [...new Set(productIds)].sort();
  return `${mode}:${normalizedIds.join(',')}`;
}

function readCache(cacheKey: string): ProductStatusResponse | null {
  const hit = statusCache.get(cacheKey);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    statusCache.delete(cacheKey);
    return null;
  }
  return hit.data;
}

function writeCache(cacheKey: string, data: ProductStatusResponse, ttlMs: number): void {
  if (ttlMs <= 0) return;
  if (statusCache.size >= MAX_CACHE_ENTRIES) {
    // Drop oldest 25% when full (simple bounded cache behavior).
    const toDelete = Math.ceil(MAX_CACHE_ENTRIES * 0.25);
    const keys = statusCache.keys();
    for (let i = 0; i < toDelete; i++) {
      const next = keys.next();
      if (next.done) break;
      statusCache.delete(next.value);
    }
  }
  statusCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

const GET_PRODUCTS_STATUS = `
  query GetProductsStatus($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        availableForSale
        totalInventory
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') === 'strict' ? 'strict' : 'soft';
    const body: ProductStatusRequest = await request.json();
    const { productIds } = body;

    // Validate input
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: productIds array is required' },
        { status: 400 }
      );
    }

    // Limit to 250 products per request (Shopify's max for nodes query)
    if (productIds.length > 250) {
      return NextResponse.json(
        { error: 'Too many products: maximum 250 per request' },
        { status: 400 }
      );
    }
    const ttlMs = getTtlMs(mode);
    const cacheKey = buildCacheKey(mode, productIds);
    const cached = readCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control':
            mode === 'strict'
              ? 'no-store, max-age=0'
              : 'public, max-age=5, s-maxage=10, stale-while-revalidate=30',
          'X-Status-Cache': 'HIT',
        },
      });
    }

    const existingRequest = inFlightRequests.get(cacheKey);
    const statusPromise =
      existingRequest ||
      (async (): Promise<ProductStatusResponse> => {
        console.log(`[ProductStatus] Fetching status for ${productIds.length} products`);
        const data = await shopifyFetch<{ nodes: any[] }>({
          query: GET_PRODUCTS_STATUS,
          variables: { ids: productIds },
          cache: 'no-store',
        });

        const statusMap: ProductStatusResponse = {};
        for (const node of data.nodes) {
          if (!node || !node.id) continue;

          const price = parseFloat(node.priceRange?.minVariantPrice?.amount || '0');
          const compareAtPrice = node.compareAtPriceRange?.minVariantPrice?.amount
            ? parseFloat(node.compareAtPriceRange.minVariantPrice.amount)
            : undefined;

          statusMap[node.id] = {
            price,
            compareAtPrice,
            stock: node.totalInventory || 0,
            available: node.availableForSale || false,
          };
        }

        writeCache(cacheKey, statusMap, ttlMs);
        return statusMap;
      })();

    if (!existingRequest) {
      inFlightRequests.set(cacheKey, statusPromise);
    }

    const statusMap = await statusPromise;
    inFlightRequests.delete(cacheKey);

    console.log(`[ProductStatus] ✅ Returned status for ${Object.keys(statusMap).length} products`);

    return NextResponse.json(statusMap, {
      headers: {
        'Cache-Control':
          mode === 'strict'
            ? 'no-store, max-age=0'
            : 'public, max-age=5, s-maxage=10, stale-while-revalidate=30',
        'X-Status-Cache': existingRequest ? 'COALESCED' : 'MISS',
      },
    });
  } catch (error) {
    inFlightRequests.clear();
    console.error('[ProductStatus] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product status' },
      { status: 500 }
    );
  }
}

// Also support GET with query params for simpler testing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json(
        { error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const productIds = ids.split(',').map(id => id.trim());

    // Reuse POST logic
    return POST(
      new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ productIds }),
      })
    );
  } catch (error) {
    console.error('[ProductStatus] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product status' },
      { status: 500 }
    );
  }
}

