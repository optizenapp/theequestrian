import { shopifyFetch } from '@/lib/shopify/client';
import Link from 'next/link';
import type { ShopifyProduct } from '@/types/shopify';

const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          handle
          title
          availableForSale
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
                width
                height
              }
            }
          }
        }
      }
    }
  }
`;

interface SearchResultsProps {
  query: string;
}

export async function SearchResults({ query }: SearchResultsProps) {
  try {
    const data = await shopifyFetch<{
      products: {
        edges: Array<{
          node: ShopifyProduct;
        }>;
      };
    }>({
      query: SEARCH_PRODUCTS_QUERY,
      variables: { query: `title:*${query}*`, first: 20 },
      cache: 'no-store',
    });

    const products = data.products.edges.map(({ node }) => node);

    if (products.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">No products found matching "{query}".</p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-gray-600 mb-6">
          Found {products.length} product{products.length !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.handle}`}
              className="group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              {product.images.edges.length > 0 && (
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.images.edges[0].node.url}
                    alt={product.images.edges[0].node.altText || product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">{product.title}</h3>
                <div className="text-lg font-bold">
                  {product.priceRange.minVariantPrice.currencyCode}{' '}
                  {product.priceRange.minVariantPrice.amount}
                </div>
                {!product.availableForSale && (
                  <span className="text-sm text-red-500 mt-1 block">Out of Stock</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Search error:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600">An error occurred while searching. Please try again.</p>
      </div>
    );
  }
}
