# Schema Audit Recommendations (2026-02-12)

## Scope Completed

- Added contract-based schema coverage checks across 19 core ecommerce and trust/content templates.
- Implemented missing schema on high-impact gaps:
  - Product catch-all route in `app/[...slug]/page.tsx`
  - Product fallback branch in `app/[category]/page.tsx`
  - FAQ/about/contact/news index/news author/policy templates
- Added CI governance in `.github/workflows/schema-governance.yml`.
- Added repeatable audits:
  - `npm run schema:validate:contracts`
  - `npm run schema:audit:inventory`
  - `npm run schema:audit:urls`

## Current Status

- Local template contracts: **PASS** (`19/19`).
- Inventory report generated at `docs/SCHEMA-AUDIT-INVENTORY.md`.
- URL sample audit generated at `exports/schema-url-sample-audit.json`.

## Priority Findings (From Live URL Sample Audit)

### Critical / High

- `https://theequestrian.com.au/faq`
  - Missing JSON-LD in currently deployed production page.
  - Missing `FAQPage` type in currently deployed production page.

### Medium

- `https://theequestrian.com.au/about`
  - Missing `AboutPage`/`Organization` in currently deployed production page.
- `https://theequestrian.com.au/contact`
  - Missing `ContactPage`/`Organization` in currently deployed production page.
- `https://theequestrian.com.au/news`
  - Missing `Blog`/`CollectionPage` in currently deployed production page.

### Low

- `https://theequestrian.com.au/privacy-policy`
- `https://theequestrian.com.au/terms-of-service`
- `https://theequestrian.com.au/shipping-delivery`
- `https://theequestrian.com.au/returns-refunds`
  - Baseline WebPage schema missing on currently deployed production pages.

Note: these URL-audit findings reflect current production output and should clear after deployment of this branch.

## Additional Gaps To Reach Full World-Class Coverage

These routes currently do not emit JSON-LD and should be added in the next iteration:

- `app/brands/page.tsx` (Brand index list page)
- `app/search/page.tsx` (SearchResults/WebPage schema)
- `app/reviews/page.tsx` and `app/review/page.tsx` (Reviews trust pages, if indexable)

## Recommended Rollout Sequence

1. Deploy this branch to production.
2. Re-run `npm run schema:audit:urls` against production.
3. Validate key templates with Rich Results Test for product/listing/FAQ/article URLs.
4. Implement second-pass coverage for `brands`, `search`, and review pages.
5. Keep `schema-governance` workflow required on pull requests.

## Governance Checklist

- Contract validation on each pull request.
- Inventory artifact generation on each pull request.
- Weekly scheduled schema audit workflow.
- Release check: run production URL sample audit and confirm no critical/high issues.
