# Collection Schema Testing Guide

## 🧪 How to Test the New Collection Schema

This guide walks you through validating the "Best in Class" collection schema implementation.

## 🚀 Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Navigate to a Collection Page
Examples:
- http://localhost:3000/rider
- http://localhost:3000/rider/giftware
- http://localhost:3000/horse/boots
- http://localhost:3000/clothing/womens

### 3. View the Schema
**Method A: View Page Source**
1. Right-click → "View Page Source"
2. Search for `application/ld+json`
3. Find the schema block

**Method B: Browser DevTools**
1. Open DevTools (F12)
2. Go to Elements/Inspector tab
3. Search for `<script type="application/ld+json">`
4. Copy the JSON content

**Method C: Schema Extractor Extension**
1. Install "Schema Markup Validator" Chrome extension
2. Click extension icon on collection page
3. View extracted schema

## ✅ Validation Checklist

### Schema Structure
- [ ] Single `<script type="application/ld+json">` tag (not two separate ones)
- [ ] Contains `"@graph"` array
- [ ] Has 2 entities in @graph: BreadcrumbList + CollectionPage

### BreadcrumbList Entity
```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://..."
    },
    // ... more breadcrumbs
  ]
}
```

**Check:**
- [ ] All breadcrumbs have `position` (1, 2, 3...)
- [ ] All have `name` and `item` (URL)
- [ ] URLs are absolute (include domain)

### CollectionPage Entity
```json
{
  "@type": "CollectionPage",
  "@id": "https://...",
  "name": "Collection Name",
  "description": "...",
  "url": "https://...",
  "mainEntity": {
    "@type": "ItemList",
    // ...
  }
}
```

**Check:**
- [ ] Has `@id` matching the collection URL
- [ ] Has `name` (collection title)
- [ ] Has `description` (semantic, entity-rich)
- [ ] Has `url` (collection URL)
- [ ] Has `mainEntity` of type `ItemList`
- [ ] Subcategories have `isPartOf` pointing to parent

### ItemList Entity (inside mainEntity)
```json
{
  "@type": "ItemList",
  "itemListOrder": "https://schema.org/ItemListOrderDescending",
  "numberOfItems": 36,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://...",
      "image": "https://...",
      "name": "Product Name",
      "offers": {
        "@type": "Offer",
        "price": "39.95",
        "priceCurrency": "AUD"
      }
    }
  ]
}
```

**Check:**
- [ ] Has `itemListOrder`
- [ ] `numberOfItems` matches product count
- [ ] Each item is a `ListItem` (not `Offer`)
- [ ] Each item has sequential `position` (1, 2, 3...)
- [ ] Each item has `url` (product URL)
- [ ] Each item has `name` (product title)
- [ ] Each item has `offers` with price
- [ ] Items with images include `image` property
- [ ] All URLs are absolute (include domain)

## 🔍 Online Validators

### 1. Google Rich Results Test
**URL:** https://search.google.com/test/rich-results

**Steps:**
1. Enter your collection page URL
2. Click "Test URL"
3. Wait for results

**Expected Results:**
- ✅ "Valid" status
- ✅ BreadcrumbList detected
- ✅ No errors
- ⚠️ May show "Not eligible for rich results" - this is OK for collection pages

**Why "Not eligible"?**
Collection pages don't have specific rich result types like products (star ratings) or recipes. The schema is still valuable for:
- Crawling efficiency
- Knowledge Graph building
- Internal linking signals
- Carousel eligibility

### 2. Schema.org Validator
**URL:** https://validator.schema.org/

**Steps:**
1. Copy the JSON from page source
2. Paste into validator
3. Click "Validate"

**Expected Results:**
- ✅ No errors
- ✅ No warnings
- ✅ All types recognized
- ✅ All properties valid

### 3. Schema Markup Validator (Extension)
**Chrome Extension:** Schema Markup Validator

**Steps:**
1. Install extension
2. Navigate to collection page
3. Click extension icon
4. Review detected schema

**Expected Results:**
- ✅ Shows @graph structure
- ✅ Lists all entities
- ✅ No validation errors

## 🧪 Test Cases

### Test Case 1: Top-Level Category
**URL:** `/rider`

**Verify:**
- [ ] BreadcrumbList has 2 items (Home, Rider)
- [ ] CollectionPage has NO `isPartOf` (it's top-level)
- [ ] ItemList contains products from Rider category
- [ ] All product URLs start with `/rider/` or `/products/`

### Test Case 2: Subcategory
**URL:** `/rider/giftware`

**Verify:**
- [ ] BreadcrumbList has 3 items (Home, Rider, Giftware)
- [ ] CollectionPage HAS `isPartOf` pointing to `/rider`
- [ ] ItemList contains products from Rider > Giftware
- [ ] All product URLs are correct canonical URLs

### Test Case 3: Product URLs
**Pick any collection page**

**Verify:**
- [ ] Open first product URL from schema
- [ ] Verify it loads correctly
- [ ] Verify it's the canonical URL (matches product page)
- [ ] Repeat for 3-5 random products

### Test Case 4: Image URLs
**Pick any collection page**

**Verify:**
- [ ] Products with images have `image` property
- [ ] Image URLs are absolute (include `https://`)
- [ ] Image URLs load correctly (paste in browser)
- [ ] Images are from Shopify CDN

### Test Case 5: Pagination
**Navigate to page 2 of any collection**

**Verify:**
- [ ] Schema still present on page 2
- [ ] ItemList contains page 2 products
- [ ] Product positions continue from page 1 OR restart at 1
- [ ] All URLs still correct

## 🐛 Common Issues & Fixes

### Issue: No Schema Found
**Symptoms:** No `<script type="application/ld+json">` in source

**Fixes:**
- Check server is running
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Check for JavaScript errors in console
- Verify collection exists in mapping

### Issue: Relative URLs
**Symptoms:** URLs like `/products/handle` instead of `https://...`

**Fixes:**
- Check `NEXT_PUBLIC_SITE_URL` in `.env.local`
- Should be: `NEXT_PUBLIC_SITE_URL=https://theequestrian.com.au`
- Restart dev server after changing

### Issue: Missing Product URLs
**Symptoms:** Products have no `url` property

**Fixes:**
- Verify `productUrls` is being passed to schema generator
- Check `getProductCanonicalUrls()` is called
- Verify products have valid handles

### Issue: Duplicate Schema Blocks
**Symptoms:** Two separate `<script>` tags for breadcrumbs and collection

**Fixes:**
- Verify using new `generateCollectionSchema()` function
- Should have ONE schema block with `@graph`
- Check imports are correct

### Issue: Wrong Product Count
**Symptoms:** `numberOfItems` doesn't match actual products

**Fixes:**
- Verify `products.length` is correct
- Check pagination isn't affecting count
- Verify filtering isn't removing products

## 📊 Performance Testing

### Schema Size
**Check:**
- [ ] Schema size < 50KB
- [ ] Limited to 50 products max
- [ ] No duplicate data

**How to Check:**
```javascript
// In browser console
const schema = document.querySelector('script[type="application/ld+json"]');
const size = new Blob([schema.innerHTML]).size;
console.log(`Schema size: ${(size / 1024).toFixed(2)} KB`);
```

### Page Load Impact
**Check:**
- [ ] Page loads in < 3 seconds
- [ ] Schema doesn't block rendering
- [ ] No console errors

**How to Check:**
1. Open DevTools → Network tab
2. Hard refresh page
3. Check "DOMContentLoaded" time
4. Verify < 3 seconds

## 🎯 Success Criteria

Your implementation is successful if:

1. ✅ **Structure:** Single schema block with `@graph`
2. ✅ **Entities:** BreadcrumbList + CollectionPage + ItemList
3. ✅ **URLs:** All products have absolute URLs
4. ✅ **Positions:** All items have sequential positions
5. ✅ **Validation:** Passes Google Rich Results Test
6. ✅ **Validation:** Passes Schema.org Validator
7. ✅ **Performance:** Schema < 50KB
8. ✅ **Functionality:** All product URLs load correctly

## 📸 Example Output

### Expected Schema Structure
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [...]
    },
    {
      "@type": "CollectionPage",
      "@id": "https://theequestrian.com.au/rider/giftware",
      "name": "Equestrian Giftware & Collectibles",
      "description": "Shop premium equestrian giftware...",
      "url": "https://theequestrian.com.au/rider/giftware",
      "isPartOf": {
        "@type": "CollectionPage",
        "name": "Rider",
        "url": "https://theequestrian.com.au/rider"
      },
      "mainEntity": {
        "@type": "ItemList",
        "itemListOrder": "https://schema.org/ItemListOrderDescending",
        "numberOfItems": 36,
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "url": "https://theequestrian.com.au/products/bracelet-black",
            "image": "https://cdn.shopify.com/s/files/1/...",
            "name": "Bracelet On The Bit Black",
            "offers": {
              "@type": "Offer",
              "price": "39.95",
              "priceCurrency": "AUD"
            }
          }
          // ... more items
        ]
      }
    }
  ]
}
```

## 🔄 Continuous Monitoring

### Weekly Checks
- [ ] Test 3-5 random collection pages
- [ ] Verify schema still valid
- [ ] Check for any console errors
- [ ] Monitor page load times

### Monthly Checks
- [ ] Run full validation on all collections
- [ ] Check Google Search Console for structured data errors
- [ ] Review Google Analytics for collection page traffic
- [ ] Monitor for any schema-related warnings

### After Deployments
- [ ] Test production URLs (not localhost)
- [ ] Verify NEXT_PUBLIC_SITE_URL is correct
- [ ] Check 3-5 collection pages
- [ ] Run Google Rich Results Test on production

## 📞 Support

If you encounter issues:
1. Check this testing guide
2. Review `COLLECTION-SCHEMA-UPGRADE.md`
3. Check browser console for errors
4. Verify environment variables
5. Test on production vs development

---

**Last Updated:** December 11, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Testing

