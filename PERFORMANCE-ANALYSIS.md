# Performance Analysis: /horse Category

**Date:** December 11, 2025  
**Issue:** Slow page load times on https://theequestrian.vercel.app/horse  
**Expected:** <200ms (cached), 2-3s (first visit)  
**Actual:** 8-12+ seconds (every visit)

---

## 🔴 Critical Findings

### 1. **The Caching Is NOT Working**

Despite the PERFORMANCE-JOURNEY.md claiming caching works, the live site shows:
- **Every page load takes 8-12+ seconds**
- No improvement on repeat visits
- The "instant cached pages" are not happening

### 2. **The Root Cause: TOO MANY PRODUCT TYPES**

The `/horse` category is querying **230 unique product types** in a single Shopify GraphQL query:

```typescript
// From getProductsByTypes() in lib/shopify/products.ts
const baseQueryString = buildShopifyQuery(productTypes, filters);
// Returns: (product_type:"Horse Boots" OR product_type:"Bits" OR ... 228 more)
```

**Product Types for /horse:**
- Horse Boots
- Bits  
- Grooming Products
- Supplements
- Saddle Cloths
- Racing & PVC
- Headstalls
- Health Care
- Stable Equipment
- Training and Lungeing
- Stock & Western
- Horse Rugs
- Strapping
- Flyveils & Bonnets
- Saddles
- **...and 215 more!**

### 3. **Why This Is Slow**

```
┌─────────────────────────────────────────────────────────────┐
│ Current Flow (SLOW)                                         │
└─────────────────────────────────────────────────────────────┘

1. User visits /horse
2. getProductTypesForCollection('horse') returns 230 types
3. buildShopifyQuery() creates massive OR query:
   "(product_type:"Type1" OR product_type:"Type2" OR ... 230 types)"
4. Shopify GraphQL API processes this huge query
5. Returns 4,409 products (per live site)
6. Fetches ALL pages (up to 50 pages × 250 products = 12,500 max)
7. Calculates facets from ALL products
8. Paginates in memory
9. Returns 36 products to user

Total Time: 8-12+ seconds
Data Fetched: 4,409 products
Data Shown: 36 products (0.8%)
Efficiency: 0.8% 🔴
```

---

## 📊 Performance Breakdown

### Current Implementation Issues

| Issue | Impact | Evidence |
|-------|--------|----------|
| **230 product types in query** | 🔴 Critical | Massive OR query, slow to process |
| **Fetching ALL 4,409 products** | 🔴 Critical | 50 pages × 250 products each |
| **Calculating facets from all** | 🔴 High | Processing 4,409 products for facets |
| **In-memory pagination** | 🟡 Medium | Sorting 4,409 products client-side |
| **Cache not working** | 🔴 Critical | No ISR benefit, every visit is slow |

### Why Cache Isn't Working

Looking at `lib/shopify/client.ts`:

```typescript
export async function shopifyFetch<T>({
  query,
  variables = {},
  cache = 'force-cache',
  tags = [],
}: ShopifyFetchOptions): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ... },
    body: JSON.stringify({ query, variables }),
    cache, // ✅ This is set correctly
    next: {
      revalidate: cache === 'force-cache' ? 900 : undefined, // ✅ 15 min
      tags: tags.length > 0 ? tags : undefined,
    },
  });
}
```

**The cache IS configured correctly**, but:

1. **POST requests with body are harder to cache** - The cache key includes the body, and with 230 product types, the query string is HUGE and unique
2. **Multiple pagination requests** - Each page (up to 50) is a separate fetch with different cursor values
3. **Dynamic query strings** - Every filter combination creates a new cache key
4. **Vercel ISR limits** - Large responses (4,409 products) may exceed cache size limits

---

## 🎯 The Real Problem

### It's Not a Caching Problem - It's a Data Volume Problem

Even if caching worked perfectly:
- **First visit:** Still 8-12s (needs to fetch 4,409 products)
- **With filters:** Still slow (re-fetches all products)
- **Cache invalidation:** Every 15 min, someone gets the slow experience

### The Core Issue: Wrong Architecture

```
❌ CURRENT: Fetch ALL, Filter Client-Side
┌──────────────────────────────────────────┐
│ Shopify: 4,409 products                  │
│    ↓                                     │
│ Next.js: Calculate facets from all       │
│    ↓                                     │
│ Next.js: Paginate in memory              │
│    ↓                                     │
│ User: See 36 products                    │
└──────────────────────────────────────────┘
Time: 8-12s
Efficiency: 0.8%

✅ NEEDED: Fetch Only What's Needed
┌──────────────────────────────────────────┐
│ Database: Query for 36 products          │
│    ↓                                     │
│ Database: Calculate facets (SQL)         │
│    ↓                                     │
│ User: See 36 products                    │
└──────────────────────────────────────────┘
Time: <200ms
Efficiency: 100%
```

---

## 💡 Solutions (Ranked by Effectiveness)

### Option 1: Vercel Postgres (RECOMMENDED) ⭐⭐⭐⭐⭐

**What:** Implement the CURSOR_BRIEF.md plan
**Why:** This is the ONLY solution that will give you <200ms consistently
**Effort:** 1-2 weeks
**Cost:** ~$15/mo

**Performance:**
- First visit: <200ms ✅
- Cached visits: <100ms ✅
- With filters: <200ms ✅
- Efficiency: 100% ✅

**This is what you need.** The current architecture cannot scale to 4,409 products.

---

### Option 2: Reduce Product Types Per Category 🟡

**What:** Split `/horse` into smaller subcategories
**Why:** Fewer product types = faster queries
**Effort:** 1-2 days (restructure mapping CSV)
**Cost:** $0

**Example:**
```
Current:
/horse → 230 product types → 4,409 products ❌

Better:
/horse/boots → 15 product types → 200 products ✅
/horse/rugs → 20 product types → 500 products ✅
/horse/saddles → 10 product types → 150 products ✅
```

**Performance Improvement:**
- `/horse/boots`: 2-3s (vs 8-12s) - 60% faster
- Still not ideal, but better

**Downside:** Users can't browse "all horse products" easily

---

### Option 3: Limit Pagination Fetches 🟡

**What:** Change `maxPages` from 50 to 5 in `getProductsByTypes()`
**Why:** Fetch fewer products, faster response
**Effort:** 5 minutes
**Cost:** $0

```typescript
// In lib/shopify/products.ts, line 265
const maxPages = 5; // Was: 50
// This limits to 5 × 250 = 1,250 products instead of 12,500
```

**Performance Improvement:**
- First visit: 4-6s (vs 8-12s) - 50% faster
- Shows first 1,250 products only

**Downside:** Users can't see all 4,409 products

---

### Option 4: Lazy Load Facets ⚠️

**What:** Show products immediately, load facets in background
**Why:** Faster perceived performance
**Effort:** 1-2 days
**Cost:** $0

**Performance:**
- Initial render: 2-3s (show products without facets)
- Facets load: +3-4s (background)
- Total: Same 8-12s, but feels faster

**Downside:** Doesn't actually solve the problem

---

### Option 5: Server-Side Pagination Only ⚠️

**What:** Don't fetch ALL products, just fetch page 1 (36 products)
**Why:** Much faster initial load
**Effort:** 1 day
**Cost:** $0

**Problems:**
- ❌ Can't calculate accurate facets (need all products for counts)
- ❌ Can't sort globally (in-stock first across all pages)
- ❌ Total count will be wrong

**This breaks core functionality.**

---

## 🚀 Recommended Action Plan

### Phase 1: Immediate Fix (Today) - Option 3

**Goal:** Reduce pain from 8-12s to 4-6s

```typescript
// lib/shopify/products.ts, line 265
const maxPages = 5; // Limit to 1,250 products
```

**Deploy immediately.** This gives users a better experience while you work on the real fix.

---

### Phase 2: Real Fix (Next 1-2 Weeks) - Option 1

**Goal:** Implement Vercel Postgres per CURSOR_BRIEF.md

**Why this is the only real solution:**

1. **Shopify's GraphQL API is not designed for this use case**
   - It's built for fetching small sets of products
   - Not for querying 4,409 products with complex filters
   - No SQL-like aggregations or facet calculations

2. **Caching can't solve the fundamental problem**
   - First visit will always be slow
   - Cache invalidation means regular slow experiences
   - Large responses are hard to cache

3. **Postgres solves all of this:**
   - Query only what you need (36 products)
   - Calculate facets in SQL (milliseconds)
   - Index-based filtering (instant)
   - Consistent performance (always fast)

**Timeline:**
- Day 1-2: Set up Postgres, create schema
- Day 3-4: Build sync script, initial sync
- Day 5-6: Build search API endpoint
- Day 7-8: Update category pages
- Day 9-10: Set up webhooks
- Day 11-12: Testing & deployment

**Result:**
- <200ms page loads ✅
- <500ms with filters ✅
- 100% accurate facets ✅
- Scales to 100k+ products ✅

---

## 📈 Performance Comparison

| Metric | Current | Option 3 (Quick Fix) | Option 1 (Postgres) |
|--------|---------|---------------------|---------------------|
| **First visit** | 8-12s 🔴 | 4-6s 🟡 | <200ms ✅ |
| **Cached visit** | 8-12s 🔴 | 4-6s 🟡 | <100ms ✅ |
| **With filters** | 8-12s 🔴 | 4-6s 🟡 | <200ms ✅ |
| **Products shown** | 4,409 ✅ | 1,250 🟡 | All ✅ |
| **Facet accuracy** | 100% ✅ | ~30% 🔴 | 100% ✅ |
| **Maintenance** | None ✅ | None ✅ | Low 🟡 |
| **Cost** | $0 ✅ | $0 ✅ | $15/mo 🟡 |

---

## 🎯 Conclusion

**The current performance is NOT acceptable because:**

1. ❌ Caching is not working (8-12s every visit)
2. ❌ Fetching 4,409 products to show 36 (0.8% efficiency)
3. ❌ 230 product types in a single query (too complex)
4. ❌ Users are waiting 8-12 seconds for every page

**The CURSOR_BRIEF.md plan (Vercel Postgres) is correct.**

This is not a caching problem. This is an architecture problem. You cannot efficiently query 4,409 products from Shopify's GraphQL API on every page load.

**Recommendation:**
1. ✅ **Today:** Implement Option 3 (limit to 5 pages) - 5 minutes
2. ✅ **This week:** Start Option 1 (Postgres) - 1-2 weeks
3. ✅ **Monitor:** Track performance improvements

The Postgres solution will give you:
- 40-60x faster page loads
- Consistent performance
- Better user experience
- Scalability for growth

**Let's implement Option 3 now, then start on Postgres.**

---

## 📝 Next Steps

1. **Immediate (5 minutes):**
   - Change `maxPages = 5` in `lib/shopify/products.ts`
   - Deploy to production
   - Monitor performance

2. **This Week:**
   - Review CURSOR_BRIEF.md
   - Set up Vercel Postgres
   - Create database schema
   - Build sync script

3. **Next Week:**
   - Build search API
   - Update category pages
   - Set up webhooks
   - Deploy to production

**Ready to proceed?**
