# Codebase Analysis: Current Architecture

## Current Implementation Overview

### Data Fetching Architecture

The current system uses a **"Fetch All + Filter in Memory"** approach:

1. **Entry Point**: `app/[category]/page.tsx` (Line 150-159)
   - Calls `getProductsByTypes(allowedProductTypes, 36, afterCursor, filters)`
   - Passes filters for brands, sizes, colors

2. **Core Fetcher**: `lib/shopify/products.ts` → `getProductsByTypes()` (Lines 145-459)
   - **Current Behavior**:
     - Fetches ALL products matching the productTypes (using pagination, up to 50 pages × 250 products = 12,500 max)
     - Caches the full dataset for 15 minutes
     - Calculates facets (brands, sizes, colors, price) from ALL products
     - Applies filters IN MEMORY (server-side, after cache)
     - Returns paginated slice (36 products per page)

3. **Filtering Flow**:
   - Server-side filters: brands, sizes, colors (applied to cached full dataset)
   - Client-side filters: price, inStock (applied to current page only)
   - Sorting: Client-side (applied to current page only)

### Key Observations

#### ✅ What's Working Well

1. **Filtering works across entire category** - The system fetches ALL products for a category, so filters show accurate counts and work across all pages
2. **Facets are accurate** - Brand/size/color counts reflect the entire dataset, not just the current page
3. **Pagination preserves filters** - Uses cursor-based pagination with filter state maintained in URL params

#### ❌ Current Performance Issues

1. **Initial Load is Slow** (8-12 seconds for `/horse`)
   - Fetches ALL products (1000+) even though only 36 are displayed
   - Multiple GraphQL queries (up to 50 pages × 250 products each)
   - Large memory footprint for caching

2. **Cache Strategy is Aggressive**
   - 15-minute TTL means stale price/inventory data
   - No real-time hydration

3. **Redundant Data Transfer**
   - Downloads full product objects (images, variants, tags, metafields) for ALL products
   - Only needs dynamic fields (price, stock) for real-time accuracy

### Architecture Diagram: Current State

```
User Request (/horse?brand=Ariat&size=6.0)
           ↓
    getProductsByTypes()
           ↓
    ┌──────────────────────────────────┐
    │ Build Query:                     │
    │ product_type:"Horse Rugs" OR     │
    │ product_type:"Horse Boots" OR... │
    └──────────────┬───────────────────┘
                   ↓
    ┌──────────────────────────────────┐
    │ Check Cache (15min TTL)          │
    │ Cache Key: query string          │
    └──────────────┬───────────────────┘
                   ↓
         Cache Miss? ────────────┐
                   ↓              ↓
              YES (slow)      NO (fast)
                   ↓              ↓
    ┌──────────────────────────────────┐
    │ Fetch ALL Products               │
    │ - Loop up to 50 pages            │
    │ - 250 products per page          │
    │ - Full product data              │
    └──────────────┬───────────────────┘
                   ↓
    ┌──────────────────────────────────┐
    │ Calculate Facets from ALL        │
    │ - Brands (vendors + tags)        │
    │ - Sizes (from variants)          │
    │ - Colors (from variants)         │
    │ - Price range                    │
    └──────────────┬───────────────────┘
                   ↓
    ┌──────────────────────────────────┐
    │ Apply Filters IN MEMORY          │
    │ - Filter by brand                │
    │ - Filter by size                 │
    │ - Filter by color                │
    └──────────────┬───────────────────┘
                   ↓
    ┌──────────────────────────────────┐
    │ Manual Pagination                │
    │ - Slice array [startIndex:end]   │
    │ - Return 36 products             │
    │ - Generate cursor: "page:N"      │
    └──────────────┬───────────────────┘
                   ↓
         Return to Page Component
```

## Critical Insight: The Filter Requirement

**YOU WERE RIGHT** - We cannot break filtering! The current system works because:

1. It fetches ALL products for the category
2. Calculates facets from the complete dataset
3. Applies filters to the complete dataset
4. Then paginates the filtered results

**If we only fetch 36 products per page**, filtering would break:
- Brand filter would only show brands on the current page
- Size filter would only show sizes on the current page
- Clicking "Next Page" would show different filter options (bad UX)
- Total count would be wrong

## The Solution: Hybrid Approach with Smart Query Building

Instead of choosing between "Fetch All" or "Fetch 36", we need a **hybrid strategy**:

### Strategy A: Small Categories (<250 products)
- **Keep current behavior**: Fetch all, cache, filter in memory
- **Why**: It's already fast enough, and filtering works perfectly

### Strategy B: Large Categories (>250 products)
- **New behavior**: Use Shopify's native search with filters baked into the query
- **Key Innovation**: Build the Shopify query string to include ALL active filters
- **How it works**:

```javascript
// User selects: Brand=Ariat, Size=6.0
// We build the query:
const query = `(product_type:"Horse Rugs" OR product_type:"Horse Boots") AND vendor:Ariat AND tag:6.0`

// Shopify returns ONLY matching products
// We fetch ALL pages of matching products (not just 36)
// Calculate facets from the filtered results
// Paginate the filtered results
```

### Why This Works

1. **Filtering still works** - We fetch ALL products that match the current filters
2. **Performance is better** - Instead of fetching 1000+ products and filtering to 50, we fetch only the 50 that match
3. **Facets are accurate** - Calculated from the filtered dataset (which is what users expect)
4. **Pagination works** - We have the full filtered dataset to paginate through

### The Trade-off

- **Initial load (no filters)**: Still fetches all products (same as current)
- **With filters applied**: Much faster (fetches only matching products)
- **Facet counts**: Show counts for the filtered dataset (not the entire category)
  - This is actually BETTER UX - users see "how many Ariat products are size 6.0"

## Implementation Strategy

### Phase 1: Optimize Query Building (No Breaking Changes)

**Goal**: Make the existing system faster by optimizing how we query Shopify

**Changes**:
1. Add filter parameters to the Shopify query string (not just productType)
2. Let Shopify do the filtering instead of downloading everything
3. Keep the same API signature so nothing breaks

**File**: `lib/shopify/products.ts` → `getProductsByTypes()`

**Before**:
```typescript
const query = `(product_type:"Type1" OR product_type:"Type2")`
// Fetch ALL, filter in memory
```

**After**:
```typescript
const query = buildShopifyQuery(productTypes, filters)
// Returns: `(product_type:"Type1" OR product_type:"Type2") AND vendor:Ariat AND tag:6.0`
// Shopify returns only matching products
```

### Phase 2: Add Real-Time Hydration

**Goal**: Fix stale price/inventory data without changing the page structure

**Changes**:
1. Create `/app/api/products/status/route.ts` - lightweight endpoint for price/stock
2. Create `hooks/useLiveProductStatus.ts` - client hook to fetch fresh data
3. Update `ProductGridWithFilters` to use the hook
4. Update `ProductCard` to display hydrated data

**Flow**:
```
Server renders page with cached data (fast)
    ↓
Client mounts ProductGrid
    ↓
useLiveProductStatus hook fires
    ↓
Fetches fresh price/stock from /api/products/status
    ↓
Merges live data over cached data
    ↓
UI updates (price changes, "Sold Out" buttons)
```

## Performance Targets

| Scenario | Current | Target | Strategy |
|----------|---------|--------|----------|
| /horse (no filters) | 8-12s | <3s | Phase 1: Optimized query |
| /horse?brand=Ariat | 8-12s | <2s | Phase 1: Filtered query |
| /horse/rugs | 2-3s | <2s | No change (already fast) |
| Price accuracy | ~80% | 100% | Phase 2: Hydration |
| Inventory accuracy | ~70% | 100% | Phase 2: Hydration |

## Key Files to Modify

### Phase 1 (Performance)
1. `lib/shopify/products.ts` - Add `buildShopifyQuery()` helper
2. `lib/shopify/products.ts` - Update `getProductsByTypes()` to use filtered queries

### Phase 2 (Accuracy)
1. `app/api/products/status/route.ts` - NEW: Status API endpoint
2. `hooks/useLiveProductStatus.ts` - NEW: Client hook
3. `components/filters/ProductGridWithFilters.tsx` - Add hook integration
4. `components/ProductCard.tsx` - Display hydrated data

## Risk Assessment

### Low Risk ✅
- Adding filter parameters to Shopify query (Shopify handles it natively)
- Creating new API endpoint (doesn't affect existing code)
- Adding client-side hydration hook (progressive enhancement)

### Medium Risk ⚠️
- Changing facet calculation logic (need to test thoroughly)
- Modifying cache keys (could invalidate existing cache)

### High Risk ❌
- Removing the "fetch all" behavior entirely (would break filtering)
- Changing the pagination cursor format (would break existing URLs)

## Recommendation

**Implement Phase 1 first** - This gives us 60-70% of the performance benefit with minimal risk:
- Faster queries when filters are applied
- No breaking changes to the API
- Filtering still works perfectly
- Can be deployed incrementally (test on /horse first)

**Then implement Phase 2** - This fixes the accuracy problem:
- Real-time price/inventory data
- No impact on server performance
- Progressive enhancement (works without JS)
- Can be deployed independently

## Next Steps

1. ✅ Review this analysis with you
2. Create `buildShopifyQuery()` helper function
3. Update `getProductsByTypes()` to use filtered queries
4. Test on `/horse` category
5. Monitor performance and accuracy
6. Roll out to all categories
7. Implement Phase 2 (hydration)


