# Internal link redirect audit — runbook

Operational steps for [internal_link_audit_plan.md](./internal_link_audit_plan.md). Engineering changes in the repo use `getProductCanonicalUrl` / `getProductCanonicalUrls` ([lib/shopify/products.ts](../../lib/shopify/products.ts)) and [lib/shopify/product-href.ts](../../lib/shopify/product-href.ts).

## Task 1 — Screaming Frog exports

1. Open your saved crawl.
2. **Bulk Export** (or filter then export) for:
   - **Response Codes**: internal HTML URLs with status **301** or **302** (and **307/308** if present).
   - **Inlinks** report: for each redirecting URL, export **inlink count** and **source URL** (and anchor text if available).
3. Save as CSV under `exports/` (e.g. `exports/sf-internal-3xx-YYYY-MM-DD.csv`).

**Done when:** Each redirecting **path** has an internal inlink count and you can see which pages link to it.

## Task 2 — Normalise and dedupe

1. Normalise to **path only** (strip domain, query, fragment unless you need UTM auditing).
2. Pick one **trailing-slash** convention (match production).
3. Lowercase paths if the site is case-insensitive.
4. Dedupe rows and **sum** inlink counts per path.

Optional: run `npx tsx scripts/internal-link-audit/normalize-sf-internal-redirects.ts exports/your-export.csv` — see script header for expected columns.

**Done when:** One table sorted by `internal_inlink_count` descending.

## Task 3 — Classify paths

Tag each row:

| Bucket | Example | Expected fix |
|--------|---------|----------------|
| Legacy product | `/products/foo` | Should match `getProductCanonicalUrl` for that SKU; may stay `/products/foo` if unmapped |
| Legacy collection | `/collections/...` | Match [redirects/collections.csv](../../redirects/collections.csv) → headless path |
| Legacy blog | `/blogs/news/...` | Match blog redirect CSV / live `/news/...` |
| Other | slash variants, campaigns | Case-by-case |

**Done when:** Top 20–50 rows have **bucket + target canonical path**.

## Task 4 — Cross-check redirect map

1. Open [redirects/collections.csv](../../redirects/collections.csv) and generated [lib/redirects/maps.ts](../../lib/redirects/maps.ts) (from `scripts/generate-redirects.ts` when you regenerate).
2. Confirm SF **redirect destinations** align with CSV/to paths for `/collections/*`.
3. Optional: `npx tsx scripts/internal-link-audit/list-collection-redirects.ts` — prints redirect count and sample rows.
4. Optional: GET `/api/cron/redirect-audit` (manual) for manual redirect DB checks ([lib/redirects/audit.ts](../../lib/redirects/audit.ts)).

## Task 5 — Template vs CMS

For high inlink URLs, label each **source** as **template** (nav, cards, cart, related products) vs **CMS** (article HTML, descriptions, metafields). Fix **templates first** (code); then CMS in Shopify/admin.

## Task 10 — CMS / stored HTML

1. Export pages/articles/products that still link to legacy paths.
2. Replace `href` with the **final** path from your map; avoid blind global replace without spot checks.

## Task 11 — Re-crawl and sign-off

1. Re-run Screaming Frog with the **same** scope and settings as Task 1.
2. Compare: internal links to **3xx** should drop to **zero** (or only documented exceptions, e.g. true canonical `/products/{handle}` for unmapped SKUs).
3. Spot-check a sample of links: first response **200** on the canonical URL.

### Allowed exceptions (document in your sign-off)

- Internal links whose **canonical is** `/products/{handle}` (product intentionally unmapped) are not errors.
- External links and tracked URLs are out of scope for “internal link” definition in the plan.
