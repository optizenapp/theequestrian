# PLP Filter Normalisation (Colour / Size)

Companion to `docs/PAGINATION-SEO-BRIEF.md`. Covers the "Fix Incorrect Filters and Pagination Navigation" brief.

## Decisions

- Colour + size selected together must exist on the **same variant**.
- Pack / length values are **excluded from Colour only**. No new Pack/Length facets. Reported in the audit CSV.
- A selected value that matches nothing returns an **empty grid** (200, clean canonical). It never broadens to all products.

## Root causes found

1. `VENDOR_CODE_PREFIX` in `lib/utils/product-options.ts` stripped any leading word + hyphen, repeatedly: `Black/White` → `white`, `Light Blue` → `blue`, `2C00-Pale Mauve` → `mauve`.
2. Supplier data puts non-colours under `Color`: pack quantities, measurements (`70cm`, `Neck 15mm`), bare numbers (`42`), engraving lengths (`1-5 Characters`), `Default Title`.
3. Server colour facet only read option name `color`; server matching also accepted `colour`. `Colour` products were filterable but missing from the facet.
4. Sizes were grouped by exact raw string → case duplicates (`COB` / `Cob` / `cob`, `10 Years` / `10 years`).
5. Facet counts were per variant, not per product.
6. Colour and size were matched independently (a product with Red/S and Blue/L matched Red + L).

## Rules (code)

| Concern | File |
|---|---|
| Option name → type (explicit names only, never position) | `lib/filters/option-classify.ts` |
| Colour exclusion, display label, comparison key | `lib/filters/colour-normalize.ts` |
| Size label + comparison key | `lib/filters/size-normalize.ts` |
| Facet building (distinct product counts) + same-variant matching | `lib/filters/facet-values.ts` |

- Option names: `color`/`colour` → colour, `size` → size, `pack*` → pack, `length` → length. Anything else (`Size/Colour`, `Style`, `US Size`) is not used for facets.
- Vendor code prefix is stripped only when it is 2–4 uppercase alphanumerics **containing a digit** followed by `-` (`2C00-`, `8BGO-`, `01-`, `R810-`). `Dark-Green` / `Off-White` are untouched.
- Colour excluded when the value is a placeholder, pack quantity, bare number, engraving length, or a measurement with no colour word left (`Blue-155mm` stays a colour).
- Colour display keeps supplier casing; only code-stripping and `/` / whitespace tidy.
- Sizes merge on case/whitespace and age-range spelling (`0 - 1 yrs` = `0-1 Years`). `0` / `00` / `000`, `US 8` / `UK 8` stay distinct. Colour words under `Size` are dropped from the size facet.
- Legacy filter URLs (`?color=2c00-pale mauve`, `?size=LARGE`) still match via loose keys.

## Where it is applied

- Shopify in-memory category path: `lib/shopify/products.ts` (`getProductsByCategory`, `getProductsByTypes`).
- Shared helpers: `lib/filters/product-filters.ts`.
- Brand hubs: `lib/brands/get-brand-products.ts` (in-memory filters + DB facet SQL; facet cache key `v2`).
- UI: `components/filters/AttributeFilter.tsx` (checked state uses equivalence), `components/filters/FilterChips.tsx` (colour chip label).
- `/{category}`: zero results with active filters now renders the empty grid instead of falling through to the product-handle fallback (404).

## Audit

```bash
npm run audit:filter-options   # read-only Neon query → exports/filter-option-audit-<ts>.csv
npm run test:filter-normalization
```

Run on 2026-10-27, 242 findings:

| Kind | Count |
|---|---|
| `colour_display_rewritten` (vendor codes, slash/space tidy) | 113 |
| `option_name_not_in_colour_or_size` | 61 |
| `size_spelling_merged` | 48 |
| `excluded_from_colour` | 15 |
| `excluded_from_size` (colour words under Size) | 5 |

## Known limitations / unresolved supplier data

- `Size/Colour` (≈873 products) and other combined/ambiguous option names are not faceted. Needs supplier-side split.
- Brand DB fast path matches stored normalised values in SQL, so vendor-prefixed colour duplicates are not merged there.
- `app/[category]/page-postgres.tsx` / postgres adapter path (opt-in) is unchanged.
- Typos (`0range`, `Somkey`) are displayed as supplied.
- Neon `variant_options` may lag Shopify; values like `3 Pack` / `70cm` reported on live pages were not in the Neon mirror but are covered by tests.

## Pagination navigation (Part B)

- Next = `pageInfo.endCursor` (last product ID on the current page); Previous = `previousCursor` from `lib/pagination/category-cursor.ts`, built on the current pathname (fixes three-level pages linking to the parent).
- Buttons have `aria-label`s. See `docs/PAGINATION-SEO-BRIEF.md` for the cursor/canonical/404 rules.
