import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { shopifyFetch } from '@/lib/shopify/client';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';

const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          handle
          title
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

const SEARCH_CATEGORY_IMAGE_QUERY = `
  query SearchCategoryImage($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

function buildProductTypeQuery(productTypes: string[]): string {
  return productTypes
    .map((type) => `product_type:"${type.replace(/"/g, '\\"')}"`)
    .join(' OR ');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const [productData, categoryData] = await Promise.all([
      shopifyFetch<{
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            priceRange: {
              minVariantPrice: {
                amount: string;
                currencyCode: string;
              };
            };
            images: {
              edges: Array<{
                node: {
                  url: string;
                  altText?: string | null;
                };
              }>;
            };
          };
        }>;
      };
    }>({
        query: SEARCH_PRODUCTS_QUERY,
        variables: { query: `title:*${query}*`, first: 8 },
        cache: 'no-store',
      }),
      sql.query<{
        url_path: string;
        h1_title: string;
        breadcrumb_label: string | null;
      }>(
        `
        SELECT url_path, h1_title, breadcrumb_label
        FROM collection_content
        WHERE status = 'published'
          AND (
            h1_title ILIKE $1
            OR breadcrumb_label ILIKE $1
          )
        ORDER BY LENGTH(url_path) ASC
        LIMIT 6
        `,
        [`%${query}%`]
      ),
    ]);

    const productResults = productData.products.edges.map(({ node }) => ({
      type: 'product' as const,
      id: node.id,
      handle: node.handle,
      title: node.title,
      imageUrl: node.images.edges[0]?.node.url ?? null,
      imageAlt: node.images.edges[0]?.node.altText ?? null,
      price: node.priceRange.minVariantPrice.amount,
      currencyCode: node.priceRange.minVariantPrice.currencyCode,
    }));

    const baseCollections = categoryData.rows.map((row) => ({
      type: 'collection' as const,
      id: row.url_path,
      urlPath: row.url_path.startsWith('/') ? row.url_path : `/${row.url_path}`,
      title: row.breadcrumb_label || row.h1_title,
    }));

    const collectionResults = await Promise.all(
      baseCollections.map(async (collection) => {
        const pathParts = collection.urlPath.replace(/^\//, '').split('/').filter(Boolean);
        const [category, subcategory, subsubcategory] = pathParts;
        const productTypes = await getProductTypesForCollection(category, subcategory, subsubcategory);

        if (productTypes.length === 0) {
          return { ...collection, imageUrl: null, imageAlt: null };
        }

        const productTypeQuery = buildProductTypeQuery(productTypes);
        if (!productTypeQuery) {
          return { ...collection, imageUrl: null, imageAlt: null };
        }

        const imageData = await shopifyFetch<{
          products: {
            edges: Array<{
              node: {
                images: {
                  edges: Array<{
                    node: { url: string; altText?: string | null };
                  }>;
                };
              };
            }>;
          };
        }>({
          query: SEARCH_CATEGORY_IMAGE_QUERY,
          variables: { query: `(${productTypeQuery})`, first: 1 },
          cache: 'no-store',
        });

        const imageNode = imageData.products.edges[0]?.node.images.edges[0]?.node;
        return {
          ...collection,
          imageUrl: imageNode?.url ?? null,
          imageAlt: imageNode?.altText ?? collection.title,
        };
      })
    );

    return NextResponse.json({
      results: {
        products: productResults,
        collections: collectionResults,
      },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ results: { products: [], collections: [] } }, { status: 200 });
  }
}
