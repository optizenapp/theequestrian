# Agent Instructions — The Equestrian (Headless Shopify + Next.js)

Verified against this repo. Do not substitute a generic Hydrogen / pnpm / “Storefront-only” template.

Production: https://www.theequestrian.com.au
Checkout: https://checkout.theequestrian.com.au (Shopify-hosted)
Dev: `npm run dev` → port **3003**

---

## Stack (verified)

- Next.js **16** App Router, React **19**, TypeScript, Tailwind CSS **4**
- React Server Components by default; `'use client'` only for interactivity
- Shopify **Storefront API** GraphQL via `lib/shopify/client.ts`
- Shopify **Admin API** GraphQL/REST from **server-only** code (API routes, crons, scripts) — never from the client
- Cart: Shopify Cart API (`app/actions/cart.ts`)
- Checkout: Shopify-hosted at `checkout.theequestrian.com.au`. We do not own checkout UI.
- Hosting: **Vercel** (`preferredRegion: 'syd1'` on many routes). `vercel.json` defines crons.
- Package manager: **npm** (lockfile: `package-lock.json`). Not pnpm.
- Catalog + CMS data: **Neon Postgres** (`lib/db/client.ts`) alongside Shopify
- Multi-vendor marketplace (Webkul / Collective / vendor Shopify stores)
- Custom `/admin` CMS (articles, email, SEO, categories, reviews, GMC, social)
- No GraphQL codegen. Types are hand-written in `types/shopify.ts`.

---

## 1. Ground rules

1. **Read before you write.** Inspect existing patterns and follow them. Consistency with this repo beats theoretical best practice.
2. **Never invent Storefront or Admin API fields.** Check `lib/shopify/queries.ts`, `types/shopify.ts`, or the docs for the version that file already pins. There is no codegen to catch hallucinations at build time.
3. **Scope discipline.** Change what was asked. Do not opportunistically refactor, reformat, upgrade dependencies, or “clean up” adjacent code.
4. **Say when you're unsure.** A flagged uncertainty is cheap. A confident wrong answer about tax, inventory, shipping, or pricing is not.
5. **No new dependencies without asking.** Especially anything that ships to the client.
6. Existing Cursor rules still apply: read the file first; surgical edits only; `npm run build` + `npx tsc --noEmit` after TS/TSX changes.

---

## 2. Data sources — which one to use

This is not a Shopify-only storefront. Pick the source that already owns the data:

| Data | Source of truth | Where |
|---|---|---|
| Live product / variant / price / availability | Shopify Storefront API | `lib/shopify/*`, `shopifyFetch` |
| Product allocations (which URL a product lives on) | Neon | `lib/db/product-allocations.ts` |
| Brand display name / brand pages | Neon + content tables | `lib/db/product-brand.ts`, `lib/content/brand-content.ts` |
| Collection / category tree + SEO copy | Neon + mapping | `lib/mapping/collection-mapping.ts`, `lib/content/collections.ts` |
| Reviews | Neon (first-party; Yotpo is historical import only) | `lib/reviews/*` |
| Shipping estimates (cart parcels / GMC) | Neon `collective_shipping_rates` | `lib/db/collective-shipping-rates.ts` |
| Articles / news | Neon | `app/news/*`, `app/admin/articles/*` |
| Mega menu, home sections, static pages | Neon | `lib/content/*` |
| Cart + checkout totals Shopify will charge | Shopify Cart API | `app/actions/cart.ts` |
| Admin writes (draft orders, metafields, inventory jobs) | Shopify Admin API | `lib/shopify/admin-client.ts` |

**Never call the Admin API from a client component or anything prefixed `NEXT_PUBLIC_`.** Server routes, crons, and `scripts/` only.

If a task seems to need Admin API from the storefront render path, stop and ask.

---

## 3. Shopify APIs

### Storefront

- Client: `lib/shopify/client.ts`
- Version is **hardcoded** today: `2024-10` (`https://${SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`)
- Auth: `SHOPIFY_STOREFRONT_ACCESS_TOKEN` (server-only). Not `NEXT_PUBLIC_`.
- Queries live in `lib/shopify/queries.ts`. Shared card shape: `lib/shopify/fragments/product-card.ts`.
- Default cache is `force-cache` with `SHOPIFY_GRAPHQL_FORCE_CACHE_REVALIDATE_SECONDS` (900s). Cart must pass `cache: 'no-store'`.
- Use cache tags when adding new fetches. Tag by handle / resource, not blanket revalidation.
- Always paginate. `first: 250` is a ceiling, not a strategy.
- Query only what is rendered. Deep nesting on collection pages is the usual cost blow-up.

### Admin

- Client: `lib/shopify/admin-client.ts`
- Version is **hardcoded** today: `2025-01`
- Auth: `SHOPIFY_ADMIN_ACCESS_TOKEN` (server-only). Must never appear in client bundles, `NEXT_PUBLIC_*`, or logs.
- Always `cache: 'no-store'`.
- REST helpers also exist: `lib/shopify/vendor-shopify-rest.ts`, `lib/shopify/marketplace-inventory-rest.ts` (`2025-01`).
- **Scripts and older files still hardcode other versions** (`2023-10`, `2024-01`, `2024-10`). Do not “fix” those unless asked. Do not add a new inline version — copy the nearest existing helper.

### No codegen

- There is no `codegen` script. Do not invent one unless asked.
- After changing a query, update `types/shopify.ts` and every caller by hand.
- Mutations return `userErrors` in the payload, not as thrown exceptions. Cart attribute updates already check them. Other cart mutations currently throw on transport failure only — if you touch those mutations, handle `userErrors`. Silent failure means a customer thinks something was added and it wasn't.

---

## 4. URLs, routing, redirects

Canonical storefront URLs are **not** `/products/{handle}`:

```
/{category}                              → PLP
/{category}/{subcategory}                → PLP
/{category}/{subcategory}/{product}      → PDP
/products/{handle}                       → legacy PDP fallback
/brands/{handle}                         → brand hub
/news/{handle}                           → article
/search                                  → search
/cart                                    → cart
/[...slug]                               → catch-all product resolver
```

Product path resolution order (see `lib/shopify/product-href.ts`, `getProductCanonicalUrl`):

1. Neon product allocations
2. Shopify `custom.primary_collection` metafield
3. `productType` → collection mapping
4. `/products/{handle}` fallback

**Never change or remove a live URL without a redirect.**

Redirects:

- Build step: `npm run redirects:generate` (`scripts/generate-redirects.ts`) — runs automatically in `dev` and `build`
- Maps: `lib/redirects/maps.ts`
- Edge logic: `middleware.ts` (www force, brand consolidations, 410s, legacy `/collections/*`, `/cart/c/*`)
- Manual DB redirects: `lib/redirects/manual.ts`
- Apex `theequestrian.com.au` → `www.theequestrian.com.au` (301)

Faceted filter query params must not become independent indexable URLs — canonical tags point at the clean collection path.

---

## 5. Rendering and caching

- Server Components by default. Do not put `'use client'` on a layout or page — that pulls the whole subtree into the client bundle.
- **Never fetch Shopify from a client component.** Fetch on the server, pass props, or use a Server Action / Route Handler.
- ISR TTLs live in `lib/config/route-revalidate.ts`. Import those constants — do not invent new magic numbers.

| Route / fetch | TTL |
|---|---|
| Category / subcategory PLP shell | 48h (`172800`) |
| PDP | 300s |
| Brand hub | 3600s |
| News | 300s |
| Shopify `force-cache` GraphQL | 900s |
| Home `unstable_cache` | 300s |
| Cart | **never cached** (`no-store`) |

- `generateStaticParams` only for a small top set (top-level categories: `horse`, `rider`, `clothing`, `pet`, `accessories`). Do not statically build the whole catalogue.
- Many pages set `preferredRegion = 'syd1'`. Keep that on new storefront routes.
- Price/stock on PLPs is often hydrated via a client status API after the cached shell. Do not block the shell on live inventory unless that is already the pattern on that page.
- Sitemap: `app/sitemap.ts` is an index. Child sitemaps under `app/sitemap/`. Production may rewrite `/sitemap*` to S3 via `SITEMAP_REWRITE_BASE_URL` in `next.config.ts`. Cron: `/api/cron/sitemaps`.

---

## 6. Cart

- Shopify Cart API. Mutations in `app/actions/cart.ts`. Queries in `lib/shopify/queries.ts`.
- Cart ID is stored in **both**:
  - `localStorage` key `cartId` (client, `components/cart/cart-context.tsx`)
  - Cookie `shopify_cart_id` (14 days, `sameSite: lax`, `secure` in prod). **Not httpOnly** today — server components need it; the client also persists via localStorage.
- Writes go through Server Actions (`createCart`, `addToCart`, `updateCart`, `removeFromCart`).
- There is **no `useOptimistic`**. Loading flags + `router.refresh()` is the current pattern. Do not add optimistic UI unless asked.
- Cart GraphQL is always `cache: 'no-store'`.
- Checkout handoff uses `cart.checkoutUrl` passed through `normalizeCheckoutUrl()` (`lib/shopify/cart-utils.ts`) so the customer lands on `checkout.theequestrian.com.au`.
- Perform / GA attribution: cart attribute `_sd_attr` via `updateCartAttributes` and `lib/analytics/perform.ts`.
- **Shopify is the source of truth for money Shopify will charge.** Shipping *estimates* shown in the drawer/cart are **ours** (Postgres collective rates + parcel grouping), not Shopify checkout shipping. Do not replace one with the other.
- Cart page currently sums line prices client-side for the displayed subtotal. Drawer uses `cart.cost.subtotalAmount`. Do not invent a third total.

---

## 7. Checkout and shipping

- Primary path: Cart API `checkoutUrl` → Shopify-hosted checkout on `checkout.theequestrian.com.au`.
- Alternate / legacy: draft-order checkout (`app/api/checkout/create-draft-order/route.ts`, `lib/shopify/draft-orders.ts`, `DraftOrderCheckoutButton`) creates an Admin draft order with custom line prices and returns a Shopify invoice URL. **Do not change checkout or draft-order pricing without asking.**
- Shipping UX copy: `lib/shipping/messaging.ts`.
- Parcel estimates: `components/cart/useCartParcelEstimate.ts` → `/api/cart/shipping-estimate` → Neon `collective_shipping_rates`.
- GMC shipping uses the same rate source (`lib/gmc/feed-shipping.ts`).
- Currency is **AUD**. Locale for money/dates should be `en-AU`. Do not rely on the ambient runtime locale (hydration mismatch). `PriceFilter` currently uses `en-US` — do not copy that.

---

## 8. Hydration safety

Treat each as a hard rule:

- Currency / number formatting must be deterministic. Pass `en-AU` (or an explicit locale) to `Intl.NumberFormat`.
- No `Date.now()`, `new Date()`, `Math.random()`, or `crypto.randomUUID()` in render. Move to `useEffect` or generate on the server and pass down.
- Geo / market-dependent pricing is not inferred in the browser during render. This store is AUD / Australian.
- Anything read from `localStorage` or cookies on the client (cart ID, etc.) must render a stable empty / placeholder first, then update after mount. Cart already does this.
- `suppressHydrationWarning` is not a fix. If used, it needs a comment explaining why the mismatch is unavoidable.
- Hydration warnings in the console are bugs. Do not merge with them present.

---

## 9. Performance

- Shopify images go through `next/image`. Allowlisted hosts in `next.config.ts`: `cdn.shopify.com`, `images.unsplash.com`, article S3 bucket. **Not** `shopifycdn.com`.
- Above-the-fold product images get `priority`; everything else lazy-loads.
- Always set `sizes` on responsive images.
- Request Shopify CDN images at the needed size (`lib/shopify/image-url.ts`) rather than downloading full-size.
- Watch the client bundle. Date libraries, carousels, and animation libraries are the usual offenders. `optimizePackageImports` already covers `react-icons`, `recharts`, email packages.
- Collection and PDP routes are the revenue path. LCP / CLS regressions there are blocking.
- PLP below-the-fold blocks are dynamically imported (`ProductGridWithFilters`, FAQ, related categories).

---

## 10. SEO

- Product and collection routes export `generateMetadata` (title, description, canonical, OG).
- Product JSON-LD: `lib/utils/product-schema.ts` (`Product` + offers, price, currency, availability, identifiers, AggregateRating when reviews exist).
- Collection JSON-LD: `lib/utils/collection-schema-fast.ts` + breadcrumbs.
- Reviews for schema come from Neon (`lib/reviews/stats.ts`), not Yotpo widgets.
- Sitemap is generated (index + sharded product / category / news / static). Not a hardcoded URL list.
- Never change a live path without a redirect. Handle / allocation changes must land in the redirect pipeline.
- Faceted states: canonical to the clean collection URL.
- Site URL helper: `lib/seo/site-url.ts` → `https://www.theequestrian.com.au`.
- SEO enrichment pipeline is a separate jobs system (`scripts/run-seo-enrichment.ts`, `docs/SEO-ENRICHMENT-ROLLOUT-RUNBOOK.md`). Do not run apply-mode jobs unless asked.

---

## 11. Accessibility

- Variant selectors should be real form controls with labels, not styled divs.
- Add-to-cart should announce success / failure to screen readers.
- Mini-cart and modals trap focus and restore it on close.
- Interactive elements keyboard-reachable with a visible focus ring.
- Price changes on variant switch should be announced, not only visually updated.

---

## 12. Security

- Admin token, webhook secrets, vendor OAuth secrets, DB URLs, SES / GMC keys: server-only.
- Only public tokens may be `NEXT_PUBLIC_*` (site URL, GA, Shopify Inbox script, store domain for checkout URL normalisation).
- Verify HMAC on Shopify webhooks before acting (`SHOPIFY_WEBHOOK_SECRET`). Vendor sync webhooks may use per-shop secrets — see `app/api/webhooks/shopify/vendor-sync/route.ts`.
- Never log full cart payloads, customer objects, or email addresses. Several checkout / draft-order routes currently log emails — do not add more.
- There is no customer-account token flow in the storefront today. Do not invent one.
- `/admin/*` is a custom merchant CMS with its own auth (`app/api/admin/auth/route.ts`). Treat it as privileged.

---

## 13. Marketplace / vendors (do not freelance)

This store aggregates multiple vendors.

- Inventory / price sync: `docs/VENDOR-INVENTORY-SYNC.md`, `docs/VENDOR-ONBOARDING-RUNBOOK.md`
- Price offset services: `services/shopify-price-offset/`, `services/webkul-price-offset/`, `docs/SHOPIFY-PRICE-OFFSET.md`
- Vendor REST + OAuth: `lib/shopify/vendor-shopify-rest.ts`, `lib/shopify/vendor-oauth.ts`
- Brand / PLP allocation scripts live under `scripts/` — many are one-off ops. Do not run apply scripts against prod unless explicitly asked.
- `Product.vendor` is the marketplace vendor string. Brand shown on the PDP may be a different Neon brand field. Do not conflate them.

---

## 14. Reviews, apps, HTML

- Shopify app scripts (Yotpo, Inbox, upsells, loyalty) **do not automatically run** — this is not a Liquid theme. “Add the reviews app” means a real integration, not a script tag.
- Reviews are first-party in Postgres. Yotpo is import-only (`scripts/import-yotpo-reviews.ts`).
- Shopify Inbox is an optional script gated by `NEXT_PUBLIC_SHOPIFY_INBOX_*`.
- Metafields and product / collection descriptions contain merchant HTML. Sanitize before rendering; never trust it raw.
- `availableForSale` is per-variant, not per-product. A product can be “available” while the selected variant is not.
- Prices are strings with a separate `currencyCode`. Convert deliberately before arithmetic.

---

## 15. Commands

```bash
npm run dev          # redirects:generate + next dev -p 3003
npm run build        # redirects:generate + next build
npx tsc --noEmit     # no npm "typecheck" script exists
npm run lint
```

`tsconfig` excludes `scripts/**`, `docs/**`, and `services/*-price-offset/**` from the app typecheck. A clean `tsc` does not mean those folders typecheck.

---

## 16. Before you call it done

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `types/shopify.ts` updated if any GraphQL shape changed
- [ ] No new console errors or hydration warnings
- [ ] Tested: add to cart, update quantity, remove, proceed to Shopify checkout (`checkout.theequestrian.com.au`)
- [ ] Tested at 375px width
- [ ] Client bundle not meaningfully increased
- [ ] Sold-out / unavailable variant states still render
- [ ] If a URL changed: redirect added and `redirects:generate` still works
- [ ] If Shopify cache tags / ISR involved: TTL taken from `lib/config/route-revalidate.ts`

---

## 17. Stop and ask a human

Do not proceed unilaterally on:

- Bumping Storefront or Admin API versions (they are not in one place)
- Anything touching checkout, draft orders, discounts, tax, or shipping rate logic
- Any Shopify Admin write beyond existing cart mutations (including metafields, inventory, product status)
- Neon schema / migration changes
- Adding a dependency that ships to the client
- Deleting or changing a live URL
- Anything involving customer PII, email sends, or `/admin` auth
- Running vendor migration, SEO enrichment `--apply`, GMC cleanup `--apply`, or other prod ops scripts
- Introducing GraphQL codegen, httpOnly cart cookies, or `useOptimistic` as a drive-by

---

## 18. Known pitfalls in this repo

- README still says “Next.js 14+” and `localhost:3000`. Reality: Next 16, port 3003.
- API versions are scattered. Storefront client `2024-10`, Admin client `2025-01`, scripts vary. Do not unify unless asked.
- Cart ID in `localStorage` + non-httpOnly cookie. Generic template advice (“httpOnly only”) is not how this app works.
- Collection sort order set in the Shopify admin is not the default returned by the API — request it explicitly if you need it.
- PLP product sets come from **mapping / productType / allocations**, not “whatever Shopify collection handle matches the URL.”
- `app/[category]/page-postgres.tsx` is an alternate Postgres PLP path — do not assume it is live on the main category route.
- Draft-order checkout exists but the live cart CTA uses Shopify `checkoutUrl`.
- Cart page subtotal is computed from line prices; drawer uses Cart API cost. Shipping shown pre-checkout is an estimate.
- `any` appears in some Admin API routes. Do not add more. Do not use `@ts-ignore`.
- Keep files small and follow neighbouring structure. One component per file; filename matches the default export.

---

## 19. Key files

| Concern | Path |
|---|---|
| Storefront client | `lib/shopify/client.ts` |
| Admin client | `lib/shopify/admin-client.ts` |
| GraphQL operations | `lib/shopify/queries.ts` |
| Cart actions | `app/actions/cart.ts` |
| Cart UI state | `components/cart/cart-context.tsx` |
| Checkout URL rewrite | `lib/shopify/cart-utils.ts` |
| Product types | `types/shopify.ts` |
| Env schema | `lib/env.ts` |
| Neon | `lib/db/client.ts` |
| Allocations | `lib/db/product-allocations.ts` |
| Collection mapping | `lib/mapping/collection-mapping.ts` |
| ISR TTLs | `lib/config/route-revalidate.ts` |
| Middleware / redirects | `middleware.ts`, `lib/redirects/maps.ts` |
| Product schema | `lib/utils/product-schema.ts` |
| Image URLs | `lib/shopify/image-url.ts` |
| Site URL | `lib/seo/site-url.ts` |

---

## 20. Related runbooks (read if the task touches them)

- `docs/VENDOR-ONBOARDING-RUNBOOK.md`
- `docs/VENDOR-INVENTORY-SYNC.md`
- `docs/SHOPIFY-PRICE-OFFSET.md`
- `docs/SEO-ENRICHMENT-ROLLOUT-RUNBOOK.md`
- `docs/ARTICLE-SYSTEM.md`
- `docs/BRAND-AND-CATEGORY-PAGE-UPDATE-PIPELINE.md`
- `docs/CATEGORY-SEO-OPTIMISATION-RUNBOOK.md`
