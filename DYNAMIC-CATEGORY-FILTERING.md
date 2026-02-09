# Dynamic Category Filtering & Empty Category Redirects

## Overview

This document describes the empty category redirect system that automatically redirects users from empty category pages to their parent categories.

**Note:** Dynamic navigation filtering (hiding empty categories from pills/mega menu) is currently **disabled** due to performance concerns. Fetching product counts for all subcategories in real-time causes too many Shopify API calls. See "Future Improvements" section for database-cached solution.

## Features

### 1. **~~Dynamic Navigation Pills & Mega Menu~~** ⚠️ DISABLED
**Status:** Currently disabled due to performance concerns.

**Why disabled:**
- Fetching real-time product counts for all subcategories causes too many Shopify API calls
- Each category page would make 5-20+ additional API calls
- Risk of hitting Shopify API rate limits
- Slower page load times

**Current behavior:**
- All subcategories show in navigation (including empty ones)
- Empty categories still redirect to parent when visited
- Users see the category link but get redirected if they click it

**Future solution:** See "Database-Cached Product Counts" section below

### 2. **Empty Category Redirects** ↗️
When a user visits a category page with no products, they are automatically redirected up the hierarchy:

- **Sub-subcategory** (e.g., `/horse/tack/freejump-stirrups`) → redirects to **Subcategory** (`/horse/tack`)
- **Subcategory** (e.g., `/horse/supplements`) → redirects to **Category** (`/horse`)
- **Category** (e.g., `/pet`) → redirects to **Homepage** (`/`)

**Important:** Redirects only trigger when:
- The category has 0 products
- No filters are applied (brands, sizes, colors)
- No pagination cursor is present

### 3. **Real-Time Product Counts** 📊
Product counts are fetched dynamically using Shopify's search API:

**File:** `lib/utils/product-counts.ts`

Key functions:
- `getProductCountForCategory()` - Get count for a single category
- `getProductCountsForSubcategories()` - Get counts for multiple subcategories in parallel
- `filterSubcategoriesWithProducts()` - Filter out empty categories

**Performance:**
- Lightweight queries (only fetches count, not full product data)
- Parallel fetching for multiple categories
- ISR caching (15 minutes) via Next.js
- Results in `hasProducts` boolean for fast filtering

## How It Works

### Category Pages

1. **Fetch Products:**
   ```typescript
   const { products, totalCount } = await getProductsByTypes(allowedProductTypes, ...);
   ```

2. **Check for Empty Category:**
   ```typescript
   if (totalCount === 0 && !filterBrands && !filterSizes && !filterColors && !afterCursor) {
     redirect(`/${parentCategory}`); // Redirect to parent
   }
   ```

3. **Fetch Subcategories with Counts:**
   ```typescript
   const subcategories = await getMappingSubcategories(category, subcategory, true);
   // Third parameter `true` enables real product counts
   ```

4. **Render Pills:**
   ```typescript
   <CategoryPills categories={subcategories} basePath={`/${category}`} />
   // Pills component automatically filters out categories with count: 0
   ```

### Navigation Pills Component

```typescript
// Filter out empty categories
const visibleCategories = categories.filter(cat => {
  return cat.count === undefined || cat.count > 0;
});

// Don't render if no visible categories
if (visibleCategories.length === 0) return null;
```

## Files Modified

### Core Logic
- `lib/utils/product-counts.ts` - **NEW** - Product count utilities
- `lib/mapping/collection-mapping.ts` - Updated `getSubcategoriesForCollection()` to support real product counts

### Category Pages
- `app/[category]/page.tsx` - Added empty redirect + dynamic counts
- `app/[category]/[subcategory]/page.tsx` - Added empty redirect + dynamic counts
- `app/[category]/[subcategory]/[product]/page.tsx` - Added empty redirect + dynamic counts

### Components
- `components/CategoryPills.tsx` - Added filtering logic for empty categories
- `components/header/MegaMenu.tsx` - Added filtering logic for empty categories in mega menu

### API Routes
- `app/api/mapping/subcategories-with-images/route.ts` - Updated to fetch real product counts for mega menu

## Behavior Examples

### Example 1: New Empty Category
**Scenario:** You create `/horse/supplements/calming` but haven't added any products yet.

**Result:**
- ✅ Redirect from old URL works: `/collections/calming-supplements` → `/horse/supplements/calming`
- ✅ Visiting `/horse/supplements/calming` redirects to `/horse/supplements`
- ✅ "Calming" pill does NOT appear in `/horse/supplements` navigation
- ✅ Category exists in database and admin panel

### Example 2: Adding First Product
**Scenario:** You add a product with `productType: "Calming Supplements"` to Shopify.

**Result (after 15 min cache expiry or manual revalidation):**
- ✅ `/horse/supplements/calming` now renders normally (no redirect)
- ✅ "Calming" pill appears in `/horse/supplements` navigation
- ✅ Product shows on the category page

### Example 3: Removing Last Product
**Scenario:** You remove the last product from `/horse/supplements/calming`.

**Result (after cache expiry):**
- ✅ `/horse/supplements/calming` redirects to `/horse/supplements`
- ✅ "Calming" pill disappears from navigation
- ✅ Category still exists in database (not deleted)

## Cache Behavior

**ISR Revalidation:** 15 minutes (900 seconds)

This means:
- Changes to product inventory take up to 15 minutes to reflect in navigation
- You can force immediate revalidation by:
  - Visiting the page with `?revalidate=1` (if configured)
  - Deploying a new build
  - Using Next.js revalidation API

## Performance Considerations

### Optimizations
- ✅ Product counts use lightweight Shopify queries (no full product data)
- ✅ Parallel fetching for multiple subcategories
- ✅ ISR caching reduces API calls
- ✅ Counts are fetched server-side (no client-side waterfalls)

### Trade-offs
- ⚠️ Each category page makes additional Shopify API calls for subcategory counts
- ⚠️ 15-minute cache means navigation updates aren't instant
- ⚠️ More API calls = slightly higher Shopify API usage

### Future Improvements - Database-Cached Product Counts

To enable dynamic navigation filtering without performance issues:

#### Recommended Approach:
1. **Add `product_count` column** to `collection_content` table
2. **Create update script** that runs periodically (e.g., every 15 minutes via cron):
   ```typescript
   // Fetch all products from Shopify
   // Group by productType
   // Update product_count for each category in database
   ```
3. **Use database counts** in `getSubcategoriesForCollection()`:
   ```typescript
   // SELECT url_path, product_count FROM collection_content WHERE parent_url = ?
   ```
4. **Update via webhook** (optional): Shopify product create/update/delete webhooks

#### Benefits:
- ✅ No additional Shopify API calls during page render
- ✅ Fast database queries (< 10ms)
- ✅ Can enable dynamic filtering without performance impact
- ✅ Counts stay reasonably up-to-date (15 min refresh)

#### Implementation Priority:
- **Low priority** if most categories have products
- **High priority** if you have many empty categories that confuse users

## Testing

### Manual Testing Checklist

1. **Empty Category Redirect:**
   - [ ] Visit a new empty category → should redirect to parent
   - [ ] Add a product → category should render normally
   - [ ] Remove last product → should redirect again

2. **Navigation Pills:**
   - [ ] Empty categories should not appear in pills
   - [ ] Adding products should make pills appear
   - [ ] Removing products should hide pills

3. **Filters:**
   - [ ] Applying filters on empty category should NOT trigger redirect
   - [ ] Pagination should NOT trigger redirect

4. **Performance:**
   - [ ] Category pages load in < 2 seconds
   - [ ] No console errors
   - [ ] Shopify API rate limits not exceeded

## Troubleshooting

### Pills Not Updating
**Problem:** Added products but pills still don't show.

**Solution:**
- Wait 15 minutes for ISR cache to expire
- Check product `productType` matches category mapping
- Verify product is published and available

### Redirect Loop
**Problem:** Category keeps redirecting even with products.

**Solution:**
- Check `getProductTypesForCollection()` returns correct types
- Verify products have matching `productType` in Shopify
- Check mapping CSV for correct category paths

### Performance Issues
**Problem:** Category pages loading slowly.

**Solution:**
- Check Shopify API response times
- Consider increasing ISR cache time
- Review number of subcategories (many subcategories = many API calls)

## Related Documentation

- `CATEGORY-AUDIT-GUIDE.md` - Category audit and mapping workflow
- `URL-STRUCTURE.md` - URL structure and routing
- `CONTENT-MANAGEMENT-STRATEGY.md` - Content management overview
