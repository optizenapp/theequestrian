# Collective Metadata Enrichment Framework

**Use case:** Products imported via Shopify Collective. **Keep the supplier description**, but generate a unique SEO title (H1 + meta), add E-A-V bullet points, and add a grounded **augment layer** for genuine uniqueness. Optimised for semantic SEO / Koray Tuğberk GÜBÜR's framework and Google's product/content classifiers.

This keeps the supplier's factual paragraph verbatim while surrounding it with net-new, unique content. It never paraphrases or rewrites the supplier's factual sentences.

### Uniqueness model — read this first

Every store on the same Collective feed has the **identical supplier description**. Restructuring it fixes presentation but adds **zero** uniqueness. Rewriting it manufactures *false* uniqueness (the model invents/drifts facts → contradicts structured data → thin-content/misrepresentation risk).

The page is made unique by **adding grounded layers**, not by rewriting facts:

| Layer | Uniqueness contribution | Risk |
|-------|------------------------|------|
| SEO title (H1 + meta) | Partial — small text block | Low |
| E-A-V bullets | Partial — structured layer | Low |
| **Augment block** (`top_`/`bottom_description_html`) | **Substantial — net-new indexable text** | Low (if grounded) |
| Supplier description | None (shared with all competitors) | — |
| Rewriting supplier paragraphs | High but **fabricated** | **High — avoid** |

**Title + bullets alone are usually _not_ enough** when the supplier body is the largest text block on the page. The augment layer is what tips the page to "unique enough." Same facts, net-new representation.

---

## What this framework does (and does not) touch

| Element | Action | DB flag on apply |
|---------|--------|------------------|
| `meta_title` | Generate (≤68 chars) | `use_headless_meta_title = TRUE` |
| `meta_description` | Generate (≤158 chars) | `use_headless_meta_description = TRUE` |
| `title_override` (H1) | Generate | `use_headless_title = TRUE` |
| `bullet_points` | Generate 5–8 E-A-V strings | `use_headless_bullets = TRUE` |
| **Description body** | **Leave as supplier copy** | `use_headless_description = FALSE` |

The model receives `vendor_description` (truncated to 4000 chars) as **factual context only** — it must not rewrite it or output HTML body content.

**Run it:**

```bash
tsx scripts/run-seo-enrichment.ts --metadata-only --vendor="<Vendor>" --brand=<Brand>
# or
SEO_ENRICHMENT_METADATA_ONLY=true
```

Always validate in `shadow` mode first (full generation + audit log, **no** DB writes), then switch to `apply`.

---

## The double-`<h2>` problem (fix this first)

**Symptom:** Two stacked `<h2>` headings appear at the top of the description box.

**Cause:** `ProductDescription.tsx` always injects its own heading wrapper:

```tsx
<h2 className="text-2xl font-bold ...">
  {productTitle} Description
</h2>
<div dangerouslySetInnerHTML={{ __html: html }} />
```

If the vendor/override HTML **also** starts with a heading (`<h1>`/`<h2>`/`<h3>`), you get the component's H2 *plus* the body's heading — two headings stacked.

This is bad for both UX and semantic SEO: a duplicated/near-duplicate heading dilutes the macro-context signal and creates an ambiguous heading hierarchy for the classifier.

### Fix options (pick one)

**Option A — Strip the leading heading from the body (recommended, deterministic).**
Before render, if the description HTML's first block-level element is a heading, remove it. The component's `{productTitle} Description` H2 becomes the single, canonical section heading. Cheap, safe, no AI.

```ts
// pseudo: run in the formatting/normalisation pass, not in the model
function stripLeadingHeading(html: string): string {
  return html.replace(/^\s*<h[1-6][^>]*>.*?<\/h[1-6]>\s*/i, "");
}
```

**Option B — Suppress the component wrapper when body already has a heading.**
Have `ProductDescription.tsx` detect a leading heading in `html` and skip rendering its own `<h2>`. Keeps vendor's heading; loses the consistent `{productTitle} Description` label.

**Option C — Demote, don't duplicate.**
Keep the component H2 as the section label and demote any in-body headings to `<h3>`/`<h4>` so the hierarchy is H2 → H3 rather than H2 → H2.

> Recommendation: **Option A.** It guarantees exactly one H2 at the top of the description box, keeps the canonical `{productTitle} Description` label, and is fully deterministic (no rewrite of vendor meaning). Option C is the fallback if you want to preserve vendor sub-structure.

### Why metadata-only mode alone doesn't fix it

Metadata-only sets `use_headless_description = FALSE`, so the **raw Shopify vendor HTML** passes straight through. If that vendor HTML leads with a heading, the double-H2 still happens. The fix lives in the **render/normalisation layer**, not the model prompt — which is why it needs to be a separate deterministic pass (see below).

---

## Title strategy (H1 vs meta_title — keep them distinct)

For semantic SEO, the H1 and the `<title>` do different jobs. Don't let them be identical.

| Field | Job | Guidance |
|-------|-----|----------|
| **`title_override` (H1)** | Name the central entity + its key attribute | Entity-complete, no brand-stuffing, no fluff. e.g. `Roeck-Grip Unlined Riding Gloves` |
| **`meta_title` (≤68)** | Win the SERP click | Add qualifying context a searcher actually uses (use-case, material, audience). Don't duplicate the H1 verbatim. |

**Macro-context rule:** the H1 should share tokens with the **vendor description** (the metadata-only macro-context check already falls back to vendor description). This keeps title and on-page body semantically aligned — a core Koray signal and a consistency signal for Google's classifier.

### `<title>` tag resolution (Collective vs legacy FREE Shipping template)

Enrichment writes `meta_title` to `product_content_overrides` with `use_headless_meta_title = TRUE`.

**Do not** use the legacy `buildProposedTitle()` FREE Shipping suffix when that flag is set. The old path appended ` | FREE Shipping Australia | The Equestrian` from `displayTitle`, which overwrote enriched SERP titles in `<title>` even when the DB had the correct value.

**Correct resolution** (`lib/seo/product-metadata.ts`):

```typescript
// When enriched: use override meta_title (≤68 chars, distinct from H1)
// When not enriched: use legacy proposedTitle (FREE Shipping template)
const title = resolveProductPageTitle(seoMetadata, override);
const description = resolveProductPageDescription(seoMetadata, override);
```

Used in `generateMetadata` on category PDP and `/products/[handle]` routes. Requires deploy to take effect on the live site.

---

## Bullet point strategy (E-A-V is the uniqueness lever)

Bullets are the strongest, safest uniqueness signal when you're keeping vendor copy: they add a structured **Entity–Attribute–Value** layer the prose lacks.

**Rules:**

1. **True E-A-V format** — `Attribute: Value`, with a real value pulled from the vendor description.
   - Good: `Material: Goatskin leather`, `Closure: Velcro wrist strap`, `Lining: Unlined`
   - Weak (fluff-penalised): `Premium quality`, `Great for riders`, `World-class comfort`
2. **Only state facts present in the source.** Don't invent values. Koray's framework rewards factual density; Google's product classifier rewards consistency between structured attributes and body copy. Invented specs create a mismatch.
3. **Extract, don't duplicate.** Bullets should re-represent facts the prose states in sentences — same facts, different structure. That's the distinctiveness signal you want without rewriting copy.
4. **5–8 bullets.** Prioritise spec-style attributes (material, size, closure, care, compatibility) over benefit claims.

---

## Augment layer (the uniqueness engine)

This is the piece that delivers genuine uniqueness without rewriting supplier facts. It adds **net-new, grounded, AI-generated content** that wraps around the untouched supplier description.

### Where it lives

Repurpose the existing `top_description_html` / `bottom_description_html` columns in `product_content_overrides`. The supplier paragraph stays the verbatim factual core; the augment blocks are yours.

PDP stacking:

```
[ title_override — H1 ]
[ E-A-V bullets ]
[ top_description_html ]      ← optional: short unique framing intro
[ supplier description ]      ← verbatim vendor copy, restructured for layout only
[ bottom_description_html ]   ← main augment block (unique)
```

### What goes in it

**1. Extractive-answer Q&A (highest value — do this one first).**
Short question heading, short direct answer. Matches Koray's extractive-answer pattern and Google's snippet/PAA surfaces. Your wording, not the supplier's.

```html
<h3>Are the Roeck-Grip gloves machine washable?</h3>
<p>No — the goatskin leather should be cleaned by hand with a damp cloth to preserve the grip.</p>
```

**2. Use-case / context paragraph.** Who it's for, when it's used, what it pairs with — adds entity coverage (disciplines, compatible products, scenarios) the supplier copy lacks.

**3. Spec / attribute table.** Same E-A-V facts in tabular form; adds structured, scannable, unique markup. Don't duplicate the bullets verbatim — add format value and any extra attributes.

### The grounding constraint (non-negotiable)

The model receives `vendor_description` (+ any structured attributes) as **factual source**, with a hard rule injected into the prompt:

> Generate net-new **questions, framing, and structure**. Every **fact, value, and claim** must come from the supplied source. Do NOT introduce specs, materials, dimensions, certifications, compatibility, or claims not present in the source. If the source doesn't state it, don't assert it.

Uniqueness comes from **representation** (new questions, new framing, new structure) — never from new facts. This is the line between safe augmentation and the rewrite risk.

### Compliance additions for augment mode

Metadata-only skips body checks because it writes no body. Augment mode writes `top_`/`bottom_description_html`, so add:

| Check | What it measures |
|-------|------------------|
| Extractive answers | Short `<p>` immediately after each `<h3>` |
| Heading hygiene | `<h3>` only in augment blocks; leading-heading strip still applies (no double-H2) |
| **Fact fidelity (new, hard gate)** | Extract attribute/values from augment output; flag any **not present** in supplier source |

**Fact fidelity is the critical addition.** The Koray score (72) measures SEO *structure* — it does **not** catch an invented fact. You need both the structure score *and* a fact-diff gate. Treat any unsourced claim as a hard fail, not a score deduction.

### DB flags for augment mode

| Field | Action | Flag on apply |
|-------|--------|---------------|
| `top_description_html` / `bottom_description_html` | Generate grounded unique content | `use_headless_description = TRUE` |
| `description_html` (main body) | Leave as supplier copy (optionally normalised) | — supplier copy still renders |

> Note: enabling `use_headless_description = TRUE` changes PDP resolution. Confirm the page composes augment blocks **around** the supplier `product.descriptionHtml` rather than replacing it — verify in `app/[category]/[subcategory]/[product]/page.tsx` and `ProductDescription.tsx` during shadow.

### When augment is "enough"

- Title + bullets only → partially unique, supplier body still duplicate → **often not enough**
- \+ augment block → substantial net-new indexable text (Q&A + context often rivals the supplier paragraph in length), all grounded → **page reads as distinct**

"Enough" is not a fixed line — it depends on category competition and how many stores carry the identical feed. **Validate against your own indexation/coverage data**: check whether live PDPs are currently being clustered/filtered as duplicates before and after the augment rollout.



## Compliance gate (metadata-only)

| Check | What it measures |
|-------|------------------|
| Macro context | Title vs vendor description (or meta desc fallback) |
| E-A-V coverage | Bullet format — `:` present, value is factual/numeric |
| Fluff | Marketing filler in title / meta / bullets |

**Pass rule:** score ≥ 60 and ≤ 1 failed check. No heading/HTML body checks (correct — body isn't touched).

Consider raising the E-A-V bar if your vendors supply rich specs (e.g. require ≥ N bullets to carry a numeric or enumerated value).

---

## Recommended description-normalisation pass (deterministic, non-AI)

Keeps supplier copy intact while fixing structural problems (the double-H2 **and** the block-of-text wall). Runs **after** fetch, **separate** from the model. Writes `description_html` with `use_headless_description = TRUE` **only when it actually changed something** — preserving vendor semantics, never rewriting.

Steps:

1. **Strip leading heading** (fixes double-H2) — see Option A above.
2. **Source Shopify HTML** — normalisation reads `product.descriptionHtml` from Storefront (not plain-text `products.description`), so links and inline markup are available.
3. **Detect block-of-text** — one `<p>` over N words, or plain text with no block-level tags.
4. **Split** on sentence boundaries → multiple `<p>` tags **without stripping inline HTML** (`<a>`, `<strong>`, etc.). Never run `stripHtml()` on content before write — that destroys size-chart links and similar vendor markup.
5. **Optional feature-list extraction** — if a feature pattern is detected, convert to `<ul><li>`.
6. **Guard** — only set `use_headless_description = TRUE` and write if the HTML changed; otherwise leave vendor copy fully untouched (`FALSE`) and render live Shopify HTML.

This is normalisation, not rewriting: no AI, no hallucination, no editorialising. It can run alongside metadata-only without violating "keep supplier copy."

**Implementation:** `lib/seo-enrichment/description-normalisation.ts` (`splitHtmlPreservingInlineTags`, `findPlainTextOffsetInHtml`).

---

## Decision tree — restructure vs augment vs rewrite

Decide by *why* you want to change the description:

| Goal | Do this | Don't |
|------|---------|-------|
| "It's a wall of text / ugly" | **Restructure** (deterministic split, no AI) | Don't rewrite — fixes layout, adds zero uniqueness |
| "I need the page to be unique" | **Augment** (grounded `top_`/`bottom_` blocks) | Don't rewrite the supplier paragraph for uniqueness — that's fabricated uniqueness |
| "The supplier copy is thin / missing entities" | **Augment** | — |
| "Copy genuinely misrepresents / is unsalvageable" | **Full rewrite** — only with the fact-diff gate | Don't ship a reword without fact-fidelity checks |

For Collective specifically (you don't own the catalogue; facts originate with the supplier), lean to **restructure + augment**. A full rewrite gives Google more unique copy, but uniqueness from *invented* content hurts (contradicts structured data, trips thin-content signals). Reversibility: vendor copy still lives in Shopify `product.descriptionHtml`; flipping `use_headless_description` back to `FALSE` restores it — keep that escape hatch in the runbook.

---

## Rollout order

1. Run **shadow** metadata-only → review title, meta, bullets in the audit log.
2. Apply the **leading-heading strip** (Option A) to kill the double-H2.
3. Switch metadata-only to **apply** for title + bullets + meta.
4. Add the **normalisation pass** as a separate opt-in step; validate it doesn't alter vendor meaning before enabling `use_headless_description`.
5. **Build augment mode** — `top_`/`bottom_description_html` generation with the grounding constraint + fact-fidelity gate. Run **shadow**, pull a cross-vendor sample, and human-review factual fidelity before `apply`. Don't trust the score alone on generated body content.
6. **Measure uniqueness** — compare indexation/coverage and duplicate-clustering for affected PDPs before vs after augment. Let the data, not the abstract, define "enough."

**Before any apply:** confirm `INTERNAL_REVALIDATE_SECRET` (local) matches Vercel, or the post-write cache bust (`invalidateProductOverrideCache()` + `POST /api/internal/revalidate-shopify`) silently fails.

---

## PDP resolution recap

```ts
const displayTitle = override?.use_headless_title
  ? (override?.title_override || product.title)
  : product.title;

// description stays on vendor copy in metadata-only mode
const rawDescriptionHtml = override?.use_headless_description
  ? (override?.description_html || product.descriptionHtml)
  : product.descriptionHtml;

const featureHighlights = override?.use_headless_bullets && overrideBullets.length > 0
  ? overrideBullets
  : getProductBulletPoints(product.id);
```

| Element | Source in metadata-only |
|---------|-------------------------|
| `<h1>` | `title_override` |
| Meta title / description | Override fields |
| Feature bullets | Override `bullet_points` |
| Description box | Shopify `product.descriptionHtml` (vendor copy, optionally normalised) |
