# Ecommerce Category Page Framework

Purpose: provide implementation-ready guidance for ecommerce category pages where content exists above and below a product grid.

This framework should be used alongside Ahrefs and/or GSC query data whenever available.

---

## Inputs Required

For each category page, provide:

1. Category URL
2. GSC query data (queries, impressions, clicks, CTR, position) when available
3. Ahrefs keyword and SERP data when available
4. Child subcategories
5. Brands stocked in this category
6. Key hero products or bestsellers
7. Buyer context and common decision questions
8. Competitive differentiators (shipping, support, range, warranty, etc.)

---

## Page Structure Requirements

### Above Grid

- H1 must clearly define the category entity and scope.
- Include a concise quick-answer style intro.
- Keep above-grid description short and conversion-safe (roughly 60-120 words).

### Product Grid

- Grid is the primary conversion surface.
- Content must support browsing and filtering, not displace the grid on mobile.

### Below Grid

Use clear, scannable sections that reflect real buying decisions:

- How to choose the category
- Types/subcategories explained
- Brands in this category
- Practical buying or compatibility guidance
- FAQs based on real customer questions

---

## Metadata Rules

- Meta title: <=60 chars, specific to category attributes (not generic "Shop X").
- Meta description: <=160 chars, include useful scope signals and trust cues.
- H1 must differ from meta title.

---

## Internal Linking Rules

Each category page should include:

- Parent category context
- Child/subcategory links
- 2-4 relevant sibling category links
- Relevant brand page links (when those pages exist)
- Relevant guide/editorial links where helpful

Anchor text must be descriptive and match destination intent.

---

## Trust and Quality Rules

- Avoid templated copy reused across sibling categories.
- Keep claims factual and aligned with real shipping/returns/warranty policies.
- Avoid unverifiable superlatives.
- Keep content customer-facing and decision-oriented.

---

## Schema Expectations

Where supported by the implementation:

- `BreadcrumbList`
- `CollectionPage`
- `ItemList`
- `FAQPage`

---

## Measurement Plan

Track post-launch:

- GSC category query movement
- Filter interactions
- Scroll depth past product grid
- Category-to-product clickthrough
- Add-to-cart and revenue from category entry

---

## QA Checklist

- Unique H1 with category + distinguishing signal
- Concise above-grid copy
- Strong below-grid buying guidance
- Clear heading hierarchy
- Valid metadata lengths
- Descriptive internal links
- No filler or duplicated template text
- Content supports conversion-first UX
