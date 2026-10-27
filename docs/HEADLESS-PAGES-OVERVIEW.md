# The Equestrian — Headless Storefront & Page Architecture

Production: https://www.theequestrian.com.au · Checkout: https://checkout.theequestrian.com.au (Shopify-hosted)
Dev: `npm run dev` → port 3003. Read `AGENTS.md` at the repo root for ground rules — this doc explains how pages work.

---

## 1. What "headless" means here

This is NOT a Shopify Liquid theme. Shopify is the commerce backend only.

| Layer | Tech | Owns |
|---|---|---|
| Frontend | Next.js 16 App Router, React 19, Tailwind 4, Vercel (`syd1`) | All HTML, URLs, SEO, metadata, robots, sitemap |
| Commerce data | Shopify Storefront API `2024-10` (`lib/shopify/client.ts`) | Products, variants, prices, availability, cart |
| Admin writes | Shopify Admin API `2025-01` (`lib/shopify/admin-client.ts`), server-only | Metafields, draft orders, inventory jobs |
| Catalogue + CMS | Neon Postgres (`lib/db/client.ts`) | Which products live on which URL (allocations), category SEO copy, brands, reviews, articles, menus, redirects |
| Checkout | Shopify-hosted | Handoff via `cart.checkoutUrl` (normalised by `lib/shopify/cart-utils.ts`) |

Consequences:
- Shopify theme concepts (`pagination.liquid`, `paginate`, theme apps, `/collections/*` URLs, Shopify SEO settings) do not apply. SEO/crawl fixes happen in Next.js code.
- Shopify collections do NOT drive category pages. Product placement comes from Neon allocations.
- Shopify app scripts don't run automatically. Reviews are first-party in Neon.

---

## 2. URL map (routes in `app/`)

| URL | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Home (Neon content, `unstable_cache` 300s) |
| `/{category}` | `app/[category]/page.tsx` | Top-level PLP (`/horse`, `/rider`, `/clothing`, `/pet`, `/accessories`) |
| `/{category}/{subcategory}` | `app/[category]/[subcategory]/page.tsx` | Sub-category PLP |
| `/{category}/{subcategory}/{third}` | `app/[category]/[subcategory]/[product]/page.tsx` | **Dual-purpose**: sub-subcategory PLP OR canonical PDP |
| `/products/{handle}` | `app/products/[handle]/page.tsx` | Legacy PDP fallback → redirects to canonical |
| `/brands`, `/brands/{handle}` | `app/brands/*` | Brand index + hubs |
| `/news/*` | `app/news/*` | Articles |
| `/on-sale` | `app/on-sale` | Sale collection |
| `/search`, `/cart` | `app/search`, `app/cart` | Not indexed |
| `/[...slug]` | `app/[...slug]/page.tsx` | Catch-all product resolver → redirects to canonical |
| `/admin/*` | `app/admin/*` | Custom merchant CMS (own auth) |
| `/robots.txt` | `app/robots.ts` | Generated robots rules |
| `/sitemap.xml` | `app/sitemap.ts` + `app/sitemap/*` | Sitemap index + shards |

`app/[category]/page-postgres.tsx` is an alternate, NOT-live PLP path.

### Third-segment resolution (`[category]/[subcategory]/[product]`)
1. Resolve slug → product handle (`resolveProductHandleFromSlug`, Neon overrides).
2. Product exists, has image, published headless, canonical == current path → render PDP.
3. Manual redirects (`followManualRedirectUnlessProductRestored`).
4. Segment is a category in Neon `collection_content` OR has mapped product types → sub-subcategory PLP.
5. Otherwise product: missing → redirect (`lib/redirects/missing-product-redirect.ts`); wrong path → redirect to canonical.

---

## 3. Product canonical URLs

Canonical PDP URL is `/{category}/{subcategory}/{product}`. Resolution (`getProductCanonicalUrl`, `lib/shopify/product-href.ts`):
1. Neon allocations (`lib/db/product-allocations.ts`)
2. Shopify metafield `custom.primary_collection`
3. `productType` → mapping (`lib/mapping/collection-mapping.ts`)
4. `/products/{handle}`

---

## 4. Category PLP rendering

```
request /{category}?cursor=&brand=&size=&color=&sort=
  → manual redirect check (lib/redirects/manual.ts)
  → requireCategoryCursor: empty cursor → 308 without it; malformed/repeated → 404
  → getProductsByCategoryForCollectionPage (unstable_cache 48h, tag CATEGORY_PRODUCT_LISTINGS_CACHE_TAG)
       → getProductsByCategory (lib/shopify/products.ts)
            → Neon allocation IDs (ORDER BY id) → Shopify Storefront batch fetch
            → filter (brand via Neon, size/colour from variants)
            → sort: compareCategoryProducts (lib/products/category-sort.ts)
            → paginateById (lib/pagination/category-cursor.ts): 36 per page
  → requireValidCategoryPage: unknown/stale cursor → 404 (before legacy product fallback)
  → render: JSON-LD, H1, [page 1 only: intro, RichContent, FAQ], grid, related categories
```

- `revalidate = 172800`, `preferredRegion = 'syd1'`.
- Live price/stock hydrated client-side: `hooks/useLiveProductStatus.ts` → `POST /api/products/status`.
- Category copy from Neon via `lib/content/collections.ts`.
- Cache busting: `app/api/internal/revalidate-collection/route.ts`, admin allocation routes.

### Pagination
See `docs/PAGINATION-SEO-BRIEF.md`. Summary:
- `?cursor=<product GID>` = last product of the previous page in the sorted sequence (our own cursor, not Shopify's).
- Sort order is deterministic: in-stock first, then the chosen sort, then newest, then product ID.
- Unfiltered default-sort pages with a valid cursor self-canonicalise (`lib/seo/category-canonical.ts`). Filtered/sorted views canonicalise to the clean path (and are robots-blocked).
- Previous links go to the actual previous page (`previousCursor` prop on `ProductGridWithFilters`).
- Opt-in DB-first path (`USE_DB_COLLECTIONS_FROM_POSTGRES`) uses `db:N` offsets; validity = "page has products"; Previous goes to page 1.

---

## 5. PDP rendering (`renderProductPage` in the 3-segment route)
- Storefront product, Neon brand, identifiers, bullets, description, sizing, videos, shipping display, reviews, related products.
- JSON-LD: `generateProductSchemaGraph` + breadcrumbs. Metadata: `lib/seo/product-metadata.ts`.
- CRO variants: `lib/products/pdp-cro-trial.ts`.
- `Product.vendor` = marketplace vendor; displayed brand = Neon brand.

---

## 6. Caching / ISR (`lib/config/route-revalidate.ts`)
| What | TTL |
|---|---|
| PLP shell + 3-segment route | 172800s |
| PDP / catch-all | 300s |
| Brand hub | 3600s |
| On-sale | 3600s |
| News | 300s |
| Shopify `force-cache` GraphQL | 900s |
| Home data | 300s |
| Cart | never |

---

## 7. SEO plumbing
- `generateMetadata` per route. Site URL: `lib/seo/site-url.ts`.
- Facet params: canonical → clean path; robots disallows facet params.
- Redirects: `middleware.ts`, `lib/redirects/maps.ts` (`npm run redirects:generate`), Neon `lib/redirects/manual.ts`.
- Never change/remove a live URL without a redirect.

---

## 8. Cart & checkout (don't touch without asking)
- Server Actions in `app/actions/cart.ts`; `cache: 'no-store'`.
- Cart ID in `localStorage.cartId` + cookie `shopify_cart_id` (not httpOnly, by design).
- Checkout = `cart.checkoutUrl` → `normalizeCheckoutUrl()`.
- Pre-checkout shipping is our estimate (Neon `collective_shipping_rates`).

---

## 9. Local environment caveat
The Storefront token in local `.env*` files sees only a small subset of allocated products (e.g. `/clothing` → 1 of ~2,276). Production (Vercel env) sees the full catalogue. Multi-page PLP behaviour must be verified on a Vercel preview, not locally.

## 10. Key files
`lib/shopify/client.ts` · `lib/shopify/admin-client.ts` · `lib/shopify/queries.ts` · `lib/shopify/products.ts` · `lib/shopify/category-collection-fetch.ts` · `lib/pagination/*` · `lib/products/category-sort.ts` · `lib/seo/category-canonical.ts` · `lib/db/product-allocations.ts` · `lib/mapping/collection-mapping.ts` · `lib/content/collections.ts` · `components/filters/ProductGridWithFilters.tsx` · `app/robots.ts` · `middleware.ts` · `lib/config/route-revalidate.ts` · `types/shopify.ts`
