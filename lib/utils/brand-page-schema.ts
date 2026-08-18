/**
 * Schema.org @graph for /brands/[handle] pages.
 *
 * CollectionPage about a Brand, with a url-only ItemList. WebSite/Organization
 * are referenced by @id from the sitewide layout graph — not redeclared here.
 */

import type { ShopifyProduct } from '@/types/shopify';
import type { FAQItem } from '@/lib/content/collections';

export interface BrandRelatedCollection {
  name: string;
  url: string;
}

export interface BrandPageSchemaInput {
  brand: {
    handle: string;
    name: string;
    h1?: string | null;
    description?: string | null;
    brandDescription?: string | null;
    logoUrl?: string | null;
    breadcrumbLabel?: string | null;
  };
  products: ShopifyProduct[];
  productUrls?: Map<string, string> | Record<string, string>;
  siteUrl: string;
  maxProductsInSchema?: number;
  faqs?: FAQItem[];
  relatedCollections?: BrandRelatedCollection[];
}

function lookupPath(
  productUrls: NonNullable<BrandPageSchemaInput['productUrls']>,
  id: string,
  handle: string
): string | undefined {
  return productUrls instanceof Map
    ? productUrls.get(id) || productUrls.get(handle)
    : productUrls[id] || productUrls[handle];
}

function collectCanonicalUrls(
  products: ShopifyProduct[],
  productUrls: BrandPageSchemaInput['productUrls'],
  baseUrl: string,
  max: number
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (path: string | null | undefined) => {
    if (!path || path.startsWith('/products/') || out.length >= max) return;
    const abs = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (seen.has(abs)) return;
    seen.add(abs);
    out.push(abs);
  };

  if (productUrls) {
    for (const p of products) push(lookupPath(productUrls, p.id, p.handle));
    if (out.length < max) {
      const rest = productUrls instanceof Map ? productUrls.values() : Object.values(productUrls);
      for (const path of rest) push(path);
    }
  }

  return out;
}

export function generateBrandPageSchema(input: BrandPageSchemaInput) {
  const baseUrl = input.siteUrl.replace(/\/+$/, '');
  const brandUrl = `${baseUrl}/brands/${input.brand.handle}`;
  const brandId = `${brandUrl}#brand`;
  const pageId = `${brandUrl}#webpage`;
  const itemListId = `${brandUrl}#products`;
  const faqId = `${brandUrl}#faq`;
  const logoId = `${brandUrl}#logo`;
  const max = input.maxProductsInSchema ?? 12;
  const faqs = (input.faqs || []).filter((f) => f.question?.trim() && f.answer?.trim());
  const pageName = input.brand.h1?.trim() || input.brand.name;
  const pageDescription =
    input.brand.description?.trim() || `Shop ${input.brand.name} at The Equestrian.`;
  const brandDescription = input.brand.brandDescription?.trim();
  const productUrls = collectCanonicalUrls(input.products, input.productUrls, baseUrl, max);

  const logoObject = input.brand.logoUrl
    ? { '@type': 'ImageObject', '@id': logoId, url: input.brand.logoUrl }
    : null;

  const brandEntity: Record<string, unknown> = {
    '@type': 'Brand',
    '@id': brandId,
    name: input.brand.name,
    url: brandUrl,
  };
  if (brandDescription) brandEntity.description = brandDescription;
  if (logoObject) {
    brandEntity.logo = { '@id': logoId };
    brandEntity.image = { '@id': logoId };
  }

  const itemList = {
    '@type': 'ItemList',
    '@id': itemListId,
    numberOfItems: productUrls.length,
    itemListElement: productUrls.map((url, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url,
    })),
  };

  const hasPart: Record<string, unknown>[] = [];
  if (faqs.length > 0) hasPart.push({ '@id': faqId });
  for (const related of input.relatedCollections || []) {
    hasPart.push({ '@type': 'CollectionPage', name: related.name, url: related.url });
  }

  const collectionPage: Record<string, unknown> = {
    '@type': 'CollectionPage',
    '@id': pageId,
    url: brandUrl,
    name: pageName,
    description: pageDescription,
    inLanguage: 'en-AU',
    isPartOf: { '@id': `${baseUrl}#website` },
    publisher: { '@id': `${baseUrl}#organization` },
    breadcrumb: { '@id': `${brandUrl}#breadcrumbs` },
    about: { '@id': brandId },
    mainEntity: { '@id': itemListId },
  };
  if (logoObject) collectionPage.primaryImageOfPage = { '@id': logoId };
  if (hasPart.length > 0) collectionPage.hasPart = hasPart;

  const graph: Record<string, unknown>[] = [
    ...(logoObject ? [logoObject] : []),
    {
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
    },
    brandEntity,
    collectionPage,
    itemList,
  ];

  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': faqId,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
