/**
 * FAST Collection Schema Generator (Performance Optimized)
 * 
 * This is a performance-optimized version that skips expensive canonical URL lookups
 * for schema generation. Uses simple /products/{handle} URLs instead.
 * 
 * Use this version for collection pages where performance is critical.
 */

import type { ShopifyProduct } from '@/types/shopify';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface CollectionSchemaFastParams {
  // Collection Info
  collectionName: string;
  collectionUrl: string;
  collectionDescription?: string;
  
  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[];
  
  // Products
  products: ShopifyProduct[];
  
  // Optional
  parentCollection?: {
    name: string;
    url: string;
  };
  
  // Site config
  siteUrl: string;
  
  // Performance: Limit number of products in schema (default: 12)
  maxProducts?: number;
}

/**
 * Generate "Best in Class" collection schema - FAST VERSION
 * 
 * Performance optimizations:
 * - Uses simple /products/{handle} URLs (no expensive canonical lookups)
 * - Limits to 12 products by default (Google doesn't need all 36)
 * - Skips image URLs (optional, reduces payload)
 */
export function generateCollectionSchemaFast(params: CollectionSchemaFastParams) {
  const {
    collectionName,
    collectionUrl,
    collectionDescription,
    breadcrumbs,
    products,
    parentCollection,
    siteUrl,
    maxProducts = 12, // Default to 12 products for performance
  } = params;

  // Build breadcrumb list elements
  const breadcrumbElements = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: siteUrl,
    },
    ...breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 2,
      name: crumb.label,
      item: `${siteUrl}${crumb.href}`,
    })),
  ];

  // Build item list elements from products
  // Use simple URLs for performance - no expensive canonical lookups
  const itemListElements = products.slice(0, maxProducts).map((product, index) => {
    // Simple product URL - no canonical lookup needed
    const productUrl = `${siteUrl}/products/${product.handle}`;
    
    // Get first image if available
    const imageUrl = product.images?.edges?.[0]?.node?.url;

    return {
      '@type': 'ListItem',
      position: index + 1,
      url: productUrl,
      item: {
        '@type': 'Product',
        name: product.title,
        url: productUrl,
        ...(imageUrl && { image: imageUrl }),
        offers: {
          '@type': 'Offer',
          price: product.priceRange.minVariantPrice.amount,
          priceCurrency: product.priceRange.minVariantPrice.currencyCode,
        },
      },
    };
  });

  // Build the CollectionPage entity
  const collectionPageEntity: any = {
    '@type': 'CollectionPage',
    '@id': collectionUrl,
    name: collectionName,
    url: collectionUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: products.length, // Total count, not just schema items
      itemListElement: itemListElements,
    },
  };

  // Add optional fields
  if (collectionDescription) {
    collectionPageEntity.description = collectionDescription;
  }

  if (parentCollection) {
    collectionPageEntity.isPartOf = {
      '@type': 'CollectionPage',
      name: parentCollection.name,
      url: parentCollection.url,
    };
  }

  // Return @graph structure
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbElements,
      },
      collectionPageEntity,
    ],
  };
}

