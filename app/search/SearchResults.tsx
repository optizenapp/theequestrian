import { shopifyFetch } from '@/lib/shopify/client';
import { ProductCard } from '@/components/ProductCard';
import type { ShopifyProduct } from '@/types/shopify';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';

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
          compareAtPriceRange {
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
          metafield(namespace: "custom", key: "primary_collection") {
            value
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
  const data = await shopifyFetch<{
    products: {
      edges: Array<{
        node: ShopifyProduct;
      }>;
    };
  }>({
    query: SEARCH_PRODUCTS_QUERY,
    variables: { query: `title:*${query}*`, first: 20 },
    cache: 'force-cache',
    tags: ['search', `search-${query.toLowerCase()}`],
  }).catch((error) => {
    console.error('Search error:', error);
    return null;
  });

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">An error occurred while searching. Please try again.</p>
      </div>
    );
  }

  const products = data.products.edges.map(({ node }) => node);
  const reviewStatsMap = await getReviewStatsForProducts(products.map((product) => product.handle));

  // Sort products: In-stock first, out-of-stock last
  products.sort((a, b) => {
    if (a.availableForSale === b.availableForSale) return 0;
    return a.availableForSale ? -1 : 1;
  });

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="bg-surface rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No results found</h2>
        <p className="text-gray-500">We could not find any matches for {query}.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Search results for {query}
        </h1>
        <span className="text-gray-500 text-sm bg-surface px-3 py-1 rounded-full shadow-sm">
          {products.length} items
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            reviewStats={reviewStatsMap.get(product.handle)}
          />
        ))}
      </div>
    </div>
  );
}
