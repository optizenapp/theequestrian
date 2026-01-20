# Master Content Generator V2 - Using Actual Shopify Product Types

## 🎯 What's New

The V2 script now uses **actual Shopify product types** from the mapping CSV instead of guessing from URLs!

## ✅ Key Improvements

### 1. **Accurate Product Detection**
- **Before**: Guessed from URL segments (`/clothing/accessories/caps` → "accessories")
- **After**: Uses `getProductTypesForCollection()` to get actual Shopify product types

### 2. **Correct Meta Descriptions**
- **Before**: Caps page showed "breeches, jodhpurs, riding tops and jackets" ❌
- **After**: Caps page shows "caps" ✅

- **Before**: Fly Control showed "saddles, rugs, boots and tack" ❌
- **After**: Fly Control shows "fly controls" ✅

### 3. **Better Wikipedia Integration (Future)**
- Can now search Wikipedia for actual product types
- Example: "Fly Control" instead of just "stable"
- Example: "Jumping Saddles" instead of just "saddles"

### 4. **Contextual Content**
- Features are generated based on actual product type
- No more "technical fabrics" for non-clothing items
- Category-specific bullet points that make sense

## 📊 How It Works

```typescript
// Get actual product types from Shopify mapping
const productTypes = getProductTypesForCollection(category, subcategory, subsubcategory);
// Returns: ["Fly Control"] for /horse/stable/fly-control
// Returns: ["Caps", "Cap"] for /clothing/accessories/caps
```

## 🔧 Usage

```bash
# Dry run on first 5 pages
npm run master-generate-v2 -- --start=0 --max=5 --dry-run

# Dry run on specific problematic pages
npm run master-generate-v2 -- --start=31 --max=1 --dry-run  # Caps page
npm run master-generate-v2 -- --start=114 --max=1 --dry-run  # Fly Control

# Run on ALL 238 pages (LIVE)
npm run master-generate-v2 -- --start=0 --max=238
```

## 📝 Verbose Logging

The script now shows:
- 📦 Actual product types from Shopify
- ✨ Features being generated
- 🔍 Validation issues found
- 📊 Score before/after
- ✅ BEFORE vs AFTER content preview

Example output:
```
================================================================================
📄 Processing: /clothing/accessories/caps
   H1: Caps
   Level: 3
      🔍 Validating content...
      📦 Actual product types from Shopify: [Caps, Cap, cap]
      ✅ Using actual products: [caps]
      ⚠️ Found 1 issues
   📊 Current score: 85/100
   🔧 Fixing content...
      📦 Actual product types from Shopify: [Caps, Cap, cap]
      ✅ Using actual products: [caps]
   📊 New score: 100/100 (✅)

   --- BEFORE vs AFTER ---
   OLD Meta: Shop premium caps including breeches, jodhpurs, riding tops...
   NEW Meta: Shop premium caps including caps. Free shipping Australia-wide...
```

## 🎯 Next Steps

1. **Test on 10-20 random pages** to verify quality
2. **Run on all 238 pages** in live mode
3. **Add Wikipedia enrichment** using actual product types
4. **Enhance schema** with product-type-specific entities

## 📂 Files

- **Script**: `scripts/master-content-generator-v2.ts`
- **Package.json**: Added `master-generate-v2` command
- **Mapping Source**: `exports/mapping-template-draft2.csv`
- **Helper**: `lib/mapping/collection-mapping.ts` (existing)

## 🚀 Ready to Run

The script is ready to process all 238 pages with accurate, product-type-based content generation!
