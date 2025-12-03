import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify/client';
import { normalizeProductType } from '@/lib/shopify/collection-mapping';

const GET_COLLECTION_PRODUCTS = `
  query GetCollectionProducts($handle: String!, $first: Int = 250) {
    collection(handle: $handle) {
      handle
      title
      products(first: $first) {
        edges {
          node {
            handle
            title
            productType
          }
        }
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const collectionHandle = searchParams.get('collection') || 'footwear';
  const subcategory = searchParams.get('subcategory');

  try {
    const data = await shopifyFetch<{
      collection: {
        handle: string;
        title: string;
        products: {
          edges: Array<{
            node: {
              handle: string;
              title: string;
              productType: string;
            };
          }>;
        };
      } | null;
    }>({
      query: GET_COLLECTION_PRODUCTS,
      variables: { handle: collectionHandle, first: 250 },
      cache: 'no-store',
    });

    if (!data.collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Get unique productTypes
    const productTypes = new Map<string, { count: number; normalized: string; samples: string[] }>();
    
    data.collection.products.edges.forEach(({ node }) => {
      if (!node.productType) {
        return;
      }
      
      const normalized = normalizeProductType(node.productType);
      const existing = productTypes.get(node.productType) || {
        count: 0,
        normalized,
        samples: [],
      };

      existing.count++;
      if (existing.samples.length < 3) {
        existing.samples.push(node.title);
      }
      productTypes.set(node.productType, existing);
    });

    // Filter by subcategory if provided
    let filteredTypes = Array.from(productTypes.entries());
    if (subcategory) {
      const normalizedSub = normalizeProductType(subcategory);
      filteredTypes = filteredTypes.filter(([, info]) => info.normalized === normalizedSub);
    }

    return NextResponse.json({
      collection: data.collection.title,
      totalProducts: data.collection.products.edges.length,
      productTypes: filteredTypes.map(([type, info]) => ({
        original: type,
        ...info
      }))
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
