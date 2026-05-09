/**
 * Best in Class Collection Schema Generator
 * 
 * Implements Google's preferred ItemList structure for collection pages
 * following their List Extraction and Deep Web Crawling patents.
 * 
 * Key Improvements:
 * - Uses ItemList instead of OfferCatalog (Google's explicit preference)
 * - Includes URL links to create "Knowledge Graph Edges"
 * - Positions items for carousel eligibility in search results
 * - Lean payload - only essential data (detailed data lives on product pages)
 * - Uses @graph to connect BreadcrumbList → CollectionPage → ItemList
 */

import type { ShopifyProduct } from '@/types/shopify';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface CollectionSchemaParams {
  // Collection Info
  collectionName: string;
  collectionUrl: string;
  collectionDescription?: string;
  
  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[];
  
  // Products
  products: ShopifyProduct[];
  productUrls: Map<string, string> | Record<string, string>; // Map of product.id → canonical URL
  
  // Optional
  parentCollection?: {
    name: string;
    url: string;
  };
  
  // Site config
  siteUrl: string;
}

/**
 * Generate "Best in Class" collection schema using @graph method
 * 
 * This creates a connected graph of:
 * 1. BreadcrumbList - Shows hierarchy
 * 2. CollectionPage - Defines the page
 * 3. ItemList (via mainEntity) - Lists products with URLs
 */
export function generateCollectionSchema(params: CollectionSchemaParams) {
  const {
    collectionName,
    collectionUrl,
    collectionDescription,
    breadcrumbs,
    products,
    productUrls,
    parentCollection,
    siteUrl,
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
  // Limit to 20 items for better performance (Google only needs a sample)
  // This significantly reduces schema size and generation time
  const itemListElements = products.slice(0, 20).flatMap((product, index) => {
    // Handle both Map and Record types for productUrls
    const productUrl = (productUrls instanceof Map
      ? productUrls.get(product.id) 
      : productUrls[product.id]);
    if (!productUrl || productUrl.includes('/products/')) {
      return [];
    }
    
    // Get first image from images.edges array
    const imageUrl = product.images?.edges?.[0]?.node?.url;

    // Build the ListItem with proper 'item' property containing the Product entity
    const listItem: any = {
      '@type': 'ListItem',
      position: index + 1,
      url: productUrl,
      item: {
        '@type': 'Product',
        name: product.title,
        url: productUrl,
        offers: {
          '@type': 'Offer',
          price: product.priceRange.minVariantPrice.amount,
          priceCurrency: product.priceRange.minVariantPrice.currencyCode,
        },
      },
    };

    // Add image to the Product entity if available
    if (imageUrl) {
      listItem.item.image = imageUrl;
    }

    return [listItem];
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
      numberOfItems: products.length,
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

/**
 * Helper function to extract product URLs from the productUrls map
 * This is used when you have a Map or Record of product.id → URL
 */
export function getProductUrl(
  productId: string,
  productHandle: string,
  productUrls: Map<string, string> | Record<string, string>,
  siteUrl: string
): string {
  const url = productUrls instanceof Map 
    ? productUrls.get(productId) 
    : productUrls[productId];
  if (!url || url.includes('/products/')) return '';
  return url;
}

/**
 * Generate semantic description with entity-rich text
 * 
 * Example: Instead of "Wide range of top brands available"
 * Use: "Official retailer for Breyer Traditional, Classics, and Stablemates"
 * 
 * This helps Google's BERT/MUM models identify named entities
 */
export function generateSemanticDescription(
  categoryName: string,
  brandNames?: string[],
  customDescription?: string
): string {
  if (customDescription) {
    return customDescription;
  }

  if (brandNames && brandNames.length > 0) {
    const brandList = brandNames.slice(0, 3).join(', ');
    return `Shop premium ${categoryName.toLowerCase()} from top brands including ${brandList}. Official retailer with fast shipping across Australia.`;
  }

  return `Shop premium ${categoryName.toLowerCase()} products. Quality equestrian supplies with fast shipping across Australia.`;
}

