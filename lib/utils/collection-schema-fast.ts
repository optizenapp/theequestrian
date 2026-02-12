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
  canonicalProductUrls?: Map<string, string> | Record<string, string>;
}

/**
 * Generate keywords from collection name and URL for enhanced SEO
 */
function generateKeywords(collectionName: string, collectionUrl: string): string {
  const keywords: string[] = [];
  
  // Extract from URL path
  const urlParts = collectionUrl.split('/').filter(p => p);
  const category = urlParts[urlParts.length - 2] || '';
  const subcategory = urlParts[urlParts.length - 1] || '';
  
  // Add collection name
  keywords.push(collectionName.toLowerCase());
  
  // Add category-specific keywords
  if (category === 'horse') {
    keywords.push('equestrian', 'horse tack', 'horse equipment');
    if (subcategory === 'saddles') keywords.push('riding saddles', 'horse saddles', 'equestrian saddles');
    if (subcategory === 'rugs') keywords.push('horse rugs', 'horse blankets', 'turnout rugs');
    if (subcategory === 'boots') keywords.push('horse boots', 'leg protection', 'equine boots');
    if (subcategory === 'halters') keywords.push('horse halters', 'headstalls', 'lead ropes');
  } else if (category === 'clothing') {
    keywords.push('equestrian clothing', 'riding apparel', 'horse riding wear');
    if (subcategory === 'breeches') keywords.push('riding breeches', 'riding pants', 'equestrian breeches');
  } else if (category === 'rider') {
    keywords.push('rider equipment', 'equestrian gear', 'riding accessories');
    if (subcategory === 'helmets') keywords.push('riding helmets', 'equestrian helmets', 'safety helmets');
  }
  
  // Add Australian context
  keywords.push('Australia', 'Australian equestrian');
  
  return keywords.join(', ');
}

/**
 * Generate sameAs links for external authority (Wikipedia, etc.)
 */
function generateSameAsLinks(collectionName: string, collectionUrl: string): string[] {
  const links: string[] = [];
  const urlParts = collectionUrl.split('/').filter(p => p);
  const subcategory = urlParts[urlParts.length - 1] || '';
  
  // Map to Wikipedia pages (only for well-known equestrian terms)
  const wikipediaMap: Record<string, string> = {
    'saddles': 'https://en.wikipedia.org/wiki/Saddle',
    'halters': 'https://en.wikipedia.org/wiki/Halter',
    'bridles': 'https://en.wikipedia.org/wiki/Bridle',
    'rugs': 'https://en.wikipedia.org/wiki/Horse_blanket',
    'boots': 'https://en.wikipedia.org/wiki/Horse_boot',
    'helmets': 'https://en.wikipedia.org/wiki/Equestrian_helmet',
    'breeches': 'https://en.wikipedia.org/wiki/Breeches',
  };
  
  if (wikipediaMap[subcategory]) {
    links.push(wikipediaMap[subcategory]);
  }
  
  return links;
}

/**
 * Generate "Best in Class" collection schema - FAST VERSION
 * 
 * Performance optimizations:
 * - Uses simple /products/{handle} URLs (no expensive canonical lookups)
 * - Limits to 12 products by default (Google doesn't need all 36)
 * - Skips image URLs (optional, reduces payload)
 * 
 * Enhanced with world-class schema properties:
 * - additionalType for better classification
 * - keywords for semantic understanding
 * - about for topical relevance
 * - sameAs for external authority links
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
    canonicalProductUrls,
  } = params;

  const getCanonicalProductUrl = (handle: string): string | null => {
    if (!canonicalProductUrls) {
      return null;
    }
    if (canonicalProductUrls instanceof Map) {
      return canonicalProductUrls.get(handle) || null;
    }
    return canonicalProductUrls[handle] || null;
  };

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
  // Prefer canonical frontend URLs when available.
  const itemListElements = products.slice(0, maxProducts).map((product, index) => {
    const canonicalPath = getCanonicalProductUrl(product.handle);
    const productUrl = canonicalPath
      ? `${siteUrl}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
      : `${siteUrl}/products/${product.handle}`;
    
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

  // Build the CollectionPage entity with enhanced schema properties
  const collectionPageEntity: any = {
    '@type': 'CollectionPage',
    '@id': collectionUrl,
    name: collectionName,
    url: collectionUrl,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
    },
    about: [
      {
        '@id': `${siteUrl}#organization`,
      },
      {
        '@type': 'Thing',
        name: collectionName,
        description: collectionDescription || `${collectionName} for equestrian use`,
      },
    ],
    inLanguage: 'en-AU',
    
    // Enhanced: Add additionalType for more specific classification
    additionalType: 'https://schema.org/ProductCollection',
    
    mainEntity: {
      '@type': 'ItemList',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: products.length, // Total count, not just schema items
      itemListElement: itemListElements,
    },
    
    // Enhanced: Add keywords for better semantic understanding
    keywords: generateKeywords(collectionName, collectionUrl),
    
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
  
  // Enhanced: Add sameAs for Wikipedia/external authority links (if available)
  const sameAsLinks = generateSameAsLinks(collectionName, collectionUrl);
  if (sameAsLinks.length > 0) {
    collectionPageEntity.sameAs = sameAsLinks;
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

