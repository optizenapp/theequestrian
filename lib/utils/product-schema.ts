/**
 * Product Schema Generator (Server-side)
 * 
 * Generates world-class Schema.org Product structured data
 * Based on Google's Entity Resolution and Knowledge Graph best practices
 * 
 * Key improvements:
 * - Entity disambiguation (brand vs seller)
 * - Global identifiers (GTIN/MPN)
 * - Structured attributes (NLP-ready)
 * - Merchant trust signals (shipping/returns)
 * - Multiple images for visual search
 * - AggregateRating for star ratings in SERPs
 * 
 * GRACEFUL DEGRADATION:
 * All optional fields are only included if data exists.
 * Missing data will NOT break the schema or cause validation errors.
 */

import type { ShopifyProduct } from '@/types/shopify';

/**
 * Review statistics for AggregateRating
 */
export interface ReviewStats {
  averageRating: number;  // 1-5
  reviewCount: number;
}

/**
 * Extract GTIN (barcode) from product metafields or SKU
 * Returns null if not available - schema will gracefully omit this field
 */
function extractGTIN(product: ShopifyProduct): string | null {
  const barcode = product.variants.edges.find(({ node }) => node.barcode)?.node.barcode?.trim();
  if (barcode && /^\d{8,14}$/.test(barcode)) {
    return barcode;
  }
  // Check for GTIN metafield (you can add this in Shopify admin)
  // Format: product.metafields?.gtin?.value
  
  // For now, return null - add metafield integration later
  // TODO: Add GTIN metafield to Shopify products
  return null;
}

/**
 * Extract MPN (Manufacturer Part Number) from product metafields or tags
 * Returns null if not available
 */
function extractMPN(product: ShopifyProduct): string | null {
  const variantSku = product.variants.edges.find(({ node }) => node.sku)?.node.sku?.trim();
  if (variantSku) {
    return variantSku;
  }

  // Check for MPN in tags (format: "MPN:ABC123")
  const mpnTag = product.tags.find(tag => tag.toLowerCase().startsWith('mpn:'));
  if (mpnTag) {
    return mpnTag.split(':')[1]?.trim() || null;
  }
  
  // Check for MPN metafield
  // TODO: Add MPN metafield to Shopify products
  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Extract structured attributes from product tags and metafields
 * Converts unstructured data into NLP-ready PropertyValue entities
 * Returns empty array if no attributes found - schema will omit the field
 */
function extractAdditionalProperties(product: ShopifyProduct): any[] {
  const properties: any[] = [];
  
  // Extract certifications, materials, features from tags
  product.tags.forEach(tag => {
    const tagLower = tag.toLowerCase();
    
    // Safety certifications (critical for helmets, boots, etc.)
    if (tagLower.includes('astm') || tagLower.includes('snell') || 
        tagLower.includes('pas015') || tagLower.includes('en1384') ||
        tagLower.includes('ce certified')) {
      properties.push({
        "@type": "PropertyValue",
        "name": "Safety Certification",
        "value": tag
      });
    }
    
    // Materials (leather, synthetic, etc.)
    if (tagLower.includes('leather') || tagLower.includes('synthetic') || 
        tagLower.includes('cotton') || tagLower.includes('wool') ||
        tagLower.includes('nylon') || tagLower.includes('polyester') ||
        tagLower.includes('aramid')) {
      properties.push({
        "@type": "PropertyValue",
        "name": "Material",
        "value": tag
      });
    }
    
    // Waterproof/Weather features
    if (tagLower.includes('waterproof') || tagLower.includes('water resistant') ||
        tagLower.includes('breathable') || tagLower.includes('windproof')) {
      properties.push({
        "@type": "PropertyValue",
        "name": "Weather Protection",
        "value": tag
      });
    }
  });
  
  return properties;
}

/**
 * Extract color from variant options or tags
 */
function extractColor(product: ShopifyProduct): string | undefined {
  // Check variant options for color
  const colorOption = product.variants.edges[0]?.node.selectedOptions.find(
    opt => opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour'
  );
  
  if (colorOption) {
    return colorOption.value;
  }
  
  // Fallback: check tags for common colors
  const colorTags = product.tags.filter(tag => 
    /^(black|white|brown|blue|red|green|pink|grey|gray|navy|tan|chestnut)$/i.test(tag)
  );
  
  return colorTags[0];
}

/**
 * Extract size from variant options
 */
function extractSize(product: ShopifyProduct): string | undefined {
  const sizeOption = product.variants.edges[0]?.node.selectedOptions.find(
    opt => opt.name.toLowerCase() === 'size'
  );
  
  return sizeOption?.value;
}

/**
 * Generate best-in-class Product schema with Entity Resolution
 * 
 * @param product - Shopify product data
 * @param productUrl - Product URL path (e.g., /horse/boots/paddock-boots/product-handle)
 * @param siteUrl - Full site URL (e.g., https://theequestrian.com.au)
 * @param reviewStats - Optional review statistics for AggregateRating
 * @returns Complete Product schema with all available data
 */
export function generateProductSchema(
  product: ShopifyProduct,
  productUrl: string,
  siteUrl: string = '',
  reviewStats?: ReviewStats | null
) {
  const baseSiteUrl = (siteUrl || 'https://theequestrian.com.au').replace(/\/+$/, '');
  const normalizedProductPath = productUrl.startsWith('/') ? productUrl : `/${productUrl}`;
  const productAbsoluteUrl = `${baseSiteUrl}${normalizedProductPath}`;
  const price = product.priceRange.minVariantPrice;
  const maxPrice = product.priceRange.maxVariantPrice;
  const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
  
  // Determine availability
  const availability = product.availableForSale 
    ? 'https://schema.org/InStock' 
    : 'https://schema.org/OutOfStock';
  
  // Extract Shopify product ID as SKU
  const sku = product.id.split('/').pop() || '';
  
  // Get all product images (not just first one)
  const images = product.images.edges.map(({ node }) => node.url);
  
  // Extract optional identifiers and attributes
  const gtin = extractGTIN(product);
  const mpn = extractMPN(product);
  const additionalProperties = extractAdditionalProperties(product);
  const firstMaterial = additionalProperties.find((property) => property.name === 'Material')?.value as string | undefined;
  const color = extractColor(product);
  const size = extractSize(product);
  const variantCount = product.variants.edges.length;
  
  // Build the schema with @id for entity resolution
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productAbsoluteUrl}#product`,
    "name": product.title,
    "description": product.description || `Shop ${product.title} at The Equestrian. Premium equestrian supplies and equipment.`,
    "sku": sku,
    "url": productAbsoluteUrl,
  };
  
  // OPTIONAL: GTIN (Global Trade Item Number - barcode)
  // Only include if available - critical for Google Shopping
  if (gtin) {
    schema.gtin13 = gtin;
  }
  
  // OPTIONAL: MPN (Manufacturer Part Number)
  // Only include if available - helps with product matching
  if (mpn) {
    schema.mpn = mpn;
  }
  
  // Add images array (critical for visual search)
  // Gracefully handles products with no images
  if (images.length > 0) {
    schema.image = images;
  }
  
  // OPTIONAL: Brand entity (NOT the seller)
  // This distinguishes manufacturer from retailer
  // Only include if vendor is a real brand (not the store name)
  if (product.vendor && 
      product.vendor.toLowerCase() !== 'the equestrian' && 
      product.vendor.toLowerCase() !== 'ascot saddlery' &&
      product.vendor.trim() !== '') {
    schema.brand = {
      "@type": "Brand",
      "name": product.vendor,
      "url": `${baseSiteUrl}/brands/${slugify(product.vendor)}`,
    };
  }
  
  // OPTIONAL: Category (use product type)
  if (product.productType && product.productType.trim() !== '') {
    schema.category = product.productType;
  }
  
  // OPTIONAL: Color (entity attribute)
  if (color) {
    schema.color = color;
  }
  
  // OPTIONAL: Size (entity attribute)
  if (size) {
    schema.size = size;
  }

  if (firstMaterial) {
    schema.material = firstMaterial;
  }
  
  // OPTIONAL: Additional properties (NLP-ready structured attributes)
  // Only include if we extracted any attributes
  if (additionalProperties.length > 0) {
    schema.additionalProperty = additionalProperties;
  }
  
  // Audience (equestrian context)
  schema.audience = {
    "@type": "Audience",
    "audienceType": "Equestrians"
  };
  
  // OPTIONAL: AggregateRating (star ratings in SERPs)
  // Only include if review data is provided
  // CRITICAL: Must have real data - fake ratings violate Google guidelines
  if (reviewStats && reviewStats.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": reviewStats.averageRating.toFixed(1),
      "reviewCount": reviewStats.reviewCount,
      "bestRating": "5",
      "worstRating": "1"
    };
  }
  
  // Build offers with merchant trust signals
  const offerBase = {
    "url": productAbsoluteUrl,
    "priceCurrency": price.currencyCode,
    "availability": availability,
    "priceValidUntil": new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days
    "itemCondition": "https://schema.org/NewCondition",
    
    // Seller entity (the retailer)
    "seller": {
      "@id": `${baseSiteUrl}#organization`,
    },
    
    // Merchant return policy (trust signal)
    "hasMerchantReturnPolicy": {
      "@id": `${baseSiteUrl}#return-policy`,
    },
    
    // Shipping details (trust signal)
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "0",
        "currency": price.currencyCode
      },
      "shippingDestination": {
        "@type": "DefinedRegion",
        "addressCountry": "AU"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 0,
          "maxValue": 2,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 2,
          "maxValue": 7,
          "unitCode": "DAY"
        }
      }
    }
  };
  
  // Single price vs price range
  if (price.amount === maxPrice.amount) {
    // Single price - use Offer
    schema.offers = {
      "@type": "Offer",
      ...offerBase,
      "price": price.amount,
    };
  } else {
    // Price range - use AggregateOffer
    schema.offers = {
      "@type": "AggregateOffer",
      ...offerBase,
      "lowPrice": price.amount,
      "highPrice": maxPrice.amount,
      "offerCount": product.variants.edges.length,
    };
  }

  if (variantCount > 1) {
    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "@id": `${productAbsoluteUrl}#product-group`,
      "name": product.title,
      "description": schema.description,
      "url": productAbsoluteUrl,
      ...(schema.brand && { "brand": schema.brand }),
      "productGroupID": product.id.split('/').pop() || product.handle,
      "variesBy": [
        "https://schema.org/color",
        "https://schema.org/size"
      ],
      ...(schema.aggregateRating && { "aggregateRating": schema.aggregateRating }),
      "hasVariant": product.variants.edges.slice(0, 50).map(({ node }) => {
        const variantColor = node.selectedOptions.find((option) => option.name.toLowerCase() === 'color' || option.name.toLowerCase() === 'colour')?.value;
        const variantSize = node.selectedOptions.find((option) => option.name.toLowerCase() === 'size')?.value;
        const variantUrl = `${productAbsoluteUrl}?variant=${node.id.split('/').pop() || ''}`;
        const variantOffer = {
          "@type": "Offer",
          ...offerBase,
          "url": variantUrl,
          "price": node.price.amount,
          "availability": node.availableForSale ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        };

        const variantSchema: any = {
          "@type": "Product",
          "name": `${product.title} - ${node.title}`,
          "sku": node.sku || undefined,
          "url": variantUrl,
          ...(node.barcode && /^\d{8,14}$/.test(node.barcode) ? { "gtin13": node.barcode } : {}),
          ...(variantColor ? { "color": variantColor } : {}),
          ...(variantSize ? { "size": variantSize } : {}),
          ...(node.image?.url ? { "image": node.image.url } : {}),
          "isVariantOf": { "@id": `${productAbsoluteUrl}#product-group` },
          "offers": variantOffer,
        };

        return JSON.parse(JSON.stringify(variantSchema));
      }),
    };
  }
  
  return schema;
}

/**
 * Generate combined @graph with BreadcrumbList and Product
 * This creates a unified knowledge graph entity
 * 
 * @param product - Shopify product data
 * @param productUrl - Product URL path
 * @param breadcrumbSchema - Pre-generated breadcrumb schema
 * @param siteUrl - Full site URL
 * @param reviewStats - Optional review statistics
 * @returns Unified @graph with all schemas
 */
export function generateProductSchemaGraph(
  product: ShopifyProduct,
  productUrl: string,
  breadcrumbSchema: any,
  siteUrl: string = '',
  reviewStats?: ReviewStats | null
) {
  const productSchema = generateProductSchema(product, productUrl, siteUrl, reviewStats);
  const breadcrumbs = Array.isArray(breadcrumbSchema) ? breadcrumbSchema : [breadcrumbSchema];
  
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...breadcrumbs,
      productSchema
    ]
  };
}

