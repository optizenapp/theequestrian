# Subcategory URLs Guide

## 🎯 How to Find Valid Subcategory URLs

### Method 1: Use the API Endpoint

**List all valid subcategories for a collection:**

```bash
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=footwear"
```

This returns:
- All productTypes in the collection
- Normalized URLs for each
- Product counts
- Example products

### Method 2: Check Product Types

**View all product types in your store:**

```bash
curl "https://www.theequestrian.com.au/api/admin/analyze-product-types"
```

Then normalize them using the `normalizeProductType()` function:
- "Riding Boots" → "riding-boots"
- "Spurs & Straps" → "spurs-straps"
- "FOOTWEAR: Western & Roper Boots" → "footwear-western-roper-boots"

---

## 📋 Valid Subcategory URLs for Footwear

Based on your store data, here are the valid subcategories:

| Product Type | Normalized URL | Products | Example |
|-------------|----------------|----------|---------|
| Boots | `/footwear/boots` | 53 | ego7-luca-long-boot |
| Spurs & Straps | `/footwear/spurs-straps` | 60* | sprenger-ultra-fit-grip-spur |
| Spurs | `/footwear/spurs` | 18 | turnout-spurs |
| FOOTWEAR: Western & Roper Boots | `/footwear/footwear-western-roper-boots` | 13 | baxter-western-boots-childrens |
| FOOTWEAR: Equestrian Footwear | `/footwear/footwear-equestrian-footwear` | 10 | eurohunter-boots-joddy-brown |
| Riding Boots | `/footwear/riding-boots` | 9 | cavallo-linus-dressage-boots |
| FOOTWEAR: Casual Footwear | `/footwear/footwear-casual-footwear` | 8 | baxter-boots-drover-walnut |
| Tall Boots | `/footwear/tall-boots` | 4 | cavallo-slim-chap-brogue |
| Boots - Boot Accessories | `/footwear/boots-boot-accessories` | 2 | ariat-team-tall-boot-bag |

*Note: "Spurs & Straps" combines multiple productTypes that normalize to the same URL

---

## 🔍 How URLs Are Generated

### Normalization Rules

1. **Remove prefixes:** "HORSE:", "STABLE:", "RIDER:", "FOOTWEAR:", "CLOTHING:"
2. **Lowercase:** "Riding Boots" → "riding boots"
3. **Replace spaces/special chars:** "riding boots" → "riding-boots"
4. **Remove leading/trailing hyphens**

### Examples

```
"Riding Boots" → "riding-boots"
"Spurs & Straps" → "spurs-straps"
"FOOTWEAR: Western & Roper Boots" → "footwear-western-roper-boots"
"HORSE: Bits" → "bits"
"STABLE: Grooming" → "grooming"
```

---

## ✅ Testing Subcategory URLs

### Quick Test

```bash
# List all valid subcategories
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=footwear"

# Test a specific URL
curl -I "https://www.theequestrian.com.au/footwear/riding-boots"
# Should return: HTTP/1.1 200 OK
```

### In Browser

Visit: `https://www.theequestrian.com.au/footwear/[subcategory]`

**Working examples:**
- ✅ `https://www.theequestrian.com.au/footwear/riding-boots`
- ✅ `https://www.theequestrian.com.au/footwear/boots`
- ✅ `https://www.theequestrian.com.au/footwear/spurs`
- ✅ `https://www.theequestrian.com.au/footwear/tall-boots`

---

## 🚨 Common Issues

### Issue: 404 on Subcategory URL

**Causes:**
1. ProductType doesn't exist in that collection
2. ProductType normalizes to a different URL than expected
3. No products have that productType

**Solution:**
1. Check valid subcategories: `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=[category]"`
2. Verify productType exists: `curl "https://www.theequestrian.com.au/api/admin/analyze-product-types"`
3. Check if products are in the collection

### Issue: Multiple ProductTypes Normalize to Same URL

**Example:** "Spurs & Straps" and "RIDER: Spurs & Straps" → both `/footwear/spurs-straps`

**Solution:** The page now combines all matching productTypes automatically. You'll see products from all variations.

---

## 📊 For Other Collections

**Get subcategories for any collection:**

```bash
# Replace [collection-handle] with your collection
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=[collection-handle]"
```

**Examples:**
- `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=womens-clothing"`
- `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=horse-boots"`
- `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=saddles-tack"`

---

## 🎯 Quick Reference

### Footwear Subcategories

- `/footwear/boots` (53 products)
- `/footwear/spurs-straps` (60 products - combined)
- `/footwear/spurs` (18 products)
- `/footwear/footwear-western-roper-boots` (13 products)
- `/footwear/footwear-equestrian-footwear` (10 products)
- `/footwear/riding-boots` (9 products) ✅ **Working!**
- `/footwear/footwear-casual-footwear` (8 products)
- `/footwear/tall-boots` (4 products)
- `/footwear/boots-boot-accessories` (2 products)

---

## 💡 Pro Tips

1. **Always check valid subcategories first** using the API endpoint
2. **ProductTypes are case-insensitive** - "Riding Boots" = "riding boots" = "RIDING BOOTS"
3. **Special characters are normalized** - "&" becomes "-", spaces become "-"
4. **Prefixes are removed** - "HORSE: Bits" becomes "bits"
5. **Multiple productTypes can share the same URL** - they're automatically combined

---

## 🔧 Debugging

**If a URL doesn't work:**

1. Check if collection exists:
   ```bash
   curl "https://www.theequestrian.com.au/api/admin/debug-subcategory?category=footwear&subcategory=riding-boots"
   ```

2. Verify productTypes in collection:
   ```bash
   curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=footwear"
   ```

3. Check product type analysis:
   ```bash
   curl "https://www.theequestrian.com.au/api/admin/analyze-product-types"
   ```

---

## ✅ Summary

**Valid URLs are generated from:**
- ProductTypes that exist in the collection
- Normalized using `normalizeProductType()` function
- Format: `/[collection-handle]/[normalized-product-type]`

**To find all valid URLs:**
```bash
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=[collection-handle]"
```






## 🎯 How to Find Valid Subcategory URLs

### Method 1: Use the API Endpoint

**List all valid subcategories for a collection:**

```bash
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=footwear"
```

This returns:
- All productTypes in the collection
- Normalized URLs for each
- Product counts
- Example products

### Method 2: Check Product Types

**View all product types in your store:**

```bash
curl "https://www.theequestrian.com.au/api/admin/analyze-product-types"
```

Then normalize them using the `normalizeProductType()` function:
- "Riding Boots" → "riding-boots"
- "Spurs & Straps" → "spurs-straps"
- "FOOTWEAR: Western & Roper Boots" → "footwear-western-roper-boots"

---

## 📋 Valid Subcategory URLs for Footwear

Based on your store data, here are the valid subcategories:

| Product Type | Normalized URL | Products | Example |
|-------------|----------------|----------|---------|
| Boots | `/footwear/boots` | 53 | ego7-luca-long-boot |
| Spurs & Straps | `/footwear/spurs-straps` | 60* | sprenger-ultra-fit-grip-spur |
| Spurs | `/footwear/spurs` | 18 | turnout-spurs |
| FOOTWEAR: Western & Roper Boots | `/footwear/footwear-western-roper-boots` | 13 | baxter-western-boots-childrens |
| FOOTWEAR: Equestrian Footwear | `/footwear/footwear-equestrian-footwear` | 10 | eurohunter-boots-joddy-brown |
| Riding Boots | `/footwear/riding-boots` | 9 | cavallo-linus-dressage-boots |
| FOOTWEAR: Casual Footwear | `/footwear/footwear-casual-footwear` | 8 | baxter-boots-drover-walnut |
| Tall Boots | `/footwear/tall-boots` | 4 | cavallo-slim-chap-brogue |
| Boots - Boot Accessories | `/footwear/boots-boot-accessories` | 2 | ariat-team-tall-boot-bag |

*Note: "Spurs & Straps" combines multiple productTypes that normalize to the same URL

---

## 🔍 How URLs Are Generated

### Normalization Rules

1. **Remove prefixes:** "HORSE:", "STABLE:", "RIDER:", "FOOTWEAR:", "CLOTHING:"
2. **Lowercase:** "Riding Boots" → "riding boots"
3. **Replace spaces/special chars:** "riding boots" → "riding-boots"
4. **Remove leading/trailing hyphens**

### Examples

```
"Riding Boots" → "riding-boots"
"Spurs & Straps" → "spurs-straps"
"FOOTWEAR: Western & Roper Boots" → "footwear-western-roper-boots"
"HORSE: Bits" → "bits"
"STABLE: Grooming" → "grooming"
```

---

## ✅ Testing Subcategory URLs

### Quick Test

```bash
# List all valid subcategories
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=footwear"

# Test a specific URL
curl -I "https://www.theequestrian.com.au/footwear/riding-boots"
# Should return: HTTP/1.1 200 OK
```

### In Browser

Visit: `https://www.theequestrian.com.au/footwear/[subcategory]`

**Working examples:**
- ✅ `https://www.theequestrian.com.au/footwear/riding-boots`
- ✅ `https://www.theequestrian.com.au/footwear/boots`
- ✅ `https://www.theequestrian.com.au/footwear/spurs`
- ✅ `https://www.theequestrian.com.au/footwear/tall-boots`

---

## 🚨 Common Issues

### Issue: 404 on Subcategory URL

**Causes:**
1. ProductType doesn't exist in that collection
2. ProductType normalizes to a different URL than expected
3. No products have that productType

**Solution:**
1. Check valid subcategories: `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=[category]"`
2. Verify productType exists: `curl "https://www.theequestrian.com.au/api/admin/analyze-product-types"`
3. Check if products are in the collection

### Issue: Multiple ProductTypes Normalize to Same URL

**Example:** "Spurs & Straps" and "RIDER: Spurs & Straps" → both `/footwear/spurs-straps`

**Solution:** The page now combines all matching productTypes automatically. You'll see products from all variations.

---

## 📊 For Other Collections

**Get subcategories for any collection:**

```bash
# Replace [collection-handle] with your collection
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=[collection-handle]"
```

**Examples:**
- `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=womens-clothing"`
- `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=horse-boots"`
- `curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=saddles-tack"`

---

## 🎯 Quick Reference

### Footwear Subcategories

- `/footwear/boots` (53 products)
- `/footwear/spurs-straps` (60 products - combined)
- `/footwear/spurs` (18 products)
- `/footwear/footwear-western-roper-boots` (13 products)
- `/footwear/footwear-equestrian-footwear` (10 products)
- `/footwear/riding-boots` (9 products) ✅ **Working!**
- `/footwear/footwear-casual-footwear` (8 products)
- `/footwear/tall-boots` (4 products)
- `/footwear/boots-boot-accessories` (2 products)

---

## 💡 Pro Tips

1. **Always check valid subcategories first** using the API endpoint
2. **ProductTypes are case-insensitive** - "Riding Boots" = "riding boots" = "RIDING BOOTS"
3. **Special characters are normalized** - "&" becomes "-", spaces become "-"
4. **Prefixes are removed** - "HORSE: Bits" becomes "bits"
5. **Multiple productTypes can share the same URL** - they're automatically combined

---

## 🔧 Debugging

**If a URL doesn't work:**

1. Check if collection exists:
   ```bash
   curl "https://www.theequestrian.com.au/api/admin/debug-subcategory?category=footwear&subcategory=riding-boots"
   ```

2. Verify productTypes in collection:
   ```bash
   curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=footwear"
   ```

3. Check product type analysis:
   ```bash
   curl "https://www.theequestrian.com.au/api/admin/analyze-product-types"
   ```

---

## ✅ Summary

**Valid URLs are generated from:**
- ProductTypes that exist in the collection
- Normalized using `normalizeProductType()` function
- Format: `/[collection-handle]/[normalized-product-type]`

**To find all valid URLs:**
```bash
curl "https://www.theequestrian.com.au/api/admin/list-subcategories?category=[collection-handle]"
```











