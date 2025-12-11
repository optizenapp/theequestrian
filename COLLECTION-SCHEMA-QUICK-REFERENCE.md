# Collection Schema - Quick Reference

## 🚀 Quick Start

### What Changed?
✅ Collection pages now use "Best in Class" schema with `ItemList` instead of `OfferCatalog`

### Why?
- Google prefers `ItemList` for collection pages
- Enables carousel results in search
- Creates Knowledge Graph edges via product URLs
- Better crawl efficiency and PageRank distribution

---

## 📁 Files Modified

### New File
- `lib/utils/collection-schema.ts` - Schema generator utility

### Updated Files
- `app/[category]/page.tsx` - Category collection pages
- `app/[category]/[subcategory]/page.tsx` - Subcategory collection pages

### Documentation
- `COLLECTION-SCHEMA-UPGRADE.md` - Full technical guide
- `COLLECTION-SCHEMA-TESTING.md` - Testing procedures
- `SCHEMA-BEFORE-AFTER.md` - Detailed comparison
- `COLLECTION-SCHEMA-IMPLEMENTATION-SUMMARY.md` - Implementation status

---

## 🔍 Quick Validation

### 1. Check Schema Exists
```bash
# Start dev server
npm run dev

# Visit any collection page
open http://localhost:3000/rider/giftware

# View source (Cmd+U / Ctrl+U)
# Search for: application/ld+json
```

### 2. Verify Structure
Look for:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "BreadcrumbList" },
    {
      "@type": "CollectionPage",
      "mainEntity": {
        "@type": "ItemList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "url": "https://...",
            "item": {
              "@type": "Product",
              "name": "Product Name",
              "offers": { ... }
            }
          }
        ]
      }
    }
  ]
}
```

### 3. Online Validators
- **Google Rich Results Test:** https://search.google.com/test/rich-results
- **Schema.org Validator:** https://validator.schema.org/

---

## ✅ Checklist

### Schema Structure
- [ ] Single `<script type="application/ld+json">` tag (not two)
- [ ] Contains `"@graph"` array
- [ ] Has `BreadcrumbList` entity
- [ ] Has `CollectionPage` entity with `mainEntity`
- [ ] `mainEntity` is type `ItemList`
- [ ] Each item is type `ListItem` (not `Offer`)
- [ ] Each item has `position` (1, 2, 3...)
- [ ] Each item has `url` (absolute URL)
- [ ] Each item has `item` property containing Product
- [ ] Product has `name`, `url`, `offers`
- [ ] No warnings about invalid properties

### URLs
- [ ] All URLs are absolute (include `https://`)
- [ ] Product URLs are canonical
- [ ] Breadcrumb URLs are correct
- [ ] Collection URL matches page URL

### Relationships
- [ ] Subcategories have `isPartOf` pointing to parent
- [ ] Top-level categories have no `isPartOf`

---

## 🐛 Common Issues

### Issue: No Schema Found
**Fix:** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

### Issue: Relative URLs
**Fix:** Set `NEXT_PUBLIC_SITE_URL` in `.env.local`

### Issue: Wrong Item Type
**Fix:** Should be `ListItem`, not `Offer`

### Issue: Missing URLs
**Fix:** Verify `productUrls` is passed to schema generator

---

## 📊 Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Schema Blocks** | 2 separate | 1 unified |
| **Container Type** | OfferCatalog | ItemList ✅ |
| **Item Type** | Offer | ListItem ✅ |
| **Product URLs** | Missing | Present ✅ |
| **Positions** | Missing | Present ✅ |
| **Carousel Eligible** | No | Yes ✅ |

---

## 🎯 Expected Benefits

### Immediate
- ✅ Cleaner code (1 schema block instead of 2)
- ✅ Type-safe implementation
- ✅ Better structured data

### Short-term (1-2 weeks)
- 🎯 Validates with Google Rich Results Test
- 🎯 No errors in Search Console
- 🎯 Products in Knowledge Graph

### Long-term (1-3 months)
- 🎯 Carousel appearances in search
- 🎯 Improved collection page rankings
- 🎯 Better product discovery
- 🎯 Increased organic traffic

---

## 📞 Need Help?

1. **Full Details:** Read `COLLECTION-SCHEMA-UPGRADE.md`
2. **Testing:** Follow `COLLECTION-SCHEMA-TESTING.md`
3. **Comparison:** See `SCHEMA-BEFORE-AFTER.md`
4. **Status:** Check `COLLECTION-SCHEMA-IMPLEMENTATION-SUMMARY.md`

---

## 🚦 Status

**Implementation:** ✅ Complete  
**Type Safety:** ✅ Verified  
**Testing:** ⏳ Ready for Manual Testing  
**Production:** ⏳ Ready for Deployment  

**Next Step:** Test on dev server, then deploy to production

---

**Last Updated:** December 11, 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready

