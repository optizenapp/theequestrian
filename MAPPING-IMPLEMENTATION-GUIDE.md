# Collection → Product Type Mapping Implementation Guide

## 🎯 Overview

This guide walks you through mapping collections to product type subcollections, handling exclusions and merges, and ensuring breadcrumbs and schema are correct.

---

## 📋 Step-by-Step Process

### Step 1: Export Product Types

**Command:**
```bash
npm run export:product-types
```

**Output:**
- `exports/product-types.json` - Full data with collections
- `exports/product-types.csv` - CSV format for spreadsheet editing

**What you get:**
- All product types in your store
- Product count per type
- Sample products
- Collections each product type appears in

---

### Step 2: Export Collections

**Command:**
```bash
npm run export:collections
```

**Output:**
- `exports/collections.json` - Full collection data
- `exports/collections.csv` - CSV format

**What you get:**
- All collections
- Product count per collection
- Product types in each collection
- Parent collection relationships

---

### Step 3: Export Current Sitemap

**Command:**
```bash
npm run export:sitemap
```

**Output:**
- `exports/sitemap-current.json` - Full sitemap data
- `exports/sitemap-current.csv` - CSV format

**What you get:**
- Current product URLs
- Current `primary_collection` metafield values
- Product types
- Collections each product is in

---

### Step 4: Create Mapping Spreadsheet

**Template:** `exports/MAPPING-TEMPLATE.md`

**CSV Format:**
```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
footwear,Horse Riding Boots & Footwear,Boots,boots,include,,
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
footwear,Horse Riding Boots & Footwear,Test Type,,exclude,,"Don't create subcategory"
```

**Columns Explained:**

1. **`collection_handle`** - Collection handle (e.g., "footwear")
2. **`collection_title`** - Collection title (for reference)
3. **`product_type`** - Exact product type name from Shopify
4. **`subcategory_handle`** - Normalized subcategory URL (e.g., "riding-boots")
5. **`action`** - One of:
   - `include` - Create subcategory (default)
   - `exclude` - Don't create subcategory (products only in main collection)
   - `merge` - Merge into another subcategory
6. **`merge_to`** - If `action=merge`, the target subcategory handle
7. **`notes`** - Any notes about this mapping

**Actions:**

- **`include`**: Creates subcategory URL `/{collection}/{subcategory_handle}`
- **`exclude`**: Products won't appear in subcategory (only main collection)
- **`merge`**: Combines multiple product types into one subcategory

**Example Merges:**
```csv
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
footwear,Horse Riding Boots & Footwear,Spurs,spurs-straps,merge,spurs-straps,Merge into spurs-straps
```

This creates one subcategory `/footwear/spurs-straps` with all three product types.

---

### Step 5: Save Mapping CSV

**Save as:** `exports/mapping.csv`

**Important:**
- Use exact product type names from export
- Normalize subcategory handles (lowercase, hyphens)
- One row per product type per collection
- Check for duplicate subcategory handles

---

### Step 6: Preview Changes (Dry Run)

**Command:**
```bash
npm run import:mapping
```

**Or explicitly:**
```bash
npm run import:mapping -- --dry-run
```

**What it does:**
- Reads `exports/mapping.csv`
- Calculates new `primary_collection` values for all products
- Shows what will change
- **Does NOT apply changes**

**Output:**
- Console summary
- `exports/updates-dry-run-[timestamp].json` - Full list of changes

**Review:**
- Check products that will be updated
- Verify exclusions are correct
- Verify merges are correct
- Check for any unexpected changes

---

### Step 7: Apply Changes

**Command:**
```bash
npm run import:mapping -- --apply
```

**What it does:**
- Reads `exports/mapping.csv`
- Updates `primary_collection` metafield on all products
- Creates metafield if it doesn't exist
- **Actually applies changes**

**Output:**
- Console summary
- `exports/updates-applied-[timestamp].json` - Record of all changes

**Note:** This requires Shopify Admin API access. The script will guide you if credentials are needed.

---

## ✅ Verification

### Check Breadcrumbs

After applying changes, verify breadcrumbs work:

1. Visit a product page: `http://localhost:3001/products/[handle]`
2. Check breadcrumbs render correctly
3. Verify breadcrumb links work

**Example:**
```
Home > Footwear > Riding Boots > Product Name
```

### Check Schema

Verify structured data is correct:

1. View page source on product page
2. Look for `<script type="application/ld+json">` tags
3. Verify `BreadcrumbList` schema includes correct path
4. Verify `Product` schema is present

**Test with Google Rich Results Test:**
- https://search.google.com/test/rich-results
- Enter a product URL
- Verify no errors

### Check Subcategory Pages

Verify subcategory pages work:

1. Visit: `http://localhost:3001/footwear/riding-boots`
2. Verify products appear
3. Verify breadcrumbs show: `Home > Footwear > Riding Boots`
4. Verify schema includes `CollectionPage` with `isPartOf`

---

## 🔧 How Breadcrumbs & Schema Work

### Breadcrumbs (Automatic)

**File:** `app/products/[handle]/page.tsx`

**Logic:**
1. Reads `primary_collection` metafield (e.g., `footwear/riding-boots`)
2. Splits by `/` to get collection and subcategory
3. Generates breadcrumbs: `Home > Collection > Subcategory > Product`
4. Creates `BreadcrumbList` JSON-LD schema

**Example:**
```typescript
// primary_collection = "footwear/riding-boots"
// Generates:
// Home > Footwear > Riding Boots > Product Name
```

### Schema (Automatic)

**Product Page Schema:**
- `BreadcrumbList` - Generated from `primary_collection`
- `Product` - Product details, price, availability

**Subcategory Page Schema:**
- `BreadcrumbList` - Collection > Subcategory
- `CollectionPage` - Collection details with `isPartOf` parent

**All schema is automatically generated** - no manual updates needed!

---

## 🚨 Troubleshooting

### Issue: Mapping not found

**Problem:** Product type not in mapping CSV

**Solution:**
- Product falls back to first collection (no subcategory)
- Add product type to mapping CSV
- Re-run import

### Issue: Duplicate subcategory handles

**Problem:** Multiple product types map to same subcategory handle

**Solution:**
- This is correct if you want to merge them
- Use `action=merge` to explicitly merge
- Or use same `subcategory_handle` for multiple product types

### Issue: Products missing from subcategory

**Problem:** Product type excluded or not mapped

**Solution:**
- Check mapping CSV for product type
- Verify `action` is `include` (not `exclude`)
- Verify product is in the collection

### Issue: Breadcrumbs incorrect

**Problem:** `primary_collection` value wrong

**Solution:**
- Check `exports/updates-applied-[timestamp].json`
- Verify product's metafield in Shopify Admin
- Re-run import if needed

---

## 📊 Example Workflow

### 1. Export Data
```bash
npm run export:product-types
npm run export:collections
npm run export:sitemap
```

### 2. Open Exports in Spreadsheet
- Open `exports/product-types.csv`
- Open `exports/collections.csv`
- Open `exports/sitemap-current.csv`

### 3. Create Mapping
- Create new spreadsheet
- Copy template from `exports/MAPPING-TEMPLATE.md`
- Fill in mappings:
  - Map collections to product types
  - Add exclusions
  - Add merges
- Save as `exports/mapping.csv`

### 4. Preview Changes
```bash
npm run import:mapping
```

### 5. Review Output
- Check `exports/updates-dry-run-[timestamp].json`
- Verify changes look correct
- Fix mapping CSV if needed

### 6. Apply Changes
```bash
npm run import:mapping -- --apply
```

### 7. Verify
- Check product pages (breadcrumbs)
- Check subcategory pages
- Test schema with Google Rich Results Test

---

## ✅ Checklist

- [ ] Exported product types
- [ ] Exported collections
- [ ] Exported current sitemap
- [ ] Created mapping CSV
- [ ] Added all product types to mapping
- [ ] Added exclusions for unwanted product types
- [ ] Added merges for combined product types
- [ ] Ran dry-run and reviewed changes
- [ ] Applied changes
- [ ] Verified breadcrumbs work
- [ ] Verified schema is correct
- [ ] Tested subcategory pages
- [ ] Tested with Google Rich Results Test

---

## 🎯 Summary

**What You Do:**
1. Export data (product types, collections, sitemap)
2. Create mapping spreadsheet
3. Preview changes (dry-run)
4. Apply changes

**What Happens Automatically:**
- ✅ `primary_collection` metafield updated
- ✅ Breadcrumbs generated from metafield
- ✅ Schema (BreadcrumbList, Product, CollectionPage) generated
- ✅ Subcategory pages work automatically
- ✅ URLs work: `/{collection}/{subcategory}`

**No Manual Code Changes Needed!** 🎉

---

## 📚 Files Created

- `scripts/export-product-types.ts` - Export product types
- `scripts/export-collections.ts` - Export collections
- `scripts/export-sitemap.ts` - Export current sitemap
- `scripts/import-mapping.ts` - Apply mapping
- `exports/MAPPING-TEMPLATE.md` - Mapping template guide
- `MAPPING-IMPLEMENTATION-GUIDE.md` - This guide

---

## 🚀 Next Steps

1. Run exports to get your data
2. Create mapping spreadsheet
3. Preview changes
4. Apply when ready
5. Verify everything works!

**Questions?** Check the troubleshooting section or review the script files.






## 🎯 Overview

This guide walks you through mapping collections to product type subcollections, handling exclusions and merges, and ensuring breadcrumbs and schema are correct.

---

## 📋 Step-by-Step Process

### Step 1: Export Product Types

**Command:**
```bash
npm run export:product-types
```

**Output:**
- `exports/product-types.json` - Full data with collections
- `exports/product-types.csv` - CSV format for spreadsheet editing

**What you get:**
- All product types in your store
- Product count per type
- Sample products
- Collections each product type appears in

---

### Step 2: Export Collections

**Command:**
```bash
npm run export:collections
```

**Output:**
- `exports/collections.json` - Full collection data
- `exports/collections.csv` - CSV format

**What you get:**
- All collections
- Product count per collection
- Product types in each collection
- Parent collection relationships

---

### Step 3: Export Current Sitemap

**Command:**
```bash
npm run export:sitemap
```

**Output:**
- `exports/sitemap-current.json` - Full sitemap data
- `exports/sitemap-current.csv` - CSV format

**What you get:**
- Current product URLs
- Current `primary_collection` metafield values
- Product types
- Collections each product is in

---

### Step 4: Create Mapping Spreadsheet

**Template:** `exports/MAPPING-TEMPLATE.md`

**CSV Format:**
```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
footwear,Horse Riding Boots & Footwear,Boots,boots,include,,
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
footwear,Horse Riding Boots & Footwear,Test Type,,exclude,,"Don't create subcategory"
```

**Columns Explained:**

1. **`collection_handle`** - Collection handle (e.g., "footwear")
2. **`collection_title`** - Collection title (for reference)
3. **`product_type`** - Exact product type name from Shopify
4. **`subcategory_handle`** - Normalized subcategory URL (e.g., "riding-boots")
5. **`action`** - One of:
   - `include` - Create subcategory (default)
   - `exclude` - Don't create subcategory (products only in main collection)
   - `merge` - Merge into another subcategory
6. **`merge_to`** - If `action=merge`, the target subcategory handle
7. **`notes`** - Any notes about this mapping

**Actions:**

- **`include`**: Creates subcategory URL `/{collection}/{subcategory_handle}`
- **`exclude`**: Products won't appear in subcategory (only main collection)
- **`merge`**: Combines multiple product types into one subcategory

**Example Merges:**
```csv
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
footwear,Horse Riding Boots & Footwear,Spurs,spurs-straps,merge,spurs-straps,Merge into spurs-straps
```

This creates one subcategory `/footwear/spurs-straps` with all three product types.

---

### Step 5: Save Mapping CSV

**Save as:** `exports/mapping.csv`

**Important:**
- Use exact product type names from export
- Normalize subcategory handles (lowercase, hyphens)
- One row per product type per collection
- Check for duplicate subcategory handles

---

### Step 6: Preview Changes (Dry Run)

**Command:**
```bash
npm run import:mapping
```

**Or explicitly:**
```bash
npm run import:mapping -- --dry-run
```

**What it does:**
- Reads `exports/mapping.csv`
- Calculates new `primary_collection` values for all products
- Shows what will change
- **Does NOT apply changes**

**Output:**
- Console summary
- `exports/updates-dry-run-[timestamp].json` - Full list of changes

**Review:**
- Check products that will be updated
- Verify exclusions are correct
- Verify merges are correct
- Check for any unexpected changes

---

### Step 7: Apply Changes

**Command:**
```bash
npm run import:mapping -- --apply
```

**What it does:**
- Reads `exports/mapping.csv`
- Updates `primary_collection` metafield on all products
- Creates metafield if it doesn't exist
- **Actually applies changes**

**Output:**
- Console summary
- `exports/updates-applied-[timestamp].json` - Record of all changes

**Note:** This requires Shopify Admin API access. The script will guide you if credentials are needed.

---

## ✅ Verification

### Check Breadcrumbs

After applying changes, verify breadcrumbs work:

1. Visit a product page: `http://localhost:3001/products/[handle]`
2. Check breadcrumbs render correctly
3. Verify breadcrumb links work

**Example:**
```
Home > Footwear > Riding Boots > Product Name
```

### Check Schema

Verify structured data is correct:

1. View page source on product page
2. Look for `<script type="application/ld+json">` tags
3. Verify `BreadcrumbList` schema includes correct path
4. Verify `Product` schema is present

**Test with Google Rich Results Test:**
- https://search.google.com/test/rich-results
- Enter a product URL
- Verify no errors

### Check Subcategory Pages

Verify subcategory pages work:

1. Visit: `http://localhost:3001/footwear/riding-boots`
2. Verify products appear
3. Verify breadcrumbs show: `Home > Footwear > Riding Boots`
4. Verify schema includes `CollectionPage` with `isPartOf`

---

## 🔧 How Breadcrumbs & Schema Work

### Breadcrumbs (Automatic)

**File:** `app/products/[handle]/page.tsx`

**Logic:**
1. Reads `primary_collection` metafield (e.g., `footwear/riding-boots`)
2. Splits by `/` to get collection and subcategory
3. Generates breadcrumbs: `Home > Collection > Subcategory > Product`
4. Creates `BreadcrumbList` JSON-LD schema

**Example:**
```typescript
// primary_collection = "footwear/riding-boots"
// Generates:
// Home > Footwear > Riding Boots > Product Name
```

### Schema (Automatic)

**Product Page Schema:**
- `BreadcrumbList` - Generated from `primary_collection`
- `Product` - Product details, price, availability

**Subcategory Page Schema:**
- `BreadcrumbList` - Collection > Subcategory
- `CollectionPage` - Collection details with `isPartOf` parent

**All schema is automatically generated** - no manual updates needed!

---

## 🚨 Troubleshooting

### Issue: Mapping not found

**Problem:** Product type not in mapping CSV

**Solution:**
- Product falls back to first collection (no subcategory)
- Add product type to mapping CSV
- Re-run import

### Issue: Duplicate subcategory handles

**Problem:** Multiple product types map to same subcategory handle

**Solution:**
- This is correct if you want to merge them
- Use `action=merge` to explicitly merge
- Or use same `subcategory_handle` for multiple product types

### Issue: Products missing from subcategory

**Problem:** Product type excluded or not mapped

**Solution:**
- Check mapping CSV for product type
- Verify `action` is `include` (not `exclude`)
- Verify product is in the collection

### Issue: Breadcrumbs incorrect

**Problem:** `primary_collection` value wrong

**Solution:**
- Check `exports/updates-applied-[timestamp].json`
- Verify product's metafield in Shopify Admin
- Re-run import if needed

---

## 📊 Example Workflow

### 1. Export Data
```bash
npm run export:product-types
npm run export:collections
npm run export:sitemap
```

### 2. Open Exports in Spreadsheet
- Open `exports/product-types.csv`
- Open `exports/collections.csv`
- Open `exports/sitemap-current.csv`

### 3. Create Mapping
- Create new spreadsheet
- Copy template from `exports/MAPPING-TEMPLATE.md`
- Fill in mappings:
  - Map collections to product types
  - Add exclusions
  - Add merges
- Save as `exports/mapping.csv`

### 4. Preview Changes
```bash
npm run import:mapping
```

### 5. Review Output
- Check `exports/updates-dry-run-[timestamp].json`
- Verify changes look correct
- Fix mapping CSV if needed

### 6. Apply Changes
```bash
npm run import:mapping -- --apply
```

### 7. Verify
- Check product pages (breadcrumbs)
- Check subcategory pages
- Test schema with Google Rich Results Test

---

## ✅ Checklist

- [ ] Exported product types
- [ ] Exported collections
- [ ] Exported current sitemap
- [ ] Created mapping CSV
- [ ] Added all product types to mapping
- [ ] Added exclusions for unwanted product types
- [ ] Added merges for combined product types
- [ ] Ran dry-run and reviewed changes
- [ ] Applied changes
- [ ] Verified breadcrumbs work
- [ ] Verified schema is correct
- [ ] Tested subcategory pages
- [ ] Tested with Google Rich Results Test

---

## 🎯 Summary

**What You Do:**
1. Export data (product types, collections, sitemap)
2. Create mapping spreadsheet
3. Preview changes (dry-run)
4. Apply changes

**What Happens Automatically:**
- ✅ `primary_collection` metafield updated
- ✅ Breadcrumbs generated from metafield
- ✅ Schema (BreadcrumbList, Product, CollectionPage) generated
- ✅ Subcategory pages work automatically
- ✅ URLs work: `/{collection}/{subcategory}`

**No Manual Code Changes Needed!** 🎉

---

## 📚 Files Created

- `scripts/export-product-types.ts` - Export product types
- `scripts/export-collections.ts` - Export collections
- `scripts/export-sitemap.ts` - Export current sitemap
- `scripts/import-mapping.ts` - Apply mapping
- `exports/MAPPING-TEMPLATE.md` - Mapping template guide
- `MAPPING-IMPLEMENTATION-GUIDE.md` - This guide

---

## 🚀 Next Steps

1. Run exports to get your data
2. Create mapping spreadsheet
3. Preview changes
4. Apply when ready
5. Verify everything works!

**Questions?** Check the troubleshooting section or review the script files.




