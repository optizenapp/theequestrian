"""Prompt for analyzing SERP competitors using Koray's Semantic SEO framework."""

import json


def build_serp_analysis_prompt(query: str, results: list[dict]) -> str:
    """Build the prompt for Claude to analyze SERP results."""

    # Prepare results data (trim for token efficiency)
    results_data = []
    for r in results:
        content = r.get("extracted_content", {})
        results_data.append({
            "position": r.get("position"),
            "url": r.get("url"),
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "meta_title": content.get("meta_title", ""),
            "meta_description": content.get("meta_description", ""),
            "headings": content.get("headings", []),
            "content_preview": content.get("content_preview", "")[:1500],
            "word_count": content.get("word_count", 0),
            "internal_link_count": content.get("internal_link_count", 0),
            "has_faq_schema": content.get("has_faq_schema", False),
        })

    return f"""You are an expert SEO analyst trained in Koray Tuğberk Gübür's Semantic SEO and Topical Authority framework.

Analyze the following Google page 1 results for the query: "{query}"

## Your Analysis Framework (Koray Principles)

Score each result (1-10) on these criteria:

1. **Single Macro Context**: Does the page maintain ONE clear primary topic without dilution?
2. **NLP Compliance**: Is content structured for BERT/MUM extraction? Clear sentences, factual, no filler?
3. **Heading-as-Questions**: Are H2/H3s framed as actual user search queries?
4. **Extractive Answers**: Do headings have concise (~40 word) factual answers immediately after?
5. **E-A-V Coverage**: Does content cover relevant Entities, their Attributes, and Values comprehensively?
6. **Semantic Relevance**: Does the content cover the topic's semantic field (hypernyms, hyponyms, related concepts)?
7. **Internal Linking Quality**: Hub↔spoke structure? Contextual links to related topics?
8. **Topical Authority Signals**: Does the site demonstrate depth across the topic's knowledge domain?
9. **Content Structure**: Logical contextual hierarchy? Proper document template for the intent?
10. **Schema/Structured Data**: FAQ schema, Product schema, proper markup?

## SERP Results Data

```json
{json.dumps(results_data, indent=2, default=str)}
```

## Required Output

Respond with ONLY a JSON object in this exact structure:

{{
    "query_intent": "informational|transactional|navigational|commercial",
    "document_template": "What document template dominates page 1 (e.g., product page, guide, listicle, comparison, FAQ)",

    "competitor_scores": [
        {{
            "position": 1,
            "url": "...",
            "scores": {{
                "single_macro_context": 8,
                "nlp_compliance": 7,
                "heading_as_questions": 6,
                "extractive_answers": 5,
                "eav_coverage": 7,
                "semantic_relevance": 8,
                "internal_linking": 6,
                "topical_authority": 7,
                "content_structure": 8,
                "schema_markup": 5
            }},
            "overall_score": 6.7,
            "strengths": ["...", "..."],
            "weaknesses": ["...", "..."]
        }}
    ],

    "content_gaps": [
        "Specific topic/entity/attribute NOT covered by any top result",
        "..."
    ],

    "winning_patterns": [
        "Pattern that top 3 results all share",
        "..."
    ],

    "recommended_approach": {{
        "target_word_count": 1500,
        "heading_structure": [
            "H1: ...",
            "H2: ... (as question)",
            "H2: ... (as question)"
        ],
        "must_cover_entities": ["entity1", "entity2"],
        "must_cover_attributes": ["attr1", "attr2"],
        "internal_linking_targets": ["related topic/category URL patterns"],
        "schema_recommendations": ["FAQPage", "Product"],
        "differentiation_strategy": "How to outperform current page 1"
    }}
}}"""
