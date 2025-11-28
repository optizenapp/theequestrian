import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify/client';

/**
 * API Route: Fetch real-time prices and inventory for multiple products
 * GET /api/prices?ids=gid://shopify/Product/123,gid://shopify/Product/456
 * 
 * Returns lightweight price/inventory data for client-side hydration
 */

const GET_PRODUCT_PRICES = `
  query GetProductPrices($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        availableForSale
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              availableForSale
              quantityAvailable
              price {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Product IDs are required' },
        { status: 400 }
      );
    }

    // Split comma-separated IDs
    const ids = idsParam.split(',').filter(id => id.trim());

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one product ID is required' },
        { status: 400 }
      );
    }

    // Limit to 50 products per request
    if (ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 products per request' },
        { status: 400 }
      );
    }

    // Fetch prices from Shopify
    const data = await shopifyFetch<{
      nodes: Array<{
        id: string;
        availableForSale: boolean;
        priceRange: {
          minVariantPrice: {
            amount: string;
            currencyCode: string;
          };
          maxVariantPrice: {
            amount: string;
            currencyCode: string;
          };
        };
        variants: {
          edges: Array<{
            node: {
              id: string;
              availableForSale: boolean;
              quantityAvailable: number;
              price: {
                amount: string;
                currencyCode: string;
              };
            };
          }>;
        };
      }>;
    }>({
      query: GET_PRODUCT_PRICES,
      variables: { ids },
    });

    // Transform to lightweight response
    const prices = data.nodes.map((product) => {
      if (!product) return null;

      const firstVariant = product.variants.edges[0]?.node;

      return {
        id: product.id,
        availableForSale: product.availableForSale,
        price: {
          amount: product.priceRange.minVariantPrice.amount,
          currencyCode: product.priceRange.minVariantPrice.currencyCode,
        },
        compareAtPrice: product.priceRange.maxVariantPrice.amount !== product.priceRange.minVariantPrice.amount
          ? {
              amount: product.priceRange.maxVariantPrice.amount,
              currencyCode: product.priceRange.maxVariantPrice.currencyCode,
            }
          : null,
        inStock: firstVariant?.availableForSale || false,
        quantityAvailable: firstVariant?.quantityAvailable || 0,
      };
    }).filter(Boolean);

    // Cache for 1 minute
    return NextResponse.json(
      { prices },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}

