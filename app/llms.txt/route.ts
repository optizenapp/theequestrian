import { NextRequest, NextResponse } from 'next/server';
import { entityTag, ifNoneMatchSatisfied, notModifiedResponse } from '@/lib/http/conditional-response';

export const revalidate = 3600;

const LLMS_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=7200';

export async function GET(request: NextRequest) {
  const siteUrl = 'https://www.theequestrian.com.au';

  const content = `# The Equestrian

> Australia's specialist equestrian retailer. We sell horse riding gear, saddlery, rider apparel, stable supplies, and selected pet essentials. Based in Australia, shipping nationwide. All prices are in AUD.

The Equestrian (${siteUrl}) is structured for clear category discovery and product intent. Primary content lives under nested category paths and brand pages. Legacy Shopify collection/tag URLs are deprecated.

## Site Scope For LLM Crawlers

- Domain: ${siteUrl}
- Primary language: English (Australia)
- Currency: AUD
- Core audience: Horse owners, riders, stables, and equestrian professionals in Australia
- High-signal content types:
  - Category landing pages
  - Brand landing pages
  - Product detail pages
  - Sizing and policy pages

## Canonical URL Conventions

- Prefer category-based product URLs as canonical when available:
  - \`/${"{"}category}/product-handle\`
  - \`/${"{"}category}/${"{"}subcategory}/product-handle\`
  - \`/${"{"}category}/${"{"}subcategory}/${"{"}subsubcategory}/product-handle\`
- Brand pages:
  - \`/brands\`
  - \`/brands/${"{"}brand-handle}\`
- Legacy \`/collections/*\` paths are deprecated and may redirect or return 410.
- \`/products/*\` may exist for compatibility but is not always canonical.

## Primary Shopping Sections

### Horse

- [Saddles](${siteUrl}/horse/saddles)
- [Bridles](${siteUrl}/horse/bridles)
- [Bits](${siteUrl}/horse/bits)
- [Saddlecloths](${siteUrl}/horse/saddlecloths)
- [Boots](${siteUrl}/horse/boots)
- [Rugs](${siteUrl}/horse/rugs)
- [Grooming](${siteUrl}/horse/grooming)
- [Health](${siteUrl}/horse/health)

### Rider

- [Footwear](${siteUrl}/rider/footwear)
- [Breeches](${siteUrl}/rider/breeches)
- [Helmets](${siteUrl}/rider/helmets)
- [Apparel](${siteUrl}/rider/apparel)
- [Gloves](${siteUrl}/rider/gloves)
- [Safety](${siteUrl}/rider/safety)

### Stable

- [Stable](${siteUrl}/stable)
- [Stable Equipment](${siteUrl}/stable/equipment)
- [Fencing](${siteUrl}/stable/fencing)
- [Arena](${siteUrl}/stable/arena)

### Brands

- [Brands Index](${siteUrl}/brands)
- Brand pages are first-class landing pages and include curated copy plus product listings.

## Key Informational Pages

- [About](${siteUrl}/about)
- [Contact](${siteUrl}/contact)
- [FAQ](${siteUrl}/faq)
- [Sizing](${siteUrl}/sizing)
- [Shipping & Delivery](${siteUrl}/shipping-delivery)
- [Returns & Refunds](${siteUrl}/returns-refunds)
- [Privacy Policy](${siteUrl}/privacy-policy)
- [Terms of Service](${siteUrl}/terms-of-service)
- [Sale](${siteUrl}/on-sale)

## Product Interpretation Guidance

- Product taxonomy is hierarchical (up to 3 category levels before product handle).
- A product may appear in multiple discovery contexts (category and brand), but canonical URL should be treated as category-first.
- Brand association should be inferred from:
  - Product brand/vendor identity
  - Brand landing page handle and naming
  - Product metadata and content
- For comparison and retrieval tasks, prefer:
  - Canonical product URL
  - Product title + brand + category path
  - Safety/size context where relevant (helmets, boots, breeches, rugs, etc.)

## Deprecated / Low-Value Paths

- Avoid using legacy Shopify \`/collections/*\` URLs as authoritative.
- Ignore feed-like and app-generated junk URLs (atom/rss and app utility paths).
- Ignore crawl-junk tag-combination URLs containing \`+\`.

## Discovery Endpoints

- [Sitemap](${siteUrl}/sitemap.xml)
- [Robots](${siteUrl}/robots.txt)
- [LLMs](${siteUrl}/llms.txt)
`;

  const etag = entityTag(content);
  const cacheHeaders = {
    ETag: etag,
    'Cache-Control': LLMS_CACHE_CONTROL,
  };
  if (ifNoneMatchSatisfied(request.headers.get('if-none-match'), etag)) {
    return notModifiedResponse(cacheHeaders) as NextResponse;
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...cacheHeaders,
    },
  });
}






