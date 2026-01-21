# AI Product Type Classifier - Setup Guide

## Overview

This system uses AI (OpenAI GPT-4o + Anthropic Claude Sonnet 4.5) to automatically classify products that are missing proper product types.

**Current Problem:**
- 784 products with no product type
- 152 products with generic "Default" type
- 157 products with ambiguous "Veterinary" type

**Solution:**
AI analyzes product title, vendor, tags, and collections to suggest the most appropriate product type from your 488 valid types.

---

## Setup Instructions

### 1. Add API Keys to Environment

Add these two lines to your `.env.local` file:

```bash
# AI Classification
OPENAI_API_KEY=sk-proj-...  # Get from https://platform.openai.com/api-keys
ANTHROPIC_API_KEY=sk-ant-...  # Get from https://console.anthropic.com/settings/keys
```

**Getting API Keys:**

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-`)
4. Add $5-10 credit to your account (this project will cost ~$0.10 total)

**Anthropic:**
1. Go to https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy the key (starts with `sk-ant-`)
4. Add $5-10 credit (used only for validation, ~$0.02 total)

---

## Usage

### Test Mode (Recommended First Step)

Test on 10 products without making any changes:

```bash
npm run ai:classify-products -- --dry-run --limit=10
```

This will:
- Fetch 10 products needing classification
- Run AI classification
- Show results in terminal
- NOT create any CSV files

### Full Classification

Classify all products needing types:

```bash
npm run ai:classify-products
```

This will:
- Process all ~784 products in batches of 50
- Use OpenAI for initial classification
- Use Claude to validate low-confidence results
- Export results to `exports/products-classified-by-ai.csv`

### Partial Processing

Process specific ranges:

```bash
# Process first 50 products
npm run ai:classify-products -- --limit=50

# Process next 50 products (51-100)
npm run ai:classify-products -- --start=50 --limit=50

# Process products 100-200
npm run ai:classify-products -- --start=100 --limit=100
```

---

## How It Works

### Classification Pipeline

```
1. Fetch Product from Shopify
   ↓
2. Extract Features (title, vendor, tags, collections)
   ↓
3. OpenAI GPT-4o-mini Classification
   ↓
4. Confidence Check
   ├─ 85%+ → Auto-accept ✅
   └─ <85% → Send to Claude for validation
      ├─ Claude agrees → Accept ✅
      └─ Claude disagrees → Mark for review ⚠️
   ↓
5. Export to CSV
```

### Confidence Levels

- **90-100%**: Very clear (e.g., "helmet" in title → "Helmets")
- **85-89%**: High confidence, auto-accepted
- **70-84%**: Good match, validated by Claude
- **Below 70%**: Uncertain, needs manual review

### Validation Status

- **auto**: High confidence, automatically accepted
- **claude-validated**: Low initial confidence, validated by Claude
- **needs-review**: Both AIs uncertain, requires manual review

---

## Output Format

The script creates `exports/products-classified-by-ai.csv` with these columns:

| Column | Description |
|--------|-------------|
| Product ID | Shopify product ID |
| Handle | Product URL handle |
| Title | Product title |
| Current Product Type | Existing type (or empty) |
| Vendor | Product vendor |
| Tags (first 5) | Product tags |
| Collections (first 3) | Collections product belongs to |
| **AI Suggested Type** | AI's classification |
| **Confidence %** | 0-100 confidence score |
| **Validation Status** | auto / claude-validated / needs-review |
| **Reasoning** | Why this type was chosen |
| Alternative Types | Other possible types |
| **Manual Override** | Empty - fill this if you disagree |

---

## Review & Import Process

### 1. Review the CSV

```bash
open exports/products-classified-by-ai.csv
```

Focus on:
- Rows with "needs-review" status
- Rows with confidence < 85%
- Any suggestions that seem incorrect

### 2. Fill Manual Overrides

If you disagree with AI suggestion:
1. Leave "AI Suggested Type" as-is
2. Fill "Manual Override" column with correct type
3. Add note in "Reasoning" column

### 3. Import to Shopify

**Option A: Bulk Editor (Recommended)**
1. Go to Shopify Admin → Products
2. Select products by ID (from CSV)
3. Bulk actions → Edit products
4. Update "Product type" field

**Option B: CSV Import**
1. Create import CSV with columns: `Handle`, `Product Type`
2. For each product, use "AI Suggested Type" OR "Manual Override"
3. Go to Products → Import
4. Upload CSV

### 4. Verify on Frontend

After import:
1. Clear Next.js cache: `rm -rf .next`
2. Restart dev server: `npm run dev`
3. Visit category pages: `/rider/helmets`, `/horse/boots`, etc.
4. Verify products appear correctly

---

## Cost Estimation

**For 784 products:**

| Service | Usage | Cost |
|---------|-------|------|
| OpenAI GPT-4o | 1,440 classifications | ~$1.45 |
| Claude Sonnet 4.5 | 1,440 validations (100%) | ~$2.15 |
| **Total** | | **~$3.60** |

**Per batch of 50 products:** ~$0.12

Note: Using dual AI validation (GPT-4o + Claude Sonnet 4.5) on every product provides the highest accuracy and catches edge cases that single AI might miss.

---

## Troubleshooting

### "OPENAI_API_KEY environment variable is required"

Make sure you've added the API key to `.env.local` and restarted the terminal.

### "Access denied" or "Invalid API key"

Check that your API keys are correct and have available credits.

### "No response from OpenAI/Claude"

Check your internet connection and API service status:
- OpenAI: https://status.openai.com/
- Anthropic: https://status.anthropic.com/

### Low confidence scores across the board

This might indicate:
- Product titles are too generic
- Not enough context (tags/collections)
- Product types in mapping don't match products well

Review a few examples manually to see if the suggestions make sense.

---

## Examples

### High Confidence Classification

```
Product: "KEP Smart Nova Helmet - Polish Blue"
Vendor: "Ascot Saddlery"
Tags: ["helmet", "riding", "safety"]

AI Suggested Type: "Helmets"
Confidence: 98%
Reasoning: "Clear helmet product based on title and tags"
Status: auto
```

### Claude Validation

```
Product: "Leather Care Kit"
Vendor: "The Equestrian"
Tags: ["leather", "care", "maintenance"]

OpenAI: "Accessories" (confidence: 72%)
Claude: "STABLE: Leather Care & Proofing" (confidence: 88%)

Final: "STABLE: Leather Care & Proofing"
Status: claude-validated
```

### Needs Review

```
Product: "Multi-Purpose Tool"
Vendor: "Generic Supplies"
Tags: ["tool", "utility"]

AI Suggested Type: "STABLE: Stable Equipment"
Confidence: 45%
Reasoning: "Unclear product category, could be stable equipment or farrier tool"
Status: needs-review
Alternative Types: ["STABLE: Farrier", "Accessories"]
```

---

## Next Steps After Classification

1. ✅ All products have proper product types
2. ✅ Products appear in correct categories on frontend
3. ✅ Merge logic handles variants (RIDER: Helmets → Helmets)
4. 🔄 Set up Shopify Flow to auto-publish new products to Headless
5. 🔄 Monitor for new products from vendors

---

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review the terminal output for specific errors
3. Check the CSV output to see what the AI suggested
4. Test with `--dry-run --limit=5` to debug without making changes
