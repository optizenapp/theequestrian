# AI Product Classification Workflow

## Overview
Automated product type classification with review and approval workflow. Classifications are saved to the database and can be reviewed/approved before applying to Shopify via API.

## Workflow Steps

### 1. Run AI Classification Script
```bash
# Dry run (test mode, no saves)
npm run ai:classify-products -- --dry-run --limit=10

# Process first 50 products
npm run ai:classify-products -- --limit=50

# Process next batch
npm run ai:classify-products -- --start=50 --limit=50

# Process all products needing classification
npm run ai:classify-products
```

**What happens:**
- Fetches products from Shopify with missing/invalid product types
- Only processes products from allowed vendors (in `vendor-shipping.csv`)
- Uses dual AI (OpenAI GPT-4o + Claude Sonnet 4.5) for validation
- Saves results to:
  - **Postgres database** (`ai_product_classifications` table)
  - **CSV file** (`exports/ai-classified-products-YYYY-MM-DD.csv`)

### 2. Review Classifications in Admin
Navigate to: `/admin/ai-classifications`

**Features:**
- View all AI-suggested product types
- Filter by:
  - Status: Pending, Approved, Rejected, Applied
  - Review: Needs Review (AIs disagree), Both AIs Agree
- See detailed AI reasoning:
  - OpenAI suggestion + confidence
  - Claude suggestion + confidence
  - Agreement status

**Actions per product:**
- **Approve**: Mark as ready to apply
- **Reject**: Decline the suggestion
- **Reset**: Move rejected back to pending

### 3. Apply to Shopify
Two options:

**Option A: Apply Individual Products**
- Click "Apply to Shopify" on approved classifications
- Updates product type via Shopify Admin API
- Status changes to "Applied"

**Option B: Batch Apply All Approved**
- Click "Apply All Approved" button
- Applies all approved classifications at once
- Shows success/failure count

### 4. Verify Frontend
Once applied, products automatically serve at their category URLs:

**Example:**
```
Product: "Ariat Heritage Boots"
AI Classifies as: "Riding Boots"
→ Applied to Shopify
→ System maps: "Riding Boots" → "clothing/footwear/boots"
→ Product serves at: /clothing/footwear/boots/ariat-heritage-boots
→ Appears on: /clothing/footwear/boots category page
```

## Database Schema

### `ai_product_classifications` Table
```sql
CREATE TABLE ai_product_classifications (
  id SERIAL PRIMARY KEY,
  shopify_id TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT,
  current_type TEXT,
  suggested_type TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  openai_type TEXT NOT NULL,
  openai_confidence INTEGER NOT NULL,
  claude_type TEXT,
  claude_confidence INTEGER,
  both_agree BOOLEAN DEFAULT FALSE,
  needs_review BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',  -- pending, approved, rejected, applied
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

## API Endpoints

### `GET /api/admin/ai-classifications`
Fetch all classifications with sorting

### `POST /api/admin/ai-classifications`
Save new classification from AI script

### `PATCH /api/admin/ai-classifications`
Update classification status (approve/reject)

### `POST /api/admin/ai-classifications/apply`
Apply classification to Shopify via Admin API

## Classification Logic

### Dual AI Validation
1. **OpenAI GPT-4o** makes initial classification
2. **Claude Sonnet 4.5** validates the suggestion
3. Results:
   - **Both Agree**: High confidence, ready to approve
   - **Disagree**: Needs manual review
   - **Claude Override**: Claude has higher confidence in different type

### Confidence Scoring
- **90-100%**: Very clear match (e.g., "helmet" in title → "Helmets")
- **70-89%**: Good match based on multiple signals
- **Below 70%**: Uncertain, needs validation

### Product Type Mapping
Uses `collection_mapping` table to map product types to URL paths:
```
Product Type: "Riding Boots"
→ Maps to: "clothing/footwear/boots"
→ URL: /clothing/footwear/boots/{handle}
```

If no mapping exists, falls back to `/products/{handle}`

## Benefits Over Manual CSV Import

### Old Workflow:
1. Run script → CSV file
2. Manually review CSV
3. Import to Shopify via bulk editor
4. No tracking of what was applied

### New Workflow:
1. Run script → Database + CSV
2. Review in admin UI with filters
3. One-click API updates to Shopify
4. Full audit trail of status changes
5. Batch operations for efficiency

## Tips

- **Start small**: Use `--limit=10` to test
- **Review disagreements**: Focus on "Needs Review" items first
- **Batch approve**: Approve all "Both AIs Agree" items, then batch apply
- **Resume capability**: Script tracks progress, can resume if interrupted
- **Vendor filtering**: Only processes allowed vendors to avoid irrelevant products
