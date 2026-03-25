# Internal Link Redirect Audit & Cleanup Plan

## Objective

Eliminate all internal links that rely on redirects and ensure every internal link points directly to the final canonical URL.

**Goal state:**
- No internal links → 3xx responses
- All links → 200 canonical URLs
- No legacy URL patterns used anywhere internally

---

## Definitions

- **Legacy URLs**: Old Shopify paths such as:
  - /products/...
  - /collections/...
  - /blogs/news/...

- **Canonical URLs**: Current live URL structure (e.g. /horse/..., /clothing/..., /news/...)

- **Redirect-dependent link**:
  Any internal link that resolves as:
  internal link → 301/302 → final URL

---

## High-Level Strategy

1. Identify all legacy URLs still used internally
2. Locate where those links are generated (code or content)
3. Replace with direct canonical URLs
4. Validate via crawl
5. Repeat until zero redirect-dependent links remain

---

## Phase 1 — Build Redirect Mapping

### Step 1.1 — Export Redirect Rules

Create a master dataset with:
- Old URL (source)
- New URL (destination)
- Status (active/inactive)

Normalize:
- Remove domain (use path only)
- Standardize trailing slashes
- Ensure lowercase consistency

---

## Phase 2 — Identify Problem Links

### Step 2.1 — Crawl Site

Use Screaming Frog or equivalent.

Extract:
- All internal URLs returning 3xx
- Their inlink counts
- Source pages linking to them

### Step 2.2 — Prioritise

Sort by:
- Highest number of internal inlinks
- Sitewide templates (nav, cards, breadcrumbs)

---

## Phase 3 — Classify Link Sources

Split into two categories:

### A. Template-Generated Links (High Priority)
Generated via code:
- Navigation menus
- Breadcrumbs
- Product cards
- Category cards
- Related content
- Featured sections

### B. Content-Managed Links
Stored in:
- Blog HTML
- CMS/WYSIWYG content
- Product descriptions
- Metafields

---

## Phase 4 — Codebase Audit (Next.js)

### Step 4.1 — Global Search

Search project for:
"/products/"
"/collections/"
"/blogs/news/"

Inspect:
- components/
- pages/ or app/
- utils/
- helpers/
- config files

---

### Step 4.2 — Identify URL Builders

Find functions like:
- getProductUrl()
- getCategoryUrl()
- getArticleUrl()
- linkResolver()

Check for legacy logic.

---

## Phase 5 — Centralise URL Logic

Create canonical URL helpers and ensure all links use them.

---

## Phase 6 — Fix High-Impact Templates

Audit and fix:
- Navigation
- Breadcrumbs
- Cards
- Homepage modules

---

## Phase 7 — Content Cleanup

Search and replace legacy links in CMS and blog content.

---

## Phase 8 — Validation

Re-crawl and confirm:
- No internal 3xx links
- Clean internal linking

---

## Phase 9 — Iteration Loop

Repeat until clean.

---

## Definition of Done

- Zero important internal 3xx links
- Templates generate only canonical URLs
- Legacy paths removed

---

## Guiding Principle

If a user clicks an internal link and hits a redirect, the link is incorrect.
