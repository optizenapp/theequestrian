import { sql } from '@/lib/db/vercel-postgres';
import { shopifyFetch } from '@/lib/shopify/client';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';

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

/**
 * Prefer an allocated Neon product image for the category path.
 * Fall back to Shopify Storefront search by mapped product_type(s).
 * Many PLPs are allocation-driven, so product_type search alone often misses.
 */
export async function resolveCollectionSearchImage(
  urlPath: string,
  title: string
): Promise<{ imageUrl: string | null; imageAlt: string | null }> {
  try {
    const allocated = await sql.query<{
      image_url: string;
      image_alt: string | null;
      title: string;
    }>(
      `
      SELECT p.image_url, p.image_alt, p.title
      FROM product_category_assignments pca
      JOIN products p ON p.handle = pca.product_handle
      WHERE pca.category_path = $1
        AND p.image_url IS NOT NULL
        AND TRIM(p.image_url) <> ''
      ORDER BY p.available_for_sale DESC NULLS LAST, p.updated_at DESC NULLS LAST
      LIMIT 1
      `,
      [urlPath]
    );
    const row = allocated.rows[0];
    if (row?.image_url) {
      return {
        imageUrl: row.image_url,
        imageAlt: row.image_alt || row.title || title,
      };
    }
  } catch (error) {
    console.error('[search] allocation image lookup failed:', error);
  }

  const pathParts = urlPath.replace(/^\//, '').split('/').filter(Boolean);
  const [category, subcategory, subsubcategory] = pathParts;
  const productTypes = await getProductTypesForCollection(category, subcategory, subsubcategory);
  if (productTypes.length === 0) {
    return { imageUrl: null, imageAlt: null };
  }

  const productTypeQuery = buildProductTypeQuery(productTypes);
  if (!productTypeQuery) {
    return { imageUrl: null, imageAlt: null };
  }

  try {
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
      cache: 'force-cache',
      tags: ['search', `search-collection-image-${urlPath}`],
    });

    const imageNode = imageData.products.edges[0]?.node.images.edges[0]?.node;
    return {
      imageUrl: imageNode?.url ?? null,
      imageAlt: imageNode?.altText ?? title,
    };
  } catch (error) {
    console.error('[search] Shopify category image lookup failed:', error);
    return { imageUrl: null, imageAlt: null };
  }
}
