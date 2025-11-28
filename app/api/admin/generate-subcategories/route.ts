import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify/client';
import { normalizeProductType, getCollectionForProductType } from '@/lib/shopify/collection-mapping';

const GET_COLLECTIONS_WITH_PRODUCTS = `
  query GetCollectionsWithProducts($first: Int = 250) {
    collections(first: $first) {
      edges {
        node {
          handle
          title
          products(first: 250) {
            edges {
              node {
                handle
                productType
              }
            }
          }
        }
      }
    }
  }
`;

interface CollectionNode {
  handle: string;
  title: string;
  products: {
    edges: Array<{
      node: {
        handle: string;
        productType: string;
      };
    }>;
  };
}

/**
 * Generate all valid subcategory URLs based on productTypes in collections
 */
export async function GET(request: NextRequest) {
  try {
    const data = await shopifyFetch<{
      collections: {
        edges: Array<{ node: CollectionNode }>;
      };
    }>({
      query: GET_COLLECTIONS_WITH_PRODUCTS,
      variables: { first: 250 },
      cache: 'no-store',
    });

    // Map: collection handle -> productTypes -> normalized subcategory
    const subcategoriesMap = new Map<string, Map<string, {
      productType: string;
      normalized: string;
      productCount: number;
      sampleProducts: string[];
    }>>();

    data.collections.edges.forEach(({ node: collection }) => {
      const productTypesMap = new Map<string, {
        productType: string;
        normalized: string;
        productCount: number;
        sampleProducts: string[];
      }>();

      collection.products.edges.forEach(({ node: product }) => {
        if (!product.productType || product.productType.trim() === '') {
          return;
        }

        const normalized = normalizeProductType(product.productType);
        const coreCollection = getCollectionForProductType(product.productType);

        // Only include if this productType maps to this collection
        if (coreCollection === collection.handle || 
            (coreCollection === 'all-products' && collection.products.edges.length > 0)) {
          
          const existing = productTypesMap.get(product.productType) || {
            productType: product.productType,
            normalized,
            productCount: 0,
            sampleProducts: [],
          };

          existing.productCount++;
          if (existing.sampleProducts.length < 3) {
            existing.sampleProducts.push(product.handle);
          }

          productTypesMap.set(product.productType, existing);
        }
      });

      if (productTypesMap.size > 0) {
        subcategoriesMap.set(collection.handle, productTypesMap);
      }
    });

    // Build list of valid subcategory URLs
    const subcategories: Array<{
      url: string;
      collection: string;
      subcategory: string;
      productType: string;
      productCount: number;
      normalized: string;
    }> = [];

    subcategoriesMap.forEach((productTypes, collectionHandle) => {
      productTypes.forEach((info, productType) => {
        // Only create subcategory if normalized is different from collection
        if (info.normalized !== collectionHandle && info.normalized) {
          subcategories.push({
            url: `/${collectionHandle}/${info.normalized}`,
            collection: collectionHandle,
            subcategory: info.normalized,
            productType,
            productCount: info.productCount,
            normalized: info.normalized,
          });
        }
      });
    });

    // Group by collection
    const byCollection = new Map<string, typeof subcategories>();
    subcategories.forEach(sub => {
      const existing = byCollection.get(sub.collection) || [];
      existing.push(sub);
      byCollection.set(sub.collection, existing);
    });

    return NextResponse.json({
      total: subcategories.length,
      byCollection: Object.fromEntries(byCollection),
      all: subcategories.sort((a, b) => a.url.localeCompare(b.url)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate subcategories', details: String(error) },
      { status: 500 }
    );
  }
}

