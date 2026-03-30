# Category Page SEO Optimisation — Per-Page Runbook

Based on `universal_category_optimisation_agent_v2.md`, wired to this codebase.

---

## How to run a page optimisation

### Inputs required (provide both each time)
1. **Page URL** — e.g. `/horse/boots`
2. **GSC export** — CSV with columns: `query, clicks, impressions, position, page`  
   Export from: Search Console → Performance → Pages tab → filter one page → Queries tab → Export CSV  
   Recommended date range: last 3 months

### Output written
A content module at `scripts/seo-pages/<slug>.ts` is created/updated, then applied to the DB:

```
scripts/
  run-page-seo-update.ts        ← shared runner (do not edit per page)
  seo-pages/
    horse-rugs.ts               ← /horse/rugs content
    horse-boots.ts              ← /horse/boots content (next, etc.)
```

### Run commands
```bash
# Local DB only
npx tsx scripts/run-page-seo-update.ts --page horse-boots

# Preview changes without writing
npx tsx scripts/run-page-seo-update.ts --page horse-boots --dry-run

# Apply to production Neon (floral-wind)
npx tsx scripts/run-page-seo-update.ts --page horse-boots --floral-prod
```

Cache TTL is 60 s (dev) / 15 min (prod). Wait or restart dev server after running.

---

## What the agent does per page (steps mapped to this codebase)

### Step 1–2 — GSC analysis
- Sort by **impressions DESC** → identify top 10–20 queries
- Identify **mid-rank opportunities** (position 5–20, fast wins)
- Group into clusters: seasonal / product type / brand / use case

### Step 3 — `meta_title`
- Maps to `collection_content.meta_title`
- Format: `[Primary Keyword] Australia – [Modifiers] | The Equestrian`
- 50–60 characters
- Must differ from H1

### Step 4 — `h1_title`
- Maps to `collection_content.h1_title`
- Format: `[Category] for [Conditions / Use Case]`
- Natural language, NOT matching meta_title
- Must use correct equestrian terminology

### Step 5 — Layout (do NOT change)
The category page template renders in this fixed order — content-only changes below:

```
H1  (h1_title)
short_description — visible above "Read more"
  <!--read-more-trigger-->
  short_description — collapsed by default
Pill navigation (do not touch — driven by collection_mapping table)
Product grid
Trust icons
long_description  ← agent writes this
```

Pill section already uses `<section>` + sr-only `<h2>` via `CategoryPills.tsx`.

### Step 6 — `short_description`
- Maps to `collection_content.short_description`
- First visible paragraph: 1 sentence using primary keyword
- After `<!--read-more-trigger-->`: 2–3 sentences expanding context (collapsed by default)
- No `<h2>` tags here

### Step 7 — `long_description` (below-grid HTML)
Required structure — in this order:

```html
<!-- 1. Core section -->
<h2>[Category] Explained</h2>
<p>Overview</p>

<!-- 2. GSC cluster sections (one per cluster) -->
<h3>[Cluster name]</h3>
<p>Short explanation using keyword naturally</p>

<!-- 3. Brand block — ONLY if: brand appears in GSC + /brands/{handle} exists in DB -->
<h2>Shop [Category] by Brand</h2>
<p>… <a href="/brands/handle">Brand Name</a> …</p>
<!-- Max 4 brands on rugs (intentional exception); otherwise 1–3 -->

<!-- 4. FAQ block -->
<h2>[Category] FAQs</h2>
<h3>Question?</h3>
<p>Answer</p>
<!-- 3–5 FAQs, sourced from GSC question queries -->
```

**Internal linking rules:** See full spec below in [Internal Linking Rules (Advanced)](#internal-linking-rules-advanced).

### Step 8 — Brand block rules
Only add a brand if:
1. Brand appears in GSC queries for this page, **and**
2. A **published `brand_content` row** exists for that handle (check: `SELECT handle, status FROM brand_content WHERE status = 'published'`)
3. A **Shopify collection with that handle** exists (run `npx tsx scripts/verify-brand-collections.ts`)

Format:
```html
<h2>Shop by Brand</h2>
<p>Shop brands including <a href="/brands/zilco">Zilco</a>.</p>
```

### Step 9 — `meta_description`
- Maps to `collection_content.meta_description`
- 150–160 characters
- Include primary keyword + call to action + "Free shipping Australia-wide" if space

---

## DB fields written (collection_content table)

| Field | Type | Notes |
|---|---|---|
| `meta_title` | TEXT | SEO title tag (50–60 chars) |
| `meta_description` | TEXT | SERP description (150–160 chars) |
| `h1_title` | TEXT | On-page H1 |
| `short_description` | TEXT | HTML, split by `<!--read-more-trigger-->` |
| `long_description` | TEXT | HTML, below-grid only |
| `breadcrumb_label` | TEXT | Short nav label (optional update) |
| `faq_items` | JSONB | Set to `[]` — FAQs live inline in `long_description` |
| `generated_by` | TEXT | Set to `'manual'` |
| `version` | INT | Auto-incremented |

Fields **not touched**: `url_path`, `parent_url`, `category_level`, `status`, `default_sort`, `related_categories`.

---

## Content module template

Create `scripts/seo-pages/<slug>.ts`:

```typescript
import type { PageSEOContent } from '../run-page-seo-update';

/**
 * /path/to/page — optimised [Month Year]
 * GSC clusters: [list]
 */
const content: PageSEOContent = {
  url_path: '/path/to/page',
  meta_title: '',
  meta_description: '',
  h1_title: '',
  breadcrumb_label: '',
  short_description: `<p>…</p>
<!--read-more-trigger-->
<p>…</p>`,
  long_description: `<h2>… Explained</h2>
…
<h2>… FAQs</h2>
<h3>?</h3>
<p>…</p>`,
};

export default content;
```

---

## Quality checklist before applying

- [ ] meta_title 50–60 chars, includes "The Equestrian" or keyword
- [ ] h1_title ≠ meta_title, natural language, correct terminology
- [ ] meta_description 150–160 chars
- [ ] short_description has `<!--read-more-trigger-->` on its own line
- [ ] long_description: core → clusters → brand (if applicable) → FAQs
- [ ] No pill links duplicated in long_description
- [ ] Max 2–3 contextual links (plus brand block links)
- [ ] Brand links verified in DB + Shopify Storefront API
- [ ] No AI spam / keyword stuffing
- [ ] Dry-run passes (`--dry-run`)

---

## Pages completed

| URL | Slug | Date | GSC clusters |
|---|---|---|---|
| `/horse/rugs` | `horse-rugs` | 2026-03 | summer rugs, winter/waterproof rugs, specialist (towel rug, neck sweats) |
| `/horse/rugs/winter` | `horse-rugs-winter` | 2026-03 | core winter rugs (pos 39 gap), foal/pony rugs, heavyweight/1200d spec, fleece/wool/canvas |

---

---

# Internal Linking Rules (Advanced)

## Purpose

Internal links must reinforce:
- category hierarchy
- topical relationships
- crawl efficiency

---

## 1. Primary Structure (Handled by Pills)

- Pill navigation = main subcategory linking system
- Do NOT duplicate these links in content

---

## 2. Parent Linking (MANDATORY)

Every subcategory page MUST link to its parent category.

### Example:
- `/horse/rugs/winter` links to `/horse/rugs`

### Implementation:
Add 1 natural link in the intro or first cluster section:

```html
Browse our full range of <a href="/horse/rugs">horse rugs</a>.
```

**`short_description`:** Do **not** put the parent-category sentence or `<a href="parent">` in CMS HTML for collection pages. The app renders **“They are part of our wider [Link]… collection.”** via `CollectionDescription` + `parent_url` (or derived parent path), so the parent link is always a real Next.js `Link` and is not stuck behind 48h ISR HTML caching.

For inline links inside the intro HTML (e.g. siblings), keep them **before** `<!--read-more-trigger-->` if they must show without expanding Read more.

---

## 3. Sibling Linking (HIGH IMPACT)

Each page should link to 1-3 closely related subcategories.

### Examples:
- winter rugs page links to summer rugs
- rain rugs page links to mesh rugs

### Rules:
- max 2-3 sibling links total
- only relevant relationships
- do not force links

---

## 4. Contextual Linking Rules

### DO:
- use natural anchor text
- embed links in sentences

```html
Winter rugs are designed for colder conditions, while <a href="/horse/rugs/summer">summer rugs</a> are better suited to warmer climates.
```

### DO NOT:
- repeat exact anchors excessively
- link the same page more than once
- use generic anchors like "click here"

---

## 5. Brand Linking (Controlled)

- max 1-3 brand links per page
- only if brand appears in GSC AND a published brand page exists

---

## 6. Link Limits Per Page

| Type | Count |
|---|---|
| Parent category link | 1 |
| Sibling links | 1-3 |
| Brand links | 1-3 |
| **Total contextual links** | **max 5** |

---

## 7. Priority Order

1. Parent category
2. Closest subcategories
3. High-value brand pages

---

## 8. No Em-Dashes Rule

Content must not contain em-dashes (--) or en-dashes (-) in rendered HTML.

| Instead of | Use |
|---|---|
| `warm -- ideal for` | `warm, ideal for` |
| `300g--400g` | `300g to 400g` |
| `Yes -- a combo rug` | `Yes. A combo rug` or `Yes, a combo rug` |
| `-- including sizes` | `, including sizes` |

This applies to: `meta_title`, `meta_description`, `short_description`, `long_description`.
Hyphens (-) in compound words (`cold-weather`, `1200-denier`) are fine.

---

## Core Principle

Internal linking should:
- clarify site structure
- support user navigation
- reinforce topical relationships

NOT:
- clutter the page
- repeat navigation
- over-optimise

---

## Related files

| Path | Purpose |
|---|---|
| `scripts/run-page-seo-update.ts` | Shared DB writer |
| `scripts/seo-pages/*.ts` | Per-page content modules |
| `lib/content/collections.ts` | Reads `collection_content` for the app (cache TTL: `COLLECTION_CONTENT_CACHE_TTL_MS`) |
| `lib/db/schema/collection-content.sql` | Full schema reference |
| `lib/mapping/collection-mapping.ts` | Pill structure — do not modify |
| `lib/seo/pill-anchor-text.ts` | Pill display labels — do not modify |
| `components/collection/RichContent.tsx` | Renders `long_description` below grid |
| `components/collection/CollectionDescription.tsx` | Renders `short_description` with read-more |

---

## GitHub Wiki

Publish this runbook to the repo wiki as **Category Page SEO Updates**:

- Wiki: [optizenapp/theequestrian/wiki](https://github.com/optizenapp/theequestrian/wiki)
- Built file (for copy or push): `docs/github-wiki/Category-Page-SEO-Updates.md`
- Sync steps and `optizenapp` push notes: `docs/github-wiki/README.md`

Rebuild the wiki file after editing this document:

```bash
cat docs/github-wiki/_wiki-banner.md docs/CATEGORY-SEO-OPTIMISATION-RUNBOOK.md > docs/github-wiki/Category-Page-SEO-Updates.md
```
