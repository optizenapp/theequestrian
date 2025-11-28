/**
 * Structured Data Utilities for Collections
 * 
 * Generates JSON-LD structured data for collection pages
 * including hasOfferCatalog for filtered views
 */

import type { ShopifyProduct } from '@/types/shopify';

export interface CollectionStructuredData {
  '@context': string;
  '@type': string;
  name: string;
  description?: string;
  url: string;
  image?: string;
  isPartOf?: {
    '@type': string;
    name: string;
    url: string;
  };
  hasOfferCatalog?: {
    '@type': string;
    name: string;
    itemListElement: Array<{
      '@type': string;
      itemOffered: {
        '@type': string;
        name: string;
        offers: {
          '@type': string;
          price: string;
          priceCurrency: string;
          availability?: string;
        };
      };
    }>;
  };
}

/**
 * Generate structured data for a collection page
 * Includes hasOfferCatalog if products are provided
 */
export function generateCollectionStructuredData(
  name: string,
  url: string,
  description?: string,
  image?: string,
  products?: ShopifyProduct[],
  parentCollection?: { name: string; url: string }
): CollectionStructuredData {
  const data: CollectionStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
  };

  if (description) {
    data.description = description;
  }

  if (image) {
    data.image = image;
  }

  if (parentCollection) {
    data.isPartOf = {
      '@type': 'CollectionPage',
      name: parentCollection.name,
      url: parentCollection.url,
    };
  }

  // Add hasOfferCatalog if products are provided (for filtered views)
  if (products && products.length > 0) {
    data.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name,
      itemListElement: products.slice(0, 50).map((product) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name: product.title,
          offers: {
            '@type': 'Offer',
            price: product.priceRange.minVariantPrice.amount,
            priceCurrency: product.priceRange.minVariantPrice.currencyCode,
            availability: product.availableForSale
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        },
      })),
    };
  }

  return data;
}
