# Internal link audit — code checklist (repo)

Canonical URL logic: [lib/shopify/products.ts](../../lib/shopify/products.ts) (`getProductCanonicalUrl`, `getProductCanonicalUrls`). Batch-by-handle helper: [lib/shopify/product-href.ts](../../lib/shopify/product-href.ts). Client/API bridge: [app/api/products/canonical-hrefs/route.ts](../../app/api/products/canonical-hrefs/route.ts).

## Implemented (template / app output)

| Area | Notes |
|------|--------|
| Related products | [components/product/RelatedProducts.tsx](../../components/product/RelatedProducts.tsx) — `productHrefByHandle` from product pages |
| Product PDPs | [app/products/[handle]/page.tsx](../../app/products/[handle]/page.tsx), [app/[category]/[subcategory]/[product]/page.tsx](../../app/[category]/[subcategory]/[product]/page.tsx), [app/[...slug]/page.tsx](../../app/[...slug]/page.tsx) |
| Header search | [app/api/search/route.ts](../../app/api/search/route.ts) `canonicalPath`; [components/header/SearchBar.tsx](../../components/header/SearchBar.tsx) |
| Cart page | [app/cart/page.tsx](../../app/cart/page.tsx) + [components/cart/CartPageContent.tsx](../../components/cart/CartPageContent.tsx) |
| Cart drawer | [components/cart/CartDrawer.tsx](../../components/cart/CartDrawer.tsx) — POST canonical-hrefs |
| Best deals slider | [components/home/BestDealsSliderContainer.tsx](../../components/home/BestDealsSliderContainer.tsx), [components/BestDealsSlider.tsx](../../components/BestDealsSlider.tsx) |
| Reviews listing | [app/reviews/page.tsx](../../app/reviews/page.tsx) |
| Product cards by handle | [lib/shopify/products-by-handles.ts](../../lib/shopify/products-by-handles.ts) — fetches `productType` for canonical resolution |
| Sitemap (products batches) | [lib/sitemap/products.ts](../../lib/sitemap/products.ts) |
| Export sitemap script | [scripts/export-sitemap.ts](../../scripts/export-sitemap.ts) |
| Weekly email curated products | [lib/email-platform/auto-weekly/render.ts](../../lib/email-platform/auto-weekly/render.ts) |
| Collection JSON-LD | [lib/utils/collection-schema-fast.ts](../../lib/utils/collection-schema-fast.ts) — uses `canonicalProductUrls` from callers (already wired on category/brand/sale pages) |

## Still acceptable `/products/` or legacy references

| Location | Reason |
|----------|--------|
| [lib/shopify/products.ts](../../lib/shopify/products.ts) | Fallback when no category mapping |
| [middleware.ts](../../middleware.ts), [lib/redirects/maps.ts](../../lib/redirects/maps.ts) | Redirect handling, not editorial links |
| [app/robots.ts](../../app/robots.ts) | Crawl policy |
| Admin / scripts / GMC / Yotpo APIs | URLs for admin, feeds, or third-party APIs — review only if they affect **internal** HTML links |
| [components/ProductCard.tsx](../../components/ProductCard.tsx) | Fallback when `canonicalUrl` prop omitted — callers should pass path when known |

## Collection / blog template links

No `href="/collections/` or `/blogs/news/` matches in `app/` / `components/` besides redirect infrastructure and docs. Legacy paths in **CMS HTML** are handled in the runbook (Task 10).

## Ops scripts

| Script | Purpose |
|--------|---------|
| [scripts/internal-link-audit/normalize-sf-internal-redirects.ts](../../scripts/internal-link-audit/normalize-sf-internal-redirects.ts) | Dedupe/normalise SF CSV paths |
| [scripts/internal-link-audit/list-collection-redirects.ts](../../scripts/internal-link-audit/list-collection-redirects.ts) | Dump sample of `redirects/collections.csv` |
