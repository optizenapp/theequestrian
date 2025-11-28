# Quick Start: Collection → Product Type Mapping

## 🚀 5-Minute Quick Start

### Step 1: Export Your Data

```bash
npm run export:product-types
npm run export:collections  
npm run export:sitemap
```

**Output:** Files in `exports/` folder

---

### Step 2: Create Mapping CSV

1. Open `exports/product-types.csv` in Excel/Google Sheets
2. Open `exports/MAPPING-TEMPLATE.md` for format reference
3. Create `exports/mapping.csv` with this structure:

```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
footwear,Horse Riding Boots & Footwear,Boots,boots,include,,
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
```

**Key Points:**
- Use exact product type names from export
- Normalize subcategory handles (lowercase, hyphens)
- Use `include` for normal mappings
- Use `merge` to combine product types
- Use `exclude` to skip subcategories

---

### Step 3: Preview Changes

```bash
npm run import:mapping
```

**Review:**
- Check `exports/updates-dry-run-[timestamp].json`
- Verify changes look correct
- Fix mapping CSV if needed

---

### Step 4: Apply Changes

```bash
npm run import:mapping -- --apply
```

**Result:**
- `primary_collection` metafield updated on all products
- Breadcrumbs automatically generated
- Schema automatically updated
- Subcategory pages work automatically

---

## ✅ What Happens Automatically

After applying the mapping:

1. **`primary_collection` metafield** → Updated on all products
2. **Breadcrumbs** → Generated from metafield (e.g., `Home > Footwear > Riding Boots`)
3. **Schema** → `BreadcrumbList` and `Product` JSON-LD generated
4. **Subcategory Pages** → Work automatically (`/footwear/riding-boots`)
5. **URLs** → All correct, no manual changes needed

---

## 📋 Example Mapping

### Simple Include
```csv
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
```
**Result:** `/footwear/riding-boots` subcategory created

### Merge Multiple Types
```csv
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge
footwear,Horse Riding Boots & Footwear,Spurs,spurs-straps,merge,spurs-straps,Merge
```
**Result:** All three product types appear in `/footwear/spurs-straps`

### Exclude Product Type
```csv
footwear,Horse Riding Boots & Footwear,Test Product Type,,exclude,,"Don't create subcategory"
```
**Result:** Products only appear in main `/footwear` collection

---

## 🔍 Verification

After applying:

1. **Check Product Page:**
   ```
   http://localhost:3001/products/[handle]
   ```
   - Breadcrumbs should show: `Home > Collection > Subcategory > Product`
   - View source → Check for `<script type="application/ld+json">` tags

2. **Check Subcategory Page:**
   ```
   http://localhost:3001/footwear/riding-boots
   ```
   - Products should appear
   - Breadcrumbs should show: `Home > Footwear > Riding Boots`

3. **Test Schema:**
   - Use Google Rich Results Test: https://search.google.com/test/rich-results
   - Enter product URL
   - Verify no errors

---

## 🚨 Common Issues

### Product Type Not Found
**Solution:** Add to mapping CSV with `action=include`

### Duplicate Subcategory Handles
**Solution:** This is correct if merging - use `action=merge`

### Products Missing from Subcategory
**Solution:** Check product is in collection and mapping is correct

---

## 📚 Full Documentation

See `MAPPING-IMPLEMENTATION-GUIDE.md` for complete details.

---

## ✅ Checklist

- [ ] Exported product types
- [ ] Exported collections
- [ ] Exported sitemap
- [ ] Created mapping CSV
- [ ] Previewed changes (dry-run)
- [ ] Applied changes
- [ ] Verified breadcrumbs
- [ ] Verified schema
- [ ] Tested subcategory pages

---

**That's it!** Your breadcrumbs and schema are automatically handled. 🎉






## 🚀 5-Minute Quick Start

### Step 1: Export Your Data

```bash
npm run export:product-types
npm run export:collections  
npm run export:sitemap
```

**Output:** Files in `exports/` folder

---

### Step 2: Create Mapping CSV

1. Open `exports/product-types.csv` in Excel/Google Sheets
2. Open `exports/MAPPING-TEMPLATE.md` for format reference
3. Create `exports/mapping.csv` with this structure:

```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
footwear,Horse Riding Boots & Footwear,Boots,boots,include,,
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
```

**Key Points:**
- Use exact product type names from export
- Normalize subcategory handles (lowercase, hyphens)
- Use `include` for normal mappings
- Use `merge` to combine product types
- Use `exclude` to skip subcategories

---

### Step 3: Preview Changes

```bash
npm run import:mapping
```

**Review:**
- Check `exports/updates-dry-run-[timestamp].json`
- Verify changes look correct
- Fix mapping CSV if needed

---

### Step 4: Apply Changes

```bash
npm run import:mapping -- --apply
```

**Result:**
- `primary_collection` metafield updated on all products
- Breadcrumbs automatically generated
- Schema automatically updated
- Subcategory pages work automatically

---

## ✅ What Happens Automatically

After applying the mapping:

1. **`primary_collection` metafield** → Updated on all products
2. **Breadcrumbs** → Generated from metafield (e.g., `Home > Footwear > Riding Boots`)
3. **Schema** → `BreadcrumbList` and `Product` JSON-LD generated
4. **Subcategory Pages** → Work automatically (`/footwear/riding-boots`)
5. **URLs** → All correct, no manual changes needed

---

## 📋 Example Mapping

### Simple Include
```csv
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
```
**Result:** `/footwear/riding-boots` subcategory created

### Merge Multiple Types
```csv
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge
footwear,Horse Riding Boots & Footwear,Spurs,spurs-straps,merge,spurs-straps,Merge
```
**Result:** All three product types appear in `/footwear/spurs-straps`

### Exclude Product Type
```csv
footwear,Horse Riding Boots & Footwear,Test Product Type,,exclude,,"Don't create subcategory"
```
**Result:** Products only appear in main `/footwear` collection

---

## 🔍 Verification

After applying:

1. **Check Product Page:**
   ```
   http://localhost:3001/products/[handle]
   ```
   - Breadcrumbs should show: `Home > Collection > Subcategory > Product`
   - View source → Check for `<script type="application/ld+json">` tags

2. **Check Subcategory Page:**
   ```
   http://localhost:3001/footwear/riding-boots
   ```
   - Products should appear
   - Breadcrumbs should show: `Home > Footwear > Riding Boots`

3. **Test Schema:**
   - Use Google Rich Results Test: https://search.google.com/test/rich-results
   - Enter product URL
   - Verify no errors

---

## 🚨 Common Issues

### Product Type Not Found
**Solution:** Add to mapping CSV with `action=include`

### Duplicate Subcategory Handles
**Solution:** This is correct if merging - use `action=merge`

### Products Missing from Subcategory
**Solution:** Check product is in collection and mapping is correct

---

## 📚 Full Documentation

See `MAPPING-IMPLEMENTATION-GUIDE.md` for complete details.

---

## ✅ Checklist

- [ ] Exported product types
- [ ] Exported collections
- [ ] Exported sitemap
- [ ] Created mapping CSV
- [ ] Previewed changes (dry-run)
- [ ] Applied changes
- [ ] Verified breadcrumbs
- [ ] Verified schema
- [ ] Tested subcategory pages

---

**That's it!** Your breadcrumbs and schema are automatically handled. 🎉




