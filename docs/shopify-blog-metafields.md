# Blog commerce fields (Neon + legacy Shopify)

Public `/news` pages read articles from the **Neon** `article` table. Commerce CTAs and related product handles live on that row (not Shopify), unless you still use Shopify for something else.

## Neon columns (source of truth)

Run article migrations so these exist (`048_article_headless.sql` via `npx tsx scripts/run-article-migrations.ts`):

| Column | Type | Description |
|--------|------|-------------|
| `headless_cta_path` | TEXT | Internal path, e.g. `/rider/helmets` |
| `headless_cta_label` | TEXT | Button label |
| `headless_related_handles` | TEXT | Comma-separated Shopify product handles |

Tags for fallback routing come from **`article_tag` / `article_tag_link`**, not Shopify.

---

## Shopify article metafields (legacy / optional)

If you still sync from Shopify, you can mirror the same data into Neon during import. Original Shopify metafield definitions:

## Definitions

| Namespace | Key | Type | Description |
|-----------|-----|------|-------------|
| `headless` | `cta_path` | Single line text | Internal path, e.g. `/rider/helmets` or `/horse/veterinary` |
| `headless` | `cta_label` | Single line text | Button label, e.g. `Shop riding helmets` |
| `headless` | `related_handles` | Single line text | Comma-separated product handles (max ~8), e.g. `product-a,product-b` |

## Admin steps (Shopify Plus / standard)

1. **Settings → Custom data → Blog posts** (or **Articles** depending on admin version).
2. Add definition: namespace `headless`, key `cta_path`, type single line text, **Storefront access: Public read**.
3. Repeat for `cta_label` and `related_handles`.

If your admin only shows “Blog posts” under custom data, use that owner type; the Storefront API object is still `Article`.

## Backfill priority

Set `cta_path` (and optional `cta_label`, `related_handles`) on high-traffic informational articles first (helmets, vet, supplements, rugs, fly spray, worming, etc.). Articles without metafields still get a **tag-based fallback** CTA path from the codebase when possible.
