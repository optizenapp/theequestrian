/**
 * Schema.org @graph for /brands/[handle] pages.
 *
 * Models the page as a CollectionPage whose mainEntity is the Brand, with an
 * ItemList of products linking back to the Brand via stable @id. This is the
 * Google-recommended pattern for brand hubs and beats a generic CollectionPage
 * because it gives the Brand its own entity in the knowledge graph.
 */

import type { ShopifyProduct } from '@/types/shopify';

export interface BrandPageSchemaInput {
  brand: {
    handle: string;
    name: string;
    description?: string | null;
    logoUrl?: string | null;
    breadcrumbLabel?: string | null;
  };
  products: ShopifyProduct[];
  totalProductCount: number;
  productUrls?: Map<string, string> | Record<string, string>;
  siteUrl: string;
  maxProductsInSchema?: number;
}

function getCanonicalProductPath(
  handle: string,
  productUrls?: Map<string, string> | Record<string, string>
): string {
  if (!productUrls) return `/products/${handle}`;
  if (productUrls instanceof Map) return productUrls.get(handle) || `/products/${handle}`;
  return productUrls[handle] || `/products/${handle}`;
}

export function generateBrandPageSchema(input: BrandPageSchemaInput) {
  const baseUrl = input.siteUrl.replace(/\/+$/, '');
  const brandPath = `/brands/${input.brand.handle}`;
  const brandUrl = `${baseUrl}${brandPath}`;
  const brandId = `${brandUrl}#brand`;
  const pageId = `${brandUrl}#webpage`;
  const itemListId = `${brandUrl}#products`;
  const orgId = `${baseUrl}#organization`;
  const max = input.maxProductsInSchema ?? 12;

  const brandEntity: Record<string, unknown> = {
    '@type': 'Brand',
    '@id': brandId,
    name: input.brand.name,
    url: brandUrl,
  };
  if (input.brand.description) brandEntity.description = input.brand.description;
  if (input.brand.logoUrl) {
    brandEntity.logo = { '@type': 'ImageObject', url: input.brand.logoUrl };
    brandEntity.image = input.brand.logoUrl;
  }

  const breadcrumbList = {
    '@type': 'BreadcrumbList',
    '@id': `${brandUrl}#breadcrumbs`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Brands', item: `${baseUrl}/brands` },
      {
        '@type': 'ListItem',
        position: 3,
        name: input.brand.breadcrumbLabel || input.brand.name,
        item: brandUrl,
      },
    ],
  };

  const itemListElements = input.products.slice(0, max).map((p, i) => {
    const productPath = getCanonicalProductPath(p.handle, input.productUrls);
    const productUrl = `${baseUrl}${productPath.startsWith('/') ? productPath : `/${productPath}`}`;
    const image = p.images?.edges?.[0]?.node?.url;
    const price = p.priceRange?.minVariantPrice;
    return {
      '@type': 'ListItem',
      position: i + 1,
      url: productUrl,
      item: {
        '@type': 'Product',
        '@id': `${productUrl}#product`,
        name: p.title,
        url: productUrl,
        ...(image ? { image } : {}),
        brand: { '@id': brandId },
        ...(price
          ? {
              offers: {
                '@type': 'Offer',
                price: price.amount,
                priceCurrency: price.currencyCode,
                availability: p.availableForSale
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
                url: productUrl,
              },
            }
          : {}),
      },
    };
  });

  const itemList = {
    '@type': 'ItemList',
    '@id': itemListId,
    numberOfItems: input.totalProductCount,
    itemListElement: itemListElements,
  };

  // mainEntity → ItemList is the Google-recommended pattern for product
  // collection pages. The Brand is surfaced via `about` (valid target) and as
  // a top-level entity in the @graph so it can be linked from PDPs by @id.
  const collectionPage = {
    '@type': 'CollectionPage',
    '@id': pageId,
    url: brandUrl,
    name: input.brand.name,
    description: input.brand.description || `Shop ${input.brand.name} at The Equestrian.`,
    inLanguage: 'en-AU',
    isPartOf: { '@type': 'WebSite', '@id': `${baseUrl}#website` },
    publisher: { '@id': orgId },
    breadcrumb: { '@id': `${brandUrl}#breadcrumbs` },
    about: { '@id': brandId },
    mainEntity: { '@id': itemListId },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbList, brandEntity, collectionPage, itemList],
  };
}
