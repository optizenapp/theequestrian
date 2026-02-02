# Product URL Fix - January 30, 2026

## Issue

Products were reverting to `/products/{handle}` URLs instead of the expected hierarchical structure `/category/subcategory/product-handle` both in:
- Frontend category/subcategory pages (product cards)
- Product page redirects
- All user-facing links

## Root Cause

The `getProductCanonicalUrl()` and `getProductCanonicalUrls()` functions in `lib/shopify/products.ts` were **NOT using the `primary_collection` metafield** that's stored in Shopify.

### What We Found

1. **Data was correct**: Products in Shopify have the `primary_collection` metafield properly set (e.g., `horse/pads`)
2. **Queries were fetching it**: All Shopify GraphQL queries include the metafield
3. **Functions ignored it**: The URL generation functions only looked at `productType` and never checked the metafield

### The Bug

```typescript
// OLD - Only accepted handle and productType
export function getProductCanonicalUrl(
  product: Pick<ShopifyProduct, 'handle' | 'productType'>
): string {
  const categoryPath = getPrimaryCategoryPath(product.productType); // ❌ Only used productType
  return categoryPath ? `${categoryPath}/${product.handle}` : `/products/${product.handle}`;
}
```

This meant:
- If productType didn't EXACTLY match the mapping → fallback to `/products/`
- Even when the correct `primary_collection` metafield was available

## Solution

Updated both functions to use a priority system:

1. ✅ **First**: Use `primary_collection` metafield if set
2. ✅ **Second**: Derive from `productType` via mapping (fallback for products without metafield)
3. ✅ **Third**: Fallback to `/products/{handle}` (legacy support)

### Changes Made

**File**: `lib/shopify/products.ts`

1. `getProductCanonicalUrl()`: Now accepts `metafield` and checks it first
2. `getProductCanonicalUrls()`: Now accepts `metafield` and checks it first

```typescript
// NEW - Accepts metafield and prioritizes it
export function getProductCanonicalUrl(
  product: Pick<ShopifyProduct, 'handle' | 'productType'> & { metafield?: { value: string } | null }
): string {
  // First priority: Use metafield if set
  if (product.metafield?.value) {
    return `/${product.metafield.value}/${product.handle}`;
  }
  
  // Second priority: Try productType mapping
  const categoryPath = getPrimaryCategoryPath(product.productType);
  if (categoryPath) {
    return `${categoryPath}/${product.handle}`;
  }
  
  // Fallback to /products/{handle}
  return `/products/${product.handle}`;
}
```

## Testing

Created debug script: `scripts/debug-product-url.ts`

Example test result for `waldhausen-esperia-saddle-pad-dressage`:
```
✅ Product Type: "Saddle Cloths"
✅ Mapping exists: /horse/pads
✅ Metafield set: horse/pads
✅ Expected URL: /horse/pads/waldhausen-esperia-saddle-pad-dressage
```

## Impact

After deployment:
- ✅ All product cards on category/subcategory pages will use hierarchical URLs
- ✅ Product pages will redirect to correct canonical URLs
- ✅ Sitemap URLs already correct (were using same functions)
- ✅ SEO: Proper URL structure maintained
- ✅ Backward compatible: Products without metafields fall back to productType mapping

## Files Changed

1. `lib/shopify/products.ts` - Updated URL generation functions
2. `scripts/debug-product-url.ts` - New debug tool

## Next Steps

- Deploy to Vercel
- Verify URLs are correct on live site
- Monitor for any products still falling back to `/products/`
