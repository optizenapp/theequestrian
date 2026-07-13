# Brand & Category Page Update Pipeline

How we create and update SEO content for **brand hubs** (`/brands/{handle}`) and **category/collection pages** (`/horse/...`, `/rider/...`, etc.).

Both pipelines share the same pattern:

1. Write a TypeScript **content module** under `scripts/`
2. Dry-run the shared **runner**
3. Apply to **local Neon**, then **production** (`--floral-prod`)
4. Commit the module (+ logo assets if any)
5. Confirm **ISR revalidation** or wait for cache TTL

---

## Quick reference

| | Category pages | Brand pages |
|---|---|---|
| Live URL | `/horse/rugs`, `/rider/helmets`, … | `/brands/samshield`, … |
| Content module | `scripts/seo-pages/<slug>.ts` | `scripts/brand-seo-pages/<slug>.ts` |
| Runner | `scripts/run-page-seo-update.ts` | `scripts/run-brand-seo-update.ts` |
| DB table | `collection_content` | `brand_content` |
| Apply flag | `--page <slug>` | `--brand <slug>` |
| Prod flag | `--floral-prod` | `--floral-prod` |
| Detailed SEO rules | [`CATEGORY-SEO-OPTIMISATION-RUNBOOK.md`](./CATEGORY-SEO-OPTIMISATION-RUNBOOK.md) | This doc (Brand section) |

```bash
# Category
npx tsx scripts/run-page-seo-update.ts --page horse-tack-girths --dry-run
npx tsx scripts/run-page-seo-update.ts --page horse-tack-girths
npx tsx scripts/run-page-seo-update.ts --page horse-tack-girths --floral-prod

# Brand
npx tsx scripts/run-brand-seo-update.ts --brand samshield --dry-run
npx tsx scripts/run-brand-seo-update.ts --brand samshield
npx tsx scripts/run-brand-seo-update.ts --brand samshield --floral-prod
```

Requires `.env.local` with `POSTGRES_URL` / `DATABASE_URL`. For `--floral-prod`, also `POSTGRES_PASSWORD` (and usually `POSTGRES_USER`).

Optional ISR bust after prod write (both runners):

- `REVALIDATE_SITE_URL` or `NEXT_PUBLIC_SITE_URL`
- `INTERNAL_REVALIDATE_SECRET` or `REVALIDATE_SECRET`

Skip with `--skip-revalidate`.

---

## Architecture (shared)

```
┌─────────────────────────────┐
│  Content module (.ts)       │  Source of truth in git
│  scripts/seo-pages/*        │
│  scripts/brand-seo-pages/*  │
└─────────────┬───────────────┘
              │ import default
              ▼
┌─────────────────────────────┐
│  Runner                     │  Validates + UPSERT
│  run-page-seo-update.ts     │
│  run-brand-seo-update.ts    │
└─────────────┬───────────────┘
              │ Neon SQL
              ▼
┌─────────────────────────────┐
│  Postgres                   │
│  collection_content         │  category PLPs
│  brand_content              │  brand hubs + /brands/ index
└─────────────┬───────────────┘
              │ read at request / ISR
              ▼
┌─────────────────────────────┐
│  Next.js pages              │
│  app/[category]/…           │
│  app/brands/[handle]/page   │
│  app/brands/page.tsx        │
└─────────────────────────────┘
```

Do **not** edit live copy only in Admin unless you also update the matching `scripts/*` module — git modules are the durable source of truth for re-applies.

---

# Part A — Category pages

## When to use

Updating copy / SEO for an existing collection path that already has a `collection_content` row (e.g. `/horse/tack/girths`).

For **new** categories (mapping + content bootstrap), use dedicated create scripts when they exist (e.g. `scripts/create-*-category.ts`), then still finish with a `seo-pages` module + `run-page-seo-update`.

## Inputs

1. **Page URL** — e.g. `/horse/boots`
2. **GSC (or Ahrefs) queries** — top impressions, mid-rank opportunities, question queries  
   Recommended GSC window: last 3 months

Slug naming: path with `/` → `-`  
Examples: `/horse/rugs` → `horse-rugs`, `/clothing/womens/breeches` → `clothing-womens-breeches`

## Pipeline steps

### 1. Analyse demand

- Top 10–20 queries by impressions
- Mid-rank wins (position ~5–20)
- Cluster: product type / use case / brand / seasonal

### 2. Create or edit module

`scripts/seo-pages/<slug>.ts` exporting `PageSEOContent`:

| Field | Purpose |
|---|---|
| `url_path` | Must match existing `collection_content.url_path` |
| `meta_title` | SERP title, ~50–60 chars; **≠** H1 |
| `meta_description` | SERP description, ~150–160 chars |
| `h1_title` | On-page H1 |
| `breadcrumb_label` | Short crumb label |
| `short_description` | HTML above grid; split with `<!--read-more-trigger-->` |
| `long_description` | HTML below grid |
| `faq_items` | Preferred FAQ source (accordion + schema) |

Template and linking rules: [`CATEGORY-SEO-OPTIMISATION-RUNBOOK.md`](./CATEGORY-SEO-OPTIMISATION-RUNBOOK.md).

### 3. Layout (do not change template order)

```
H1
short_description (+ Read more)
Pill navigation          ← collection_mapping (do not rewrite in content)
Product grid
Trust icons
long_description
FAQs (from faq_items when provided)
```

Parent “part of our wider … collection” link is rendered by the app from `parent_url` — **do not** put that sentence in CMS HTML.

### 4. long_description structure

1. Core `<h2>… Explained</h2>`
2. Cluster `<h3>` sections
3. Optional brand block (only if brand appears in demand data **and** published `/brands/{handle}` exists)
4. Prefer `faq_items` over duplicate FAQ HTML
5. Runner expects ≥1 `<ul>` and enough internal `<a href="/…">` links unless `--skip-below-grid-validation`

### 5. Apply

```bash
npx tsx scripts/run-page-seo-update.ts --page <slug> --dry-run
npx tsx scripts/run-page-seo-update.ts --page <slug>
npx tsx scripts/run-page-seo-update.ts --page <slug> --floral-prod
```

### 6. Verify

- Hard refresh the live path
- Check H1, meta, Read more, below-grid HTML, FAQs
- Confirm no “process language” (GSC / “search demand” wording) — runner blocks this unless `--allow-process-language`

### 7. Commit

Commit `scripts/seo-pages/<slug>.ts` (and any related create scripts). DB writes are not in git.

## Category-related scripts (map)

| Script | Role |
|---|---|
| `scripts/run-page-seo-update.ts` | **Primary** apply runner for page modules |
| `scripts/seo-pages/*.ts` | Per-page content modules |
| `scripts/verify-brand-collections.ts` | Confirm brand handles exist before linking |
| `scripts/init-collection-content-table.ts` | Schema bootstrap (rare) |
| `scripts/init-collection-mapping-table.ts` | Mapping / pills bootstrap (rare) |
| `scripts/create-*-category.ts` | Bootstrap new collection rows |
| `scripts/migrate-csv-to-postgres.ts` | Legacy CSV → Postgres (historical) |
| `scripts/generate-collection-content.ts` / `ai-generate-collection-content.ts` | Bulk / AI generation (not the normal per-page path) |
| `scripts/enrich-all-categories.ts` | Bulk enrichment tooling |
| `npm run apply:categories` | `scripts/apply-category-changes.ts` — structural category changes, not day-to-day SEO copy |

Day-to-day SEO copy = **module + `run-page-seo-update` only**.

---

# Part B — Brand pages

## When to use

- Refresh `/brands/{handle}` SEO copy, FAQs, quick answer
- Add / change logo for brand page **and** `/brands/` index cards
- Set product **allocation rules** so the brand PLP lists the right products

Brand pages read `brand_content`. Products are selected via `rules` JSON (and/or `products.brand` / `brand_hub_handle` from migrations).

## Inputs

1. Brand **handle** (URL slug), e.g. `samshield`
2. Official brand story / About page (optional but preferred)
3. Logo asset (optional): PNG → `public/brands/logos/{handle}.png`

## Pipeline steps

### 1. Logo (optional)

```bash
# Place official logo
public/brands/logos/<handle>.png
```

Set in the module:

```ts
logo_url: '/brands/logos/<handle>.png',
```

Resolution order (`lib/brands/resolve-brand-logo.ts`):

1. `brand_content.logo_url` if set  
2. Else fallback `/brands/logos/{handle}.png` if file exists  

Rendered on:

- `/brands/[handle]` hero (`BrandLogo` size `md`)
- `/brands/` index cards (`BrandLogo` size `sm`)
- Header brands mega menu (when wired to `logoUrl`)

### 2. Create or edit module

`scripts/brand-seo-pages/<slug>.ts` exporting `BrandSEOContent`:

| Field | Purpose |
|---|---|
| `handle` | Brand hub slug (`/brands/{handle}`) |
| `title` | Short display / index name |
| `breadcrumb_label` | Crumb text |
| `logo_url` | Path under `/public` |
| `rules` | Product match rules (see below) |
| `meta_title` | SERP title |
| `meta_description` | SERP description |
| `h1_title` | On-page H1 |
| `quick_answer` | ~40–60 word entity-first blurb under H1 |
| `short_description` | HTML above grid; use `<!--read-more-trigger-->` |
| `long_description` | HTML below grid (About, product lines, why shop) |
| `faq_items` | FAQ accordion + schema |

Copy pattern: see `scripts/brand-seo-pages/samshield.ts`, `kentucky.ts`, `acavallo.ts`.

### 3. Product allocation `rules`

Example:

```ts
rules: [
  { column: 'BRAND', relation: 'EQUALS', condition: 'Samshield' },
  { column: 'HANDLE', relation: 'STARTS_WITH', condition: 'samshield-' },
  { column: 'TITLE', relation: 'CONTAINS', condition: 'samshield' },
],
```

Common columns: `BRAND`, `HANDLE`, `TITLE`, `VENDOR`, `TAG`.  
Relations: `EQUALS`, `STARTS_WITH`, `CONTAINS` (as used by brand product queries).

Rules are stored on `brand_content.rules` and used by `lib/brands/get-brand-products.ts`.

### 4. Brand page layout (content fields)

```
Breadcrumbs
H1
quick_answer
short_description (+ Read more) + logo
Filters + product grid
Brand product-line chips (DB-driven)
long_description
FAQs
```

### 5. Apply

```bash
npx tsx scripts/run-brand-seo-update.ts --brand <slug> --dry-run
npx tsx scripts/run-brand-seo-update.ts --brand <slug>
npx tsx scripts/run-brand-seo-update.ts --brand <slug> --floral-prod
```

Runner UPSERTs into `brand_content` (status `published`), ensures `quick_answer` / `logo_url` columns, then POSTs revalidate for `/brands/{handle}` when secrets are set.

### 6. Verify

- `/brands/{handle}` — logo, H1, quick answer, FAQs, product count
- `/brands/` — card shows logo + short title
- Hard refresh if CDN/ISR still shows old HTML

### 7. Commit

```
scripts/brand-seo-pages/<slug>.ts
public/brands/logos/<handle>.png   # if new/changed
```

## Brand-related scripts (map)

| Script | Role |
|---|---|
| `scripts/run-brand-page-pipeline.ts` | **Batch** inventorizes + researches + generates modules + applies |
| `scripts/run-brand-seo-update.ts` | **Primary** apply runner for brand modules |
| `scripts/brand-seo-pages/*.ts` | Per-brand content modules |
| `scripts/verify-brand-collections.ts` | Check Shopify / hub readiness |
| `scripts/sync-brand-content-from-products.ts` | Sync brand rows from product brand fields |
| `scripts/run-brand-migration.ts` | Vendor → brand cutover (products + enrichment), not day-to-day copy |
| `scripts/assign-vendor-product-brands.ts` | Backfill `brand` / `brand_hub_handle` |
| `scripts/list-vendor-brands.ts` | Inspect vendor brand mix |

Day-to-day brand SEO = **module + logo + `run-brand-seo-update`**, or batch via `run-brand-page-pipeline`.

## Batch pipeline (multi-brand)

Automates inventory → optional SERP research → OpenAI module generation → validate → `run-brand-seo-update`.

```bash
# Generate module only (no DB write)
npx tsx scripts/run-brand-page-pipeline.ts --brands crooked-lane --dry-run

# Generate + apply local Neon
npx tsx scripts/run-brand-page-pipeline.ts --brands crooked-lane

# Local then production
npx tsx scripts/run-brand-page-pipeline.ts --brands crooked-lane --floral-prod

# Apply existing modules only (no LLM)
npx tsx scripts/run-brand-page-pipeline.ts --brands a,b,c --skip-generate --floral-prod

# Regenerate an existing module
npx tsx scripts/run-brand-page-pipeline.ts --brands crooked-lane --overwrite --dry-run
```

Flags: `--brands a,b,c` or `--brands-file path.txt`, `--dry-run`, `--floral-prod`, `--skip-generate`, `--overwrite`, `--skip-revalidate`.

Requires `OPENAI_API_KEY` + `POSTGRES_URL` in `.env.local`. Optional SERP: `SEO_ENRICHMENT_ENABLE_SERP=true`. Logos are wired only when `public/brands/logos/{handle}.png` already exists.

Review generated modules under `scripts/brand-seo-pages/` before committing. Pilot one brand before large batches.

---

# Part C — Environments & cache

| Target | How |
|---|---|
| Local / preview Neon | Runner with no `--floral-prod` (uses `POSTGRES_URL` from `.env.local`) |
| Production Neon | `--floral-prod` (uses floral-wind pooler + `POSTGRES_PASSWORD`) |
| Force DB URL | `CUSTOM_DATABASE_URL=…` (both runners honour this when set) |

After apply:

- Runners try `POST /api/internal/revalidate-collection` with the page path
- Category pages also refresh via collection cache TTL (see runbook: ~60s dev / ~15 min prod depending on config)
- Brand index `/brands` uses `revalidate = 3600` — may lag until revalidate or TTL unless you bust `/brands` separately

Always re-apply **local then prod** when shipping intentional content changes.

---

# Part D — Checklist (both pipelines)

### Category

- [ ] Module slug matches path convention  
- [ ] `url_path` exists in `collection_content`  
- [ ] meta ≠ H1; lengths OK  
- [ ] `<!--read-more-trigger-->` present  
- [ ] Internal links valid; brand links only to published hubs  
- [ ] `--dry-run` then local then `--floral-prod`  
- [ ] Module committed  

### Brand

- [ ] Module `handle` matches hub URL  
- [ ] Logo file + `logo_url` if branding required  
- [ ] `rules` cover products (spot-check PLP count)  
- [ ] `quick_answer` entity-first (~40–60 words)  
- [ ] FAQs in `faq_items`  
- [ ] `--dry-run` then local then `--floral-prod`  
- [ ] Module (+ logo) committed  
- [ ] Spot-check `/brands/{handle}` and `/brands/`  

---

# Part E — Related docs

| Doc | Use |
|---|---|
| [`CATEGORY-SEO-OPTIMISATION-RUNBOOK.md`](./CATEGORY-SEO-OPTIMISATION-RUNBOOK.md) | Full category SEO + internal linking rules |
| [`github-wiki/Category-Page-SEO-Updates.md`](./github-wiki/Category-Page-SEO-Updates.md) | Wiki mirror of category runbook |
| [`ECOMMERCE-CATEGORY-PAGE-FRAMEWORK.md`](./ECOMMERCE-CATEGORY-PAGE-FRAMEWORK.md) | Layout / content framework |
| [`UPDATING-CATEGORY-TITLES.md`](./UPDATING-CATEGORY-TITLES.md) | Title-only / H1 troubleshooting |
| [`seo-enrichment-pipeline/`](./seo-enrichment-pipeline/) | **Product** SEO enrichment (PDP), not brand/category page copy |

---

# Example end-to-end

### Category: girths

```bash
# edit scripts/seo-pages/horse-tack-girths.ts
npx tsx scripts/run-page-seo-update.ts --page horse-tack-girths --dry-run
npx tsx scripts/run-page-seo-update.ts --page horse-tack-girths
npx tsx scripts/run-page-seo-update.ts --page horse-tack-girths --floral-prod
git add scripts/seo-pages/horse-tack-girths.ts && git commit && git push
```

### Brand: Samshield

```bash
# add public/brands/logos/samshield.png
# edit scripts/brand-seo-pages/samshield.ts
npx tsx scripts/run-brand-seo-update.ts --brand samshield --dry-run
npx tsx scripts/run-brand-seo-update.ts --brand samshield
npx tsx scripts/run-brand-seo-update.ts --brand samshield --floral-prod
git add scripts/brand-seo-pages/samshield.ts public/brands/logos/samshield.png
git commit && git push
```
