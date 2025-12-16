# Performance Optimization Plan - Headless Architecture

## Current Problem

**Architecture:**
```
User Request → Next.js Server → Shopify API (every time) → 12 seconds
```

**Issues:**
- ❌ Hitting Shopify API on every first request
- ❌ In-memory cache clears on server restart
- ❌ Cache not shared between Vercel serverless instances
- ❌ 12 seconds for 1,618 products is unacceptable for headless commerce

**Current Performance:**
| Page | First Load | Cached Load |
|------|-----------|-------------|
| `/pet` | 12.0s | <1s (if cache exists) |
| `/horse` | ~15s | <1s (if cache exists) |
| `/rider` | ~12s | <1s (if cache exists) |

## Solution: True Headless Architecture

### **Option 1: Next.js ISR (Incremental Static Regeneration)** ⭐ QUICK WIN

**Implementation:**
```typescript
// app/[category]/page.tsx
export const revalidate = 900; // 15 minutes

// This already exists but needs optimization
```

**How it works:**
1. First request: Slow (12s) - generates static page
2. Next requests: **Instant** (<50ms) - serves cached HTML
3. After 15 min: Background regeneration (users still get fast page)

**Changes Needed:**
- Move data fetching to build time where possible
- Implement proper cache headers
- Use `generateStaticParams()` for known routes

**Expected Result:**
- First user: 12s (one-time cost per 15 min)
- All other users: **<50ms** ⚡

---

### **Option 2: Build-Time Static Generation** ⭐⭐ BEST FOR HEADLESS

Pre-generate all category pages at build time.

**Implementation:**

```typescript
// app/[category]/page.tsx

// 1. Generate all category pages at build time
export async function generateStaticParams() {
  const categories = [
    'pet',
    'horse', 
    'rider',
    'clothing',
    'accessories'
  ];
  
  return categories.map(category => ({
    category
  }));
}

// 2. Make the page static with ISR
export const revalidate = 3600; // 1 hour

// 3. Fetch data at build time
export default async function CategoryPage({ params }: CategoryPageProps) {
  // This runs at BUILD TIME, not request time
  const { products, facets } = await getProductsByTypes(allowedProductTypes);
  
  return (
    <ProductGridWithFilters 
      products={products}
      facets={facets}
    />
  );
}
```

**Build Process:**
```bash
# During build, Next.js will:
# 1. Generate /pet → fetches 1,618 products (12s)
# 2. Generate /horse → fetches products (15s)
# 3. Generate /rider → fetches products (12s)
# Total build time: ~5 minutes
# User experience: INSTANT
```

**Result:**
- Build time: Slow (one-time cost)
- User experience: **<50ms** (pure static HTML)
- Updates: Automatic revalidation every hour
- Can trigger on-demand revalidation via webhook

---

### **Option 3: External Cache Layer (Redis/Vercel KV)** ⭐⭐⭐ PRODUCTION READY

Persistent cache shared across all Vercel serverless instances.

**Implementation:**

```typescript
// lib/cache/redis.ts
import { kv } from '@vercel/kv';

export async function getCachedProducts(cacheKey: string) {
  const cached = await kv.get(`products:${cacheKey}`);
  if (cached) {
    console.log('[Cache] HIT:', cacheKey);
    return JSON.parse(cached as string);
  }
  console.log('[Cache] MISS:', cacheKey);
  return null;
}

export async function setCachedProducts(
  cacheKey: string, 
  products: any[], 
  ttl: number = 900
) {
  await kv.set(
    `products:${cacheKey}`, 
    JSON.stringify(products), 
    { ex: ttl }
  );
}
```

```typescript
// lib/shopify/products.ts
import { getCachedProducts, setCachedProducts } from '@/lib/cache/redis';

export async function getProductsByTypes(...) {
  const cacheKey = `productTypes:${productTypes.join(',')}`;
  
  // Check Redis cache
  const cached = await getCachedProducts(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from Shopify
  const products = await fetchFromShopify();
  
  // Store in Redis
  await setCachedProducts(cacheKey, products, 900); // 15 min
  
  return products;
}
```

**Setup:**
```bash
# 1. Install Vercel KV
npm install @vercel/kv

# 2. Add to Vercel project
vercel env add KV_REST_API_URL
vercel env add KV_REST_API_TOKEN
```

**Result:**
- First request: 12s (cache miss)
- All subsequent requests: **<500ms** (Redis cache hit)
- Shared across all Vercel instances
- Persistent across deployments

**Cost:** ~$10/month for Vercel KV

---

### **Option 4: Shopify Webhooks + Background Sync** ⭐⭐⭐ ULTIMATE SOLUTION

Pre-fetch and cache data when products change, not when users request.

**Implementation:**

```typescript
// app/api/webhooks/shopify/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  // 1. Verify Shopify webhook signature
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const body = await request.text();
  
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(body)
    .digest('base64');
  
  if (hash !== hmac) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const data = JSON.parse(body);
  
  // 2. Trigger cache refresh for affected categories
  const productType = data.product_type;
  const affectedCategories = getCategoriesForProductType(productType);
  
  // 3. Pre-fetch and cache data in background
  for (const category of affectedCategories) {
    await refreshCategoryCache(category);
  }
  
  // 4. Optionally trigger on-demand ISR
  await fetch(`${process.env.SITE_URL}/api/revalidate?secret=${process.env.REVALIDATE_SECRET}&path=/${category}`);
  
  return NextResponse.json({ success: true });
}
```

```typescript
// lib/cache/background-sync.ts
export async function refreshCategoryCache(category: string) {
  console.log(`[Background Sync] Refreshing cache for: ${category}`);
  
  const productTypes = getProductTypesForCollection(category);
  const { products, facets } = await getProductsByTypes(productTypes);
  
  // Store in Redis
  await setCachedProducts(`category:${category}`, { products, facets });
  
  console.log(`[Background Sync] ✅ Cached ${products.length} products for ${category}`);
}
```

**Shopify Webhook Setup:**
```
1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Create webhook:
   - Event: Product creation, Product update, Product deletion
   - URL: https://yoursite.com/api/webhooks/shopify/products
   - Format: JSON
3. Copy webhook secret to .env: SHOPIFY_WEBHOOK_SECRET
```

**Result:**
- User requests: **Always <500ms** (pre-cached)
- Updates: Real-time via webhooks
- Zero Shopify API calls during user requests
- True headless architecture

---

## Recommended Implementation Plan

### **Phase 1: Quick Wins (1-2 hours)**
1. ✅ Implement Redis/Vercel KV cache (Option 3)
2. ✅ Optimize GraphQL queries (already done)
3. ✅ Remove redundant API calls (already done)

**Expected:** 12s → 2-3s (first request), <500ms (cached)

### **Phase 2: Static Generation (2-3 hours)**
1. ✅ Implement `generateStaticParams()` for all category pages
2. ✅ Implement `generateStaticParams()` for subcategory pages
3. ✅ Configure ISR revalidation (1 hour)
4. ✅ Test build process

**Expected:** <50ms for all requests

### **Phase 3: Webhook Integration (3-4 hours)**
1. ✅ Create webhook endpoint
2. ✅ Implement signature verification
3. ✅ Build background sync logic
4. ✅ Configure Shopify webhooks
5. ✅ Test with product updates

**Expected:** Real-time updates, always instant

---

## Technical Details

### Current Cache Implementation
```typescript
// lib/shopify/products.ts (current)
let productsByTypesCache: Map<string, {
  products: ProductWithPrimaryCollection[];
  timestamp: number;
}> = new Map();

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
```

**Problems:**
- In-memory only (lost on restart)
- Not shared between serverless instances
- Cleared on every deployment

### Proposed Cache Implementation
```typescript
// lib/cache/redis.ts (new)
import { kv } from '@vercel/kv';

export class ProductCache {
  static async get(key: string) {
    return await kv.get(`products:${key}`);
  }
  
  static async set(key: string, value: any, ttl: number = 900) {
    return await kv.set(`products:${key}`, value, { ex: ttl });
  }
  
  static async invalidate(pattern: string) {
    // Invalidate all keys matching pattern
    const keys = await kv.keys(`products:${pattern}*`);
    await Promise.all(keys.map(key => kv.del(key)));
  }
}
```

---

## Performance Targets

### Current Performance
- First load: 12-15 seconds
- Cached load: <1 second (if cache exists)
- Cache hit rate: ~30% (low due to restarts)

### Target Performance (After Implementation)
- First load: <500ms (Redis cache)
- Subsequent loads: <50ms (ISR static)
- Cache hit rate: >95%
- Build time: 5-10 minutes (acceptable)

### Lighthouse Scores Target
- Performance: 95+
- First Contentful Paint: <1s
- Largest Contentful Paint: <2s
- Time to Interactive: <2s

---

## Filter Requirements (Must Maintain)

All category pages must have these filters:
1. **Categories** (subcategories)
2. **Price Slider** (min/max from all products)
3. **Size** (from variant selectedOptions)
4. **Color** (from variant selectedOptions)
5. **Brand** (from vendor and tags)

**Important:** Filters only render if products have that attribute.

**Current Implementation:** ✅ Working correctly
- Facets calculated from all products in category
- Filters dynamically shown/hidden based on availability

**After Optimization:** Must maintain same behavior
- Pre-calculate facets at build time or cache time
- Store facets alongside products in cache
- Ensure filter accuracy across all pages

---

## Cost Analysis

### Option 1 (ISR Only)
- Cost: $0 (included in Vercel)
- Performance: Good (50-200ms)
- Complexity: Low

### Option 2 (Static Generation)
- Cost: $0 (included in Vercel)
- Performance: Excellent (<50ms)
- Complexity: Medium
- Build time: 5-10 minutes

### Option 3 (Redis Cache)
- Cost: ~$10/month (Vercel KV)
- Performance: Excellent (<500ms)
- Complexity: Low
- Recommended: ⭐⭐⭐

### Option 4 (Webhooks + Sync)
- Cost: ~$10/month (Vercel KV) + minimal compute
- Performance: Excellent (<50ms)
- Complexity: High
- Recommended: ⭐⭐⭐ (Production)

---

## Next Steps

1. **Decide on approach:**
   - Quick win: Option 3 (Redis)
   - Best long-term: Option 2 + 4 (Static + Webhooks)

2. **Set up infrastructure:**
   - Provision Vercel KV
   - Configure environment variables

3. **Implement caching layer:**
   - Create cache utilities
   - Update data fetching functions
   - Test cache invalidation

4. **Implement webhooks:**
   - Create webhook endpoint
   - Configure Shopify webhooks
   - Test background sync

5. **Monitor and optimize:**
   - Track cache hit rates
   - Monitor API usage
   - Optimize TTL values

---

## References

- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Shopify Webhooks Documentation](https://shopify.dev/docs/api/admin-rest/2024-01/resources/webhook)
- [Next.js generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)

---

**Created:** December 10, 2025  
**Status:** Planning Phase  
**Priority:** High  
**Estimated Implementation Time:** 6-8 hours (all phases)



