# Production Profile Snapshot (2026-02-12)

Run details:
- Build command: `npm run build`
- Serve command: `npm run start -- -p 3010`
- Test routes: `/`, `/search?q=saddle`, `/cart`, `/clothing`, `/on-sale`
- Measurement method: Node fetch timing script (`total_ms`)

## Pass 1 (cold-ish)
- `/`: `1375.1ms`
- `/search?q=saddle`: `1371.7ms`
- `/cart`: `1370.8ms`
- `/clothing`: `14001.1ms`
- `/on-sale`: `6039.3ms`

## Pass 2 (warm-ish)
- `/`: `2029.5ms`
- `/search?q=saddle`: `1280.4ms`
- `/cart`: `1159.9ms`
- `/clothing`: `1156.2ms`
- `/on-sale`: `1934.9ms`

## Interpretation
- Collection-heavy routes show large cold-start penalties but improve significantly on warm runs.
- Search and cart are consistently around ~1.1-1.3s in this local production profile.
- Homepage and on-sale still show variability and need RUM-backed validation in Vercel for true user-facing medians/P95.

## Build blockers fixed during profiling
- `app/api/admin/email/sequences/route.ts`: explicit type for `.map()` callback parameter.
- `lib/email-platform/templates.ts`: normalize variable values to `Record<string, string>` before template substitution.
- `lib/reviews/review-email-cancellation.ts`: guard nullable `rowCount`.
- `lib/shopify/products.ts`: add explicit `ProductsResponse` annotation in recommendation pagination branch.

## Production Load Matrix (autocannon)

Configuration:
- Tool: `autocannon`
- Duration: `10s` per route
- Concurrency: `5` connections
- Target: production server on `http://127.0.0.1:3010`

| Route | Avg Latency | p99 Latency | Avg Req/Sec |
| --- | ---: | ---: | ---: |
| `/` | `1162.43ms` | `2166ms` | `4.0` |
| `/search?q=saddle` | `1670.56ms` | `3290ms` | `2.7` |
| `/cart` | `1512.00ms` | `3185ms` | `3.0` |
| `/clothing` | `1511.17ms` | `3130ms` | `3.0` |
| `/on-sale` | `2269.75ms` | `3169ms` | `2.0` |

Notes:
- `/on-sale` remains the slowest route under concurrent load.
- `/search` has moderate throughput pressure and higher tail latency than homepage.
- `/clothing` is much better than earlier cold-route spikes, but still has >3s p99 under this profile.

## Targeted Optimization Pass (on-sale + search)

Implemented:
- `lib/shopify/collections.ts`
  - `getCollectionWithPagination()` now returns `totalCount`, so `/on-sale` no longer does a second full Shopify pagination pass for count.
  - switched collection fetches from `no-store` to `force-cache` with collection tags.
  - removed heavy debug logging from the hot path.
- `app/on-sale/page.tsx`
  - removed `getCollectionProductCount()` call and now uses `totalCount` from the paginated fetch result.
- `app/search/SearchResults.tsx`
  - switched query fetch to `force-cache` with query tags.
- `app/api/search/route.ts`
  - added short-lived in-memory query cache (60s).
  - switched Shopify fetches to cache-friendly mode.
  - limited category image lookups to top 3 collection suggestions to reduce fan-out per keystroke query.

### Post-optimization load test (warm pass, 10s, 5 connections)

| Route | Before Avg Latency | After Avg Latency | Delta |
| --- | ---: | ---: | ---: |
| `/search?q=saddle` | `1670.56ms` | `1641.24ms` | `-29.32ms` |
| `/on-sale` | `2269.75ms` | `1809.84ms` | `-459.91ms` |

Notes:
- `/on-sale` shows a clear latency reduction under load after removing duplicate count pagination.
- `/search` improved slightly in this run; gains are modest and should be validated with Vercel RUM/P95 due variance.

## Vercel Cache Invalidation Hardening

Implemented webhook-driven cache busting for Shopify product changes:
- New helper: `lib/cache/shopify-revalidate.ts`
  - invalidates product tag: `product-{handle}`
  - invalidates shared search tag: `search`
  - invalidates collection tag used by on-sale: `collection-on-sale`
  - revalidates key paths: `/`, `/on-sale`, `/search`, `/products/{handle}`
- Wired into Shopify product webhooks:
  - `app/api/webhooks/shopify/product-update/route.ts`
  - `app/api/webhooks/shopify/product-delete/route.ts`
- Added shared `search` tag to:
  - `app/search/SearchResults.tsx`
  - `app/api/search/route.ts`

Effect:
- Cache can stay aggressive for speed while product updates propagate quickly after Shopify webhook delivery.

### Internal revalidation endpoint

Added endpoint:
- `POST /api/internal/revalidate-shopify`

Auth:
- Requires `x-revalidate-secret` header.
- Header must match `INTERNAL_REVALIDATE_SECRET` (or fallback `REVALIDATE_SECRET`).

Payload:
```json
{
  "productHandle": "example-product-handle",
  "paths": ["/clothing", "/horse"],
  "tags": ["collection-clothing", "search"]
}
```

Use this endpoint for future webhook topics (inventory/collection/metafield changes) to trigger fast, targeted cache invalidation without duplicating logic.
