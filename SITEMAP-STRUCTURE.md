# Sitemap Structure

**Last Updated:** January 23, 2026  
**Status:** Production Ready

---

## Overview

The Equestrian uses a **dynamic, batched sitemap structure** optimized for ~10,000 products. All sitemaps are generated automatically by Next.js with no manual maintenance required.

## Sitemap Index

**URL:** `/sitemap.xml`

This is the main sitemap that points to all sub-sitemaps. Google and other search engines will discover all your pages through this index.

```xml
/sitemap.xml
├── /sitemap/static.xml
├── /sitemap/collections.xml
├── /sitemap/products-0.xml
├── /sitemap/products-1.xml
├── /sitemap/products-2.xml
├── /sitemap/products-3.xml
├── /sitemap/products-4.xml
└── /sitemap/news.xml
```

---

## Sub-Sitemaps

### 1. Static Pages (`/sitemap/static.xml`)

**Contains:** ~10-15 pages  
**Update Frequency:** Monthly  
**Priority:** 0.3-1.0

**Pages Included:**
- Homepage (priority: 1.0)
- About, Contact, FAQ (priority: 0.5)
- Privacy Policy, Terms of Service (priority: 0.3)
- Returns & Refunds, Shipping (priority: 0.4)
- On Sale (priority: 0.9)
- Brands (priority: 0.7)

### 2. Collections (`/sitemap/collections.xml`)

**Contains:** 241 collection/category pages  
**Update Frequency:** Weekly  
**Priority:** 0.8

**Source:** `mapping-template-draft2.csv` (headless frontend collections only, not all Shopify collections)

**Includes ALL levels:**
- Top-level: `/horse`, `/rider`, `/clothing`, `/pet`, `/accessories`
- 2 levels: `/horse/boots`, `/clothing/accessories`, `/rider/helmets`
- 3 levels: `/clothing/accessories/belts`, `/horse/boots/jumping`
- 4+ levels: `/clothing/footwear/riding-boots/tall-boots`

**Note:** Only includes categories that exist in your headless frontend URL structure, not every Shopify collection.

### 3. Products - Batch 0 (`/sitemap/products-0.xml`)

**Contains:** Products 0-1,999  
**Update Frequency:** Weekly  
**Priority:** 0.6

**URL Structure:**
- **Primary (Canonical):** Full hierarchical path based on `primary_collection` metafield
  - 2 levels: `/{category}/{product-handle}`
    - Example: `/saddles/wintec-pro-dressage-saddle`
  - 3 levels: `/{category}/{subcategory}/{product-handle}`
    - Example: `/horse/rugs/zilco-defender-cotton-combo`
  - 4+ levels: `/{category}/{subcategory}/{sub-subcategory}/{product-handle}`
    - Example: `/horse/rugs/turnout-rugs/horseware-rambo-original`
- **Fallback:** `/products/{product-handle}`
  - Only for products without `primary_collection` metafield
  - Example: `/products/some-product`

**Note:** All product URLs in sitemaps use the **canonical URL** (full hierarchical path) to ensure proper SEO, clear navigation structure, and avoid duplicate content issues. The depth varies based on your category structure in Shopify.

### 4. Products - Batch 1 (`/sitemap/products-1.xml`)

**Contains:** Products 2,000-3,999  
**Update Frequency:** Weekly  
**Priority:** 0.6  
**URL Structure:** Same as Batch 0

### 5. Products - Batch 2 (`/sitemap/products-2.xml`)

**Contains:** Products 4,000-5,999  
**Update Frequency:** Weekly  
**Priority:** 0.6  
**URL Structure:** Same as Batch 0

### 6. Products - Batch 3 (`/sitemap/products-3.xml`)

**Contains:** Products 6,000-7,999  
**Update Frequency:** Weekly  
**Priority:** 0.6  
**URL Structure:** Same as Batch 0

### 7. Products - Batch 4 (`/sitemap/products-4.xml`)

**Contains:** Products 8,000-9,999  
**Update Frequency:** Weekly  
**Priority:** 0.6  
**URL Structure:** Same as Batch 0

### 8. News/Blog (`/sitemap/news.xml`)

**Contains:** All blog posts  
**Update Frequency:** Monthly  
**Priority:** 0.5

**URL Format:** `/news/{article-handle}`

---

## Technical Details

### Caching

All sitemaps use HTTP caching:
```
Cache-Control: public, max-age=3600, s-maxage=3600
```

This means:
- Sitemaps are cached for 1 hour
- Search engines can cache them
- Reduces load on Shopify API
- Still updates frequently enough for new products

### Why Batched?

**Google's Limits:**
- Max 50,000 URLs per sitemap
- Max 50 MB uncompressed
- Recommends splitting large sitemaps

**Our Benefits:**
- Faster generation (2,000 products vs 10,000)
- Faster parsing by search engines
- Better crawl efficiency
- Easier to debug specific batches

### Dynamic Generation

Each sitemap is generated on-demand:
1. User/bot requests `/sitemap.xml`
2. Next.js generates index pointing to sub-sitemaps
3. Bot requests `/sitemap/products-0.xml`
4. Next.js fetches products 0-1,999 from Shopify
5. Reads `primary_collection` metafield for each product
6. Generates canonical URL with full hierarchical path:
   - Parses the `primary_collection` value (e.g., "horse/rugs/turnout-rugs")
   - Constructs URL: `/{primary_collection}/{product-handle}`
   - Result: `/horse/rugs/turnout-rugs/horseware-rambo-original`
7. Creates XML and caches for 1 hour
8. Repeat for other sitemaps

**Important:** The sitemap always outputs the **canonical URL** (full hierarchical path), never the legacy `/products/{handle}` URL, ensuring search engines index the correct, SEO-optimized URLs with proper category context.

---

## Submitting to Search Engines

### Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Select your property
3. Go to **Sitemaps** in left menu
4. Enter: `https://theequestrian.com/sitemap.xml`
5. Click **Submit**

Google will automatically discover all sub-sitemaps.

### Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Select your site
3. Go to **Sitemaps**
4. Enter: `https://theequestrian.com/sitemap.xml`
5. Click **Submit**

---

## Monitoring

### Check Sitemap Health

**Manually:**
```bash
# Check index
curl https://theequestrian.com/sitemap.xml

# Check static pages
curl https://theequestrian.com/sitemap/static.xml

# Check collections
curl https://theequestrian.com/sitemap/collections.xml

# Check products batch 0
curl https://theequestrian.com/sitemap/products-0.xml
```

**Via Google Search Console:**
- Go to **Sitemaps** section
- View submitted sitemaps
- Check for errors or warnings
- Monitor discovered URLs

### Common Issues

**Sitemap not updating:**
- Wait 1 hour for cache to expire
- Check Shopify API is accessible
- Verify environment variables are set

**Missing products:**
- Check product has `primary_collection` metafield
- Verify product is published
- Check correct batch number (0-4)

**404 errors:**
- Ensure Next.js app is deployed
- Check route files exist in `app/sitemap/`
- Verify dynamic routes are working

---

## File Structure

```
app/
├── sitemap.ts                          # Main sitemap index
└── sitemap/
    ├── static.xml/
    │   └── route.ts                    # Static pages sitemap
    ├── collections.xml/
    │   └── route.ts                    # Collections sitemap
    ├── products-[batch]/
    │   └── route.ts                    # Products sitemap (batched)
    └── news.xml/
        └── route.ts                    # News/blog sitemap
```

---

## Maintenance

**Required:** None! Everything is automatic.

**Optional:**
- Monitor Google Search Console for errors
- Review crawl stats monthly
- Update priorities if needed (edit route files)

---

## Performance

**Generation Time:**
- Index: <100ms
- Static: <100ms
- Collections: ~1-2s (50 collections)
- Products (per batch): ~3-5s (2,000 products)
- News: ~1-2s (varies by post count)

**Total for all sitemaps:** ~20-30s (first request, then cached)

**After cache:** <100ms (served from cache)

---

## Summary

✅ **Automatic** - No scripts or cron jobs needed  
✅ **Scalable** - Handles 10,000+ products efficiently  
✅ **Fast** - 1-hour cache reduces API calls  
✅ **SEO-Friendly** - Proper priorities and update frequencies  
✅ **Google-Compliant** - Follows all sitemap best practices  

**Submit once to Google Search Console and forget about it!**

---

**Last Updated:** January 23, 2026  
**Maintained By:** Development Team  
**Questions?** See `SCRIPTS-AND-AUTOMATION-WIKI.md`
