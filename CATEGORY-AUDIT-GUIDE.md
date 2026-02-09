# Category Structure Audit & Mapping Guide

## Overview

This guide explains how to use the category audit system to:
1. Map 369 old Shopify URLs to your new headless structure
2. Identify missing category pages that need to be created
3. Generate redirect mappings automatically using AI
4. Review and apply changes safely

## Prerequisites

- Anthropic API key in `.env.local` (variable: `ANTHROPIC_API_KEY`)
- Database connection configured (`POSTGRES_URL`)
- All existing category and brand data loaded

## Step-by-Step Process

### Step 1: Run Dry Run (30 Sample URLs)

This processes the first 30 URLs to give you a preview of how the mapping works.

```bash
npm run audit:categories
```

**What it does:**
- Loads 30 old URLs from `docs/all_collection_urls.csv`
- Uses pattern matching + Anthropic Claude AI to suggest mappings
- Identifies which categories need to be created
- Generates preview reports in `exports/`

**Output files:**
- `exports/dry-run-sample-report-[timestamp].json` - Full detailed report
- `exports/dry-run-sample-redirects-[timestamp].csv` - Redirect mappings
- `exports/dry-run-sample-missing-categories-[timestamp].csv` - Categories to create

**Review checklist:**
1. Check AI-suggested mappings (look for `method: "ai-suggested"`)
2. Verify confidence levels (`high`, `medium`, `low`)
3. Review missing categories - do they make sense?
4. Check if brand URLs are correctly mapped to `/brands/`

### Step 2: Review Sample Output

Open the generated CSV files and check:

**In `redirects` CSV:**
- `from`: Old Shopify URL
- `to`: New headless URL
- `method`: How it was mapped
  - `exact-match`: Already in redirects CSV
  - `brand-match`: Matched to existing brand
  - `pattern-match`: Fuzzy string matching
  - `ai-suggested`: Claude AI suggestion
- `confidence`: `high`, `medium`, or `low`
- `reasoning`: Why this mapping was chosen
- `is_new_category`: Whether the target category needs to be created

**In `missing-categories` CSV:**
- `url_path`: New category path to create
- `parent_url`: Parent category
- `category_level`: 1 (top), 2 (sub), or 3 (sub-sub)
- `top_level`: Which top-level category it belongs to
- `suggested_label`: Human-readable name
- `created_for_urls`: Which old URLs map to this

**Red flags to watch for:**
- ❌ Low confidence AI suggestions - may need manual review
- ❌ Categories mapped to wrong top-level (e.g., horse product → clothing)
- ❌ Missing categories at wrong hierarchy level
- ❌ Brand pages mapped to category URLs (should be `/brands/`)

### Step 3: Run Full Analysis (All 369 URLs)

Once you're happy with the sample results:

```bash
npm run audit:categories:full
```

**What it does:**
- Processes all 369 old URLs
- Takes ~6-10 minutes (AI rate limiting: 1 request/second)
- Generates complete mapping report

**Output files:**
- `exports/full-audit-report-[timestamp].json`
- `exports/full-audit-redirects-[timestamp].csv`
- `exports/full-audit-missing-categories-[timestamp].csv`

### Step 4: Manual Review & Adjustments

1. **Review AI suggestions with medium/low confidence:**
   - Open the redirects CSV
   - Filter by `confidence: medium` or `confidence: low`
   - Manually verify these mappings make sense
   - Edit the CSV if needed

2. **Check for duplicates:**
   - Multiple old URLs mapping to same new URL is OK
   - But verify they're semantically related

3. **Validate missing categories:**
   - Check if parent categories exist
   - Ensure hierarchy makes sense (max 3 levels)
   - Verify top-level category is correct

4. **Save your edits:**
   - Keep the CSV format intact
   - Don't change the `from` column (old URLs)
   - You can modify the `to` column (new URLs)

### Step 5: Create Missing Categories

Before applying redirects, create the missing category pages:

```bash
# This will be implemented in the next phase
npm run create:categories -- --from exports/full-audit-missing-categories-[timestamp].csv
```

**What it does:**
- Inserts rows into `collection_content` table
- Creates basic structure (url_path, parent_url, category_level, status)
- Does NOT generate content (use existing content scripts for that)

**Then generate content:**
```bash
# Use your existing content generation script
npm run content:generate
```

### Step 6: Apply Redirect Mappings

Once categories are created and you've reviewed the mappings:

```bash
npm run audit:categories:apply
```

**What it does:**
- Updates `redirects/collections.csv` with new mappings
- Runs `scripts/generate-redirects.ts` to regenerate `lib/redirects/maps.ts`
- Validates no circular redirects exist

**Then deploy:**
```bash
git add redirects/collections.csv lib/redirects/maps.ts
git commit -m "Add complete redirect mappings for old Shopify URLs"
git push
```

## Understanding the Mapping Logic

### Priority Order

1. **Exact Match** (Confidence: High)
   - URL already in `redirects/collections.csv`
   - No changes needed

2. **Brand Match** (Confidence: High)
   - First segment matches brand handle in `brand-mapping.csv`
   - Maps to `/brands/{handle}`

3. **Pattern Match** (Confidence: High/Medium)
   - Fuzzy string matching against existing categories
   - Considers segment similarity and hierarchy
   - High confidence: Score ≥ 4
   - Medium confidence: Score ≥ 2

4. **AI Suggested** (Confidence: High/Medium/Low)
   - Claude AI analyzes semantic meaning
   - Considers context and category structure
   - Can suggest new categories if no good match exists

### AI Prompt Strategy

The AI receives:
- Old URL and extracted segments
- Complete existing category structure by top-level
- Rules about hierarchy (max 3 levels, fixed top-levels)
- Instructions to prefer existing categories

The AI returns:
- Best matching path (existing or new)
- Confidence level with reasoning
- Whether it's suggesting a new category

## Troubleshooting

### "ANTHROPIC_API_KEY not found"
Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### "Failed to load categories"
Check database connection:
```bash
# Test connection
npm run db:stats
```

### "AI mapping failed"
- Check API key is valid
- Check rate limits (script waits 1s between AI calls)
- Review error message in console

### Too many low-confidence mappings
- Increase sample size to see more patterns
- Manually review and edit the CSV
- Consider adding more existing categories first

## Next Steps After Mapping

1. **Product Reallocation** (Phase 4 of plan)
   - Run script to update product canonical URLs
   - Ensure products use deepest appropriate category
   - Fix any brand canonical issues

2. **Empty Category Redirects** (Phase 5 of plan)
   - Implement auto-redirect logic in page components
   - Categories with 0 products redirect up hierarchy

3. **Dynamic Navigation** (Phase 6 of plan)
   - Update menu pills to hide empty categories
   - Use cached product counts for performance

## File Locations

### Input Files
- `docs/all_collection_urls.csv` - Old URLs to map
- `exports/collection-content.csv` - Existing categories
- `exports/brand-mapping.csv` - Existing brands
- `redirects/collections.csv` - Current redirects

### Output Files
- `exports/dry-run-sample-*` - Preview results (30 URLs)
- `exports/full-audit-*` - Complete results (369 URLs)

### Scripts
- `scripts/audit-and-map-categories.ts` - Main audit script
- `scripts/generate-redirects.ts` - Regenerates redirect maps
- `scripts/ai-generate-collection-content.ts` - Content generation

## Tips for Best Results

1. **Start with dry run** - Always review sample before full run
2. **Review AI suggestions** - Don't blindly trust medium/low confidence
3. **Check hierarchy** - Ensure new categories fit within existing structure
4. **Test redirects** - Verify a few manually before deploying
5. **Backup first** - Keep copies of original CSV files

## Support

If you encounter issues:
1. Check the generated JSON report for detailed error messages
2. Review the `reasoning` field in the redirects CSV
3. Look for patterns in failed mappings
4. Consider manually mapping problematic URLs

## Example Workflow

```bash
# 1. Dry run (30 samples)
npm run audit:categories

# 2. Review outputs in exports/
open exports/dry-run-sample-redirects-*.csv

# 3. Full analysis
npm run audit:categories:full

# 4. Review and edit if needed
open exports/full-audit-redirects-*.csv

# 5. Create missing categories
npm run create:categories -- --from exports/full-audit-missing-categories-*.csv

# 6. Generate content for new categories
npm run content:generate

# 7. Apply redirects
npm run audit:categories:apply

# 8. Deploy
git add . && git commit -m "Complete category structure" && git push
```

## Summary Statistics

After running, you'll see:
- Total old URLs analyzed
- Already mapped vs new mappings
- Unmappable URLs (need manual review)
- Missing categories to create
- Breakdown by mapping method
- Breakdown by confidence level
- Breakdown by top-level category

This helps you understand the scope of changes and identify areas needing attention.
