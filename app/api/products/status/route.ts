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
import { checkRateLimit, rejectBotRequest } from '@/lib/api/endpoint-guards';
import { jsonWithEtag } from '@/lib/http/json-conditional';

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

function respondStatusJson(
  request: NextRequest,
  mode: 'soft' | 'strict',
  statusMap: ProductStatusResponse,
  xCache: string
): NextResponse {
  const cacheControl =
    mode === 'strict'
      ? 'no-store, max-age=0'
      : 'public, max-age=5, s-maxage=10, stale-while-revalidate=30';
  const headers = { 'X-Status-Cache': xCache, 'Cache-Control': cacheControl };
  if (mode === 'strict') {
    return NextResponse.json(statusMap, { headers });
  }
  return jsonWithEtag(request, statusMap, { headers });
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
        variants(first: 100) {
          edges {
            node {
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const botBlocked = rejectBotRequest(request, 'products/status');
    if (botBlocked) return botBlocked;

    const rl = checkRateLimit(
      request,
      'api:products:status',
      Number(process.env.API_STATUS_RATE_LIMIT_PER_MIN || 180),
      60_000
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSec) },
        }
      );
    }

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
      return respondStatusJson(request, mode, cached, 'HIT');
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

          type RawVariant = {
            availableForSale: boolean;
            price: { amount: string };
            compareAtPrice?: { amount: string } | null;
          };
          const allVariants: RawVariant[] =
            (node.variants?.edges ?? []).map((e: { node: RawVariant }) => e.node);

          // Prefer cheapest in-stock variant; fall back to cheapest overall if all OOS.
          const inStock = allVariants.filter((v) => v.availableForSale);
          const pool = inStock.length > 0 ? inStock : allVariants;
          const byPrice = (a: RawVariant, b: RawVariant) =>
            parseFloat(a.price.amount) - parseFloat(b.price.amount);
          const cheapest = [...pool].sort(byPrice)[0];

          const price = cheapest ? parseFloat(cheapest.price.amount) : 0;

          // Compare-at from the cheapest in-stock on-sale variant, if any.
          const onSalePool = pool.filter(
            (v) =>
              v.compareAtPrice &&
              parseFloat(v.compareAtPrice.amount) > parseFloat(v.price.amount)
          );
          const cheapestOnSale = [...onSalePool].sort(byPrice)[0];
          const compareAtPrice = cheapestOnSale?.compareAtPrice
            ? parseFloat(cheapestOnSale.compareAtPrice.amount)
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

    return respondStatusJson(
      request,
      mode,
      statusMap,
      existingRequest ? 'COALESCED' : 'MISS'
    );
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

    const productIds = ids.split(',').map((id) => id.trim());

    const forward = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ productIds }),
    });
    return POST(forward);
  } catch (error) {
    console.error('[ProductStatus] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product status' },
      { status: 500 }
    );
  }
}

