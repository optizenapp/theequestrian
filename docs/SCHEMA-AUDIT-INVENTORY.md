# Schema Audit Inventory

Generated: 2026-02-12T00:54:46.083Z

## Contract Coverage Matrix

| Page Type | Template | Required Contract | JSON-LD Present | Missing Required Types | Missing Recommended Types | Sample URLs |
|---|---|---|---|---|---|---|
| Home | `app/page.tsx` | PASS | Yes | None | None | / |
| Product (canonical) | `app/products/[handle]/page.tsx` | PASS | Yes | None | None | /products/sample-product |
| Product (catch-all) | `app/[...slug]/page.tsx` | PASS | Yes | None | None | /horse/rugs/turnout/sample-product |
| Product (category fallback) | `app/[category]/page.tsx` | PASS | Yes | None | None | /sample-product |
| Collection (category) | `app/[category]/page.tsx` | PASS | Yes | None | FAQPage | /horse |
| Collection (subcategory) | `app/[category]/[subcategory]/page.tsx` | PASS | Yes | None | FAQPage | /horse/rugs |
| Collection or Product (third level) | `app/[category]/[subcategory]/[product]/page.tsx` | PASS | Yes | None | None | /sample-third-level<br/>/horse/rugs/turnout/sample-product |
| Collection (on-sale) | `app/on-sale/page.tsx` | PASS | Yes | None | None | /on-sale |
| Brand Collection | `app/brands/[handle]/page.tsx` | PASS | Yes | None | None | /brands/sample-brand |
| Brand Index | `app/brands/page.tsx` | PASS | Yes | None | None | /brands |
| FAQ | `app/faq/page.tsx` | PASS | Yes | None | None | /faq |
| About | `app/about/page.tsx` | PASS | Yes | None | None | /about |
| Contact | `app/contact/page.tsx` | PASS | Yes | None | None | /contact |
| News Index | `app/news/page.tsx` | PASS | Yes | None | None | /news |
| News Article | `app/news/[handle]/page.tsx` | PASS | Yes | None | None | /news/sample-article |
| News Author | `app/news/author/[slug]/page.tsx` | PASS | Yes | None | None | /news/author/sample-author |
| Policy (privacy) | `app/privacy-policy/page.tsx` | PASS | Yes | None | None | /privacy-policy |
| Policy (terms) | `app/terms-of-service/page.tsx` | PASS | Yes | None | None | /terms-of-service |
| Policy (shipping) | `app/shipping-delivery/page.tsx` | PASS | Yes | None | None | /shipping-delivery |
| Policy (returns) | `app/returns-refunds/page.tsx` | PASS | Yes | None | None | /returns-refunds |
| Search | `app/search/page.tsx` | PASS | Yes | None | None | /search |
| Reviews | `app/reviews/page.tsx` | PASS | Yes | None | None | /reviews |
| Write Review | `app/review/page.tsx` | PASS | Yes | None | None | /review |

## Severity Rules

- `critical`: Product schema missing from any product-rendering route.
- `high`: Collection/home/FAQ contract missing required schema types.
- `medium`: About/contact/news index/author contract gaps.
- `low`: Policy page baseline schema gaps.
