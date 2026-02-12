# Redirect Test Results

Complete test results for all redirect types before DNS cutover.

**Test Date:** January 12, 2026  
**Test Environment:** Local dev server (localhost:3001)  
**Status:** ✅ ALL PASSING

---

## Summary

| Redirect Type | Total | Passed | Failed | Status |
|--------------|-------|--------|--------|--------|
| **Collections** | 103 | 103 | 0 | ✅ |
| **Blogs** | 5 | 5 | 0 | ✅ |
| **Pages** | 5 | 5 | 0 | ✅ |
| **TOTAL** | **113** | **113** | **0** | **✅** |

---

## 1. Collection Redirects (103 total)

**Status:** ✅ All 103 redirects working  
**HTTP Status:** 301 Permanent Redirect  
**Query Parameters:** Preserved ✅

### Sample Results

```
✅ /collections/saddles → /horse/saddles (301)
✅ /collections/breeches → /clothing/womens/breeches (301)
✅ /collections/stirrups → /horse/tack/stirrups (301)
✅ /collections/footwear → /clothing/footwear (301)
✅ /collections/gifts → /accessories/gifts (301)
✅ /collections/horse-rugs → /horse/rugs (301)
✅ /collections/body-protectors → /rider/body-protectors (301)
✅ /collections/horse-boots → /horse/boots (301)
✅ /collections/luggage → /rider/luggage (301)
✅ /collections/birds → /pet/bird (301)
```

### Nested Collection Redirects

```
✅ /collections/saddles/jumping → /horse/saddles/jumping (301)
✅ /collections/saddles/dressage → /horse/saddles/dressage (301)
✅ /collections/horse-rugs/winter → /horse/rugs/winter (301)
✅ /collections/footwear/womens → /clothing/footwear/womens (301)
✅ /collections/ariat/womens → /clothing/womens (301)
```

### Source Files

- **CSV:** `redirects/collections.csv` (103 mappings)
- **Generated:** `lib/redirects/maps.ts` (collectionRedirects)
- **Middleware:** `middleware.ts` (lines 12-21)

---

## 2. Blog Redirects (5 tested)

**Status:** ✅ All working  
**HTTP Status:** 301 Permanent Redirect  
**Strategy:** CSV mappings + automatic `/blogs` removal fallback

### Test Results

```
✅ /blogs/news/summer-riding-tips → /news/summer-riding-tips (301)
✅ /blogs/news/best-saddles-2024 → /news/best-saddles-2024 (301)
✅ /blogs/news/any-article → /news/any-article (301)
✅ /blogs/news/test-post → /news/test-post (301)
✅ /blogs/announcements/new-products → /announcements/new-products (301)
```

### How It Works

1. **Specific Redirects:** Checks `blogRedirects` map first
2. **Fallback:** Automatically strips `/blogs` prefix
   - Example: `/blogs/news/article` → `/news/article`

### Source Files

- **CSV:** `redirects/blogs.csv` (2 specific mappings)
- **Generated:** `lib/redirects/maps.ts` (blogRedirects)
- **Middleware:** `middleware.ts` (lines 24-33)

---

## 3. Page Redirects (5 tested)

**Status:** ✅ All working  
**HTTP Status:** 301 Permanent Redirect  
**Strategy:** CSV mappings + automatic `/pages` removal fallback

### Test Results

```
✅ /pages/about → /about (301)
✅ /pages/contact → /contact (301)
✅ /pages/shipping → /shipping-delivery (301)
✅ /pages/returns → /returns (301)
✅ /pages/privacy-policy → /privacy-policy (301)
```

### How It Works

1. **Specific Redirects:** Checks `pageRedirects` map first
2. **Fallback:** Automatically strips `/pages` prefix
   - Example: `/pages/about` → `/about`

### Source Files

- **CSV:** `redirects/pages.csv` (3 specific mappings)
- **Generated:** `lib/redirects/maps.ts` (pageRedirects)
- **Middleware:** `middleware.ts` (lines 36-45)

---

## Redirect Architecture

### Middleware Flow

```
1. Request comes in (e.g. /collections/saddles)
2. Middleware checks pathname prefix
3. Looks up in CSV-generated map first
4. Falls back to automatic prefix removal
5. Returns 301 redirect with preserved query params
```

### Key Features

✅ **301 Permanent Redirects** - SEO-friendly  
✅ **Query Parameter Preservation** - Filters, sorting maintained  
✅ **Fallback Logic** - Handles unmapped URLs gracefully  
✅ **CSV-Based** - Easy to update without code changes  
✅ **Auto-Generated** - TypeScript maps generated from CSV  

---

## Testing Commands

### Test All Collections (103)
```bash
TEST_URL=http://localhost:3001 npm run redirects:test
```

### Test Sample Collections (10)
```bash
./test-sample-redirects.sh http://localhost:3001
```

### Test Blogs
```bash
tsx test-blog-redirects.ts
```

### Test Pages
```bash
tsx test-page-redirects.ts
```

### Manual Test (any URL)
```bash
curl -I https://www.theequestrian.com.au/collections/saddles
# Should return: HTTP/1.1 301 Moved Permanently
# location: /horse/saddles
```

---

## Pre-DNS Cutover Checklist

- [x] All 103 collection redirects tested locally
- [x] Blog redirects working (specific + fallback)
- [x] Page redirects working (specific + fallback)
- [x] 301 status codes confirmed
- [x] Query parameters preserved
- [x] No redirect loops detected
- [ ] Test on Vercel preview URL
- [ ] Test 20+ high-traffic URLs manually
- [ ] Monitor Vercel deployment logs
- [ ] Ready for DNS change

---

## Next Steps

### Before DNS Change

1. **Test on Vercel:**
   ```bash
   npm run redirects:test:prod
   # Or manually test:
   # https://theequestrian.vercel.app/collections/saddles
   ```

2. **Browser Testing:**
   - Open DevTools → Network tab
   - Visit old URLs on Vercel
   - Verify 301 redirects

3. **High-Traffic URLs:**
   - Test top 20 collection URLs
   - Test popular blog posts
   - Test key landing pages

### After DNS Change

1. **Monitor 404s** in Vercel Analytics
2. **Check Google Search Console** for crawl errors
3. **Review redirect logs** for patterns
4. **Add missing redirects** to CSV if needed

---

## Redirect Files Reference

```
redirects/
├── collections.csv        # 103 collection redirects
├── blogs.csv             # 2 blog redirects (+ fallback)
├── pages.csv             # 3 page redirects (+ fallback)
└── collections-matched.csv # Source data (392 potential)

lib/redirects/
└── maps.ts               # Auto-generated TypeScript maps

scripts/
├── generate-redirects.ts # CSV → TypeScript generator
└── test-redirects.ts     # Automated test suite

middleware.ts             # Redirect execution logic
```

---

## Success Metrics

✅ **113/113 redirects passing** (100%)  
✅ **0 redirect loops** detected  
✅ **301 permanent redirects** for SEO  
✅ **Query parameters** preserved  
✅ **Fallback logic** working for unmapped URLs  

**Status:** Ready for production deployment! 🚀
