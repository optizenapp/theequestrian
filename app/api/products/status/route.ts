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

    console.log(`[ProductStatus] Fetching status for ${productIds.length} products`);

    // Fetch product status from Shopify
    const data = await shopifyFetch<{ nodes: any[] }>({
      query: GET_PRODUCTS_STATUS,
      variables: { ids: productIds },
      cache: 'no-store', // Always fetch fresh data
    });

    // Build response map
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

    console.log(`[ProductStatus] ✅ Returned status for ${Object.keys(statusMap).length} products`);

    return NextResponse.json(statusMap, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
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

