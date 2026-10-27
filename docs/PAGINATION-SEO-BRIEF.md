# Category pagination SEO — brief, decisions and implementation

Status: implemented (Oct 2026). Original brief: "The Equestrian: pagination SEO implementation brief" (supplied externally). This file records the requirements, the additions made after code review, and what was built.

## Objective

Category intro, long-form copy and FAQs render only on the main category page. Deeper product-list pages stay crawlable with real product and pagination links, and each valid unfiltered pagination URL has its own canonical.

Google guidance: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading

## Required behaviour

| Element | Page 1 (no cursor) | Valid deeper page |
|---|---|---|
| H1, breadcrumbs, silo nav, related categories | Render | Render |
| Intro / short description (incl. parent-collection sentence) | Render | Omit |
| RichContent, FAQ + FAQPage schema | Render | Omit |
| Products, product links, pagination links | Render | Render |
| Canonical (unfiltered, default sort) | Clean URL | URL + validated cursor |
| Indexable | Yes | Yes |

## Additions to the original brief (from code review)

1. **Unstable product order was a real bug, not a precaution.** `getProductIdsByCategory` used `SELECT DISTINCT` with no `ORDER BY`, and the default "featured" sort returned `0` for all ties. Page boundaries could change on every cache refresh. Fixed with `ORDER BY` in SQL and a full tie-break in the sort.
2. **Expect GSC 404 noise.** Cursors go stale as products are removed or change stock. Those URLs return 404 by design. Do not "fix" with redirects to page 1.
3. **Code facts:** opt-in DB-first path (`USE_DB_COLLECTIONS_FROM_POSTGRES`) has its own `db:N` cursor; `getProductsByCategory` is also called by `lib/redirects/empty-category-redirect.ts` and `lib/blog/article-commerce.ts` (no cursor); FAQPage schema lives inside `components/collection/FAQSection.tsx`; ItemList already used the current slice; no test framework exists.

## Decisions (owner-approved)

- **Featured order:** in-stock first → newest first → product ID.
- **Other sorts:** unchanged, plus a product-ID tie-break.
- **Invalid / stale cursor:** 404.

## Implementation

| File | Change |
|---|---|
| `lib/pagination/category-cursor.ts` | `paginateById` — validity, slice, next/previous cursors; `CATEGORY_PAGE_SIZE` |
| `lib/pagination/category-query.ts` | Search-param parsing, cursor format check, default-view detection |
| `lib/pagination/category-page-guard.ts` | Empty cursor → 308 without it; malformed/repeated/unknown → `notFound()` |
| `lib/products/category-sort.ts` | Deterministic comparator |
| `lib/seo/category-canonical.ts` | Canonical URL builder + self-canonical rule |
| `lib/seo/resolve-category-canonical.ts` | Canonical for `generateMetadata` via the same cached fetch |
| `lib/shopify/products.ts` | `getProductsByCategory` returns `pagination`; uses the helpers above |
| `lib/shopify/category-collection-fetch.ts` | Cache version `v6` (result shape changed) |
| `lib/db/product-allocations.ts` | `ORDER BY product_id_compact` |
| `lib/utils/collection-schema-fast.ts` | Optional `pageUrl` for CollectionPage `@id`/`url` |
| `components/filters/ProductGridWithFilters.tsx` | `previousCursor` prop; Previous uses current pathname (fixes 3-level pages linking to the parent) |
| `app/[category]/page.tsx`, `app/[category]/[subcategory]/page.tsx`, `app/[category]/[subcategory]/[product]/page.tsx` (PLP branch only) | Guards, page-1-only copy, self-canonical, schema page URL |
| `scripts/test-category-pagination.ts` | 12 checks; `npm run test:category-pagination` |

### Rules as built
- Cursor valid only if it is in the current filtered + sorted sequence and a non-empty page follows.
- Cursor format: Shopify product GID, or `db:N` / `page:N` (DB-first path). Anything else → 404 before fetching.
- Self-canonical only when the cursor is valid AND there are no `brand`, `size`, `color`, `price`, `inStock`, `saleCategory` params AND sort is absent or `featured`. Tracking params are ignored and never copied into the canonical.
- Previous: start `s`, size `n` → previous start `max(0, s − n)`; cursor omitted at 0, else the ID just before it.
- Brand, on-sale and warehouse pages use the same grid but don't pass `previousCursor`, so their behaviour is unchanged.
- `robots.ts` unchanged: `cursor` is crawlable; facet params stay blocked.

## Verification (local production build)

| Case | Result |
|---|---|
| `/clothing` | 200, clean canonical, intro + FAQ present |
| `/rider?cursor=<valid>&utm_source=test` | 200, canonical `/rider?cursor=…` (utm stripped), no intro/RichContent/FAQ/FAQPage, schema `@id` = page URL, Previous → `/rider` |
| `/rider?cursor=<valid>&sort=newest` | 200, clean canonical |
| `?cursor=` / `?cursor=&sort=newest` | 308 → same URL without cursor |
| Malformed, unknown GID, duplicate cursor (all 3 depths) | 404 status |
| 3-segment PDP | 200, canonical unchanged |
| `npx tsc --noEmit`, `npm run build`, `npm run test:category-pagination` | Pass |

**Limitation:** the local Storefront token sees almost none of the allocated products (`/clothing` → 1 product locally vs 1,841 live), so true page 2 / page 3 rendering was covered by unit checks, not end-to-end. Verify on a Vercel preview:
1. `/clothing` → follow Next twice → confirm different products, no intro/FAQ, self-canonical.
2. On page 3, Previous returns the page-2 products.
3. Last page has no Next link.
4. Search raw HTML for a distinctive category-body sentence and an FAQ question: present on page 1 only.

After deploy, inspect page 1 and a deeper page in Search Console (crawl allowed, user-declared canonical). Google's selected canonical can take time.
