"""Prompt for generating enriched content using Koray's Semantic SEO framework.

This is the core prompt that drives content generation. It incorporates:
- Koray's 41 semantic SEO rules
- E-A-V (Entity-Attribute-Value) methodology
- Topical authority principles
- Performance data (GSC/GA4) for targeted optimization
- Competitive intelligence from SERP analysis
"""

import json
from typing import Any


# ──────────────────────────────────────────────────────────────
# SYSTEM PROMPT: Koray Framework Reference
# ──────────────────────────────────────────────────────────────
# NOTE: Replace the placeholder below with actual excerpts from
# Koray's course material that you own. This dramatically improves
# output quality.

KORAY_FRAMEWORK_REFERENCE = """
## Koray Tuğberk Gübür's Core Semantic SEO Rules (Reference Summary)

### Foundational Principles
1. Single Macro Context per page — one primary topic, zero dilution
2. Every heading (H2/H3) should be a user question or search query
3. Each heading must be followed by a ~40-word extractive answer (featured snippet format)
4. Content must be factual, expert-level — no filler, no opinions unless attributed
5. Entity-Attribute-Value coverage must be comprehensive for the topic
6. Contextual hierarchy: organize content from broad context → specific details
7. Hub ↔ Spoke internal linking based on semantic relationships

### Content Structure Rules
8. Use the correct document template for the search intent (product page, guide, comparison, FAQ, etc.)
9. Contextual vectors: every sentence should advance the page's macro context
10. No contextual drift — if a section doesn't serve the macro context, remove it
11. Lexical semantics: use hypernyms, hyponyms, holonyms, meronyms naturally
12. Semantic closeness: related terms should appear near each other
13. Cover the full semantic field of the topic without keyword stuffing

### Technical SEO Integration
14. Clean URL structure reflecting topical hierarchy
15. Schema markup aligned with content (FAQ, Product, HowTo, etc.)
16. Consolidate ranking signals — no duplicate or thin content
17. Every internal link must have contextually relevant anchor text

### E-A-V (Entity-Attribute-Value) Methodology
- Identify all entities relevant to the page's topic
- Cover each entity's attributes comprehensively
- Provide specific values for each attribute
- Example: Entity="Running Shoe" → Attributes=[cushioning, weight, drop, upper material, outsole]
  → Values=[React foam, 280g, 8mm, engineered mesh, rubber waffle]

### Topical Map Position
- Each page exists within a topical map (core section vs outer section)
- Core pages are the main commercial/informational hubs
- Outer pages support and reinforce core pages
- Internal links flow from outer → core and between related nodes

### Quality Signals
- Content should satisfy both initial ranking factors AND re-ranking factors
- User satisfaction signals matter: answer the query completely
- Historical data: consistency and depth across the knowledge domain build authority
- Cost of retrieval: make it easy for search engines to extract information

[IMPORTANT: Add your own notes from Koray's course lectures here.
The more specific the reference material, the better the output quality.
Include examples from his case studies that are relevant to ecommerce.]
"""


def build_product_enrichment_prompt(
    product_data: dict,
    gsc_data: dict,
    ga4_data: dict,
    serp_analysis: dict,
    category_context: list[dict],
    existing_internal_links: list[dict],
) -> list[dict]:
    """Build the prompt for enriching a product page.

    Returns list of messages for the Claude API.
    """
    system_msg = f"""You are an expert ecommerce SEO content writer trained in Koray Tuğberk Gübür's
Semantic SEO and Topical Authority framework. You write content that ranks.

{KORAY_FRAMEWORK_REFERENCE}

## Your Task
Enrich a product page for a headless Shopify store. You must produce content that:
1. Follows ALL Koray framework principles above
2. Targets the specific search queries identified by GSC data
3. Outperforms the current page 1 competitors based on SERP analysis
4. Maintains the correct E-A-V coverage for this product type
5. Uses hub↔spoke internal linking to build topical authority
6. Keeps the same pricing, inventory, and variant information (never change these)

## Output Format
Respond with ONLY a JSON object. No preamble, no explanation outside the JSON."""

    user_msg = f"""## Current Product Data
```json
{json.dumps(product_data, indent=2, default=str)}
```

## Search Performance (Last 30 Days — GSC)
```json
{json.dumps(gsc_data, indent=2, default=str)}
```

## Revenue & Engagement (Last 30 Days — GA4)
```json
{json.dumps(ga4_data, indent=2, default=str)}
```

## SERP Competitive Analysis
```json
{json.dumps(serp_analysis, indent=2, default=str)}
```

## Category Context (for internal linking)
This product belongs to these categories:
```json
{json.dumps(category_context, indent=2, default=str)}
```

## Existing Internal Links
```json
{json.dumps(existing_internal_links[:20], indent=2, default=str)}
```

## Required Output

Generate enriched content as a JSON object with this exact structure:

{{
    "meta_title": "Optimized title tag (50-60 chars). Must include primary target query naturally. No pipe separators or brand stuffing.",

    "meta_description": "Compelling meta description (140-155 chars). Include primary query. Must drive clicks — address the searcher's intent directly. Include a differentiator.",

    "title_override": "H1 title for the page. Can differ from meta_title. Should be the clearest statement of what this page is about (single macro context).",

    "description_html": "<p>Main product description in HTML. Apply Koray rules: factual, expert-level, comprehensive E-A-V coverage. Cover all relevant entities, attributes, and values for this product type. Use semantic field naturally (hypernyms, hyponyms). No filler or fluff. Each paragraph should advance the macro context. Aim for 200-400 words.</p>",

    "top_description_html": "<p>Above-the-fold content. 2-3 sentences max. Extractive answer format — directly address what the searcher wants to know. Include primary entity and key differentiating attributes.</p>",

    "bottom_description_html": "<div>Below-the-fold supplementary content. Can include: extended E-A-V coverage, usage context, comparison to category, care/maintenance info. Use H2s as questions where appropriate. Include contextual internal links. 200-400 words.</div>",

    "bullet_points": [
        "Key attribute: specific value (e.g., 'Cushioning: React foam midsole with 8mm heel-to-toe drop')",
        "Each bullet covers one Entity-Attribute-Value triple",
        "5-8 bullets covering the most important product attributes",
        "Factual, specific, no marketing fluff"
    ],

    "internal_link_suggestions": [
        {{
            "target_path": "/collections/relevant-category",
            "anchor_text": "Contextually relevant anchor text",
            "context": "Sentence where this link should be placed",
            "link_type": "hub_spoke"
        }}
    ],

    "reasoning": "Brief explanation of your optimization strategy: what queries you're targeting, what gaps you're filling vs competitors, how you're building topical authority."
}}

CRITICAL RULES:
- Every claim must be factual and verifiable
- No superlatives unless backed by data ("best", "top", "leading")
- No opinion statements — factual and extractive only
- Meta title MUST be under 60 characters
- Meta description MUST be under 155 characters
- HTML must be clean, semantic, and valid
- Internal links must point to REAL category paths from the category context provided
- Do NOT invent categories or URLs that don't exist
- Bullet points must follow E-A-V format: Attribute → Value"""

    return [
        {"role": "user", "content": user_msg},
    ], system_msg


def build_collection_enrichment_prompt(
    collection_data: dict,
    gsc_data: dict,
    ga4_data: dict,
    serp_analysis: dict,
    sibling_collections: list[dict],
    child_collections: list[dict],
    sample_products: list[dict],
    existing_internal_links: list[dict],
) -> tuple[list[dict], str]:
    """Build the prompt for enriching a collection/category page."""

    system_msg = f"""You are an expert ecommerce SEO content writer trained in Koray Tuğberk Gübür's
Semantic SEO and Topical Authority framework. You write category page content that ranks.

{KORAY_FRAMEWORK_REFERENCE}

## Your Task
Enrich a collection/category page for a headless Shopify store. Collection pages are
HUB PAGES in the topical map — they must:
1. Establish topical authority for the category's knowledge domain
2. Link contextually to spoke pages (products and subcategories)
3. Cover the full semantic field of the category topic
4. Include FAQ content targeting long-tail queries
5. Build the contextual hierarchy: parent → this collection → children → products

## Output Format
Respond with ONLY a JSON object. No preamble, no explanation outside the JSON."""

    user_msg = f"""## Current Collection Data
```json
{json.dumps(collection_data, indent=2, default=str)}
```

## Search Performance (Last 30 Days — GSC)
```json
{json.dumps(gsc_data, indent=2, default=str)}
```

## Revenue & Engagement (Last 30 Days — GA4)
```json
{json.dumps(ga4_data, indent=2, default=str)}
```

## SERP Competitive Analysis
```json
{json.dumps(serp_analysis, indent=2, default=str)}
```

## Topical Map Context

### Sibling Collections (same parent)
```json
{json.dumps(sibling_collections, indent=2, default=str)}
```

### Child Collections
```json
{json.dumps(child_collections, indent=2, default=str)}
```

### Sample Products in this Collection
```json
{json.dumps(sample_products[:10], indent=2, default=str)}
```

### Existing Internal Links
```json
{json.dumps(existing_internal_links[:20], indent=2, default=str)}
```

## Required Output

Generate enriched content as a JSON object with this exact structure:

{{
    "h1_title": "Primary H1 for the collection page. Single macro context. Clear statement of what this category covers.",

    "meta_title": "Optimized title tag (50-60 chars). Include primary query naturally.",

    "meta_description": "Compelling meta description (140-155 chars). Address searcher intent. Include category differentiator.",

    "short_description": "Above-the-fold intro (2-3 sentences). Extractive answer format. Define the category, state what the user will find, include primary entity and key attributes.",

    "long_description": "<div>Comprehensive category description. This is where you build topical authority. Include: \\n- Overview of the knowledge domain this category covers \\n- Key entities, attributes, and values relevant to products in this category \\n- Buying guide elements (what to look for) \\n- Contextual internal links to child categories and sibling categories \\n- Use H2s framed as questions \\n- Each H2 followed by ~40 word extractive answer \\n- Cover the full semantic field \\n- 400-800 words \\n- Hub page: link to spokes (children, products, siblings)</div>",

    "faq_items": [
        {{
            "question": "Actual search query as a question (from GSC data or SERP PAA)",
            "answer": "Concise, factual ~40 word extractive answer. Cover E-A-V. Link to relevant product/category where appropriate."
        }},
        {{
            "question": "Another relevant question targeting long-tail query",
            "answer": "Direct, factual answer."
        }}
    ],

    "related_categories": [
        {{
            "url_path": "/actual/category/path",
            "relationship": "sibling|child|parent|semantic",
            "relevance_reason": "Why this is contextually related"
        }}
    ],

    "internal_link_suggestions": [
        {{
            "target_path": "/products/specific-product-handle or /collections/subcategory",
            "anchor_text": "Contextually relevant anchor",
            "context": "Sentence where link should be placed",
            "link_type": "hub_spoke|contextual|navigational"
        }}
    ],

    "reasoning": "Optimization strategy: target queries, competitor gaps, topical authority approach, how this page fits the topical map."
}}

CRITICAL RULES:
- This is a HUB page — it MUST link contextually to child and sibling collections
- FAQ questions should come from GSC query data and SERP "People Also Ask"
- All internal links must use REAL paths from the provided context
- long_description must establish this page as an authority on its knowledge domain
- Cover the full E-A-V spectrum for this product category
- No marketing fluff — factual, expert, extractive content only
- 5-8 FAQ items targeting different long-tail queries
- related_categories must use REAL url_paths from siblings/children provided"""

    return [
        {"role": "user", "content": user_msg},
    ], system_msg
