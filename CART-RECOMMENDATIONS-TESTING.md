# Testing Smart Cart Recommendations

## Overview
The smart cart recommendations system analyzes items in your cart and suggests relevant products based on product types, brands, and complementary categories.

## How It Works

### 1. Cart ID Synchronization
- Cart ID is stored in **localStorage** (client-side)
- Cart ID is **also synced to cookies** (for server-side access)
- When you add/update/remove items, the cart ID cookie is automatically updated

### 2. Recommendation Logic
When you visit `/cart`, the server:
1. Reads cart ID from cookie
2. Fetches cart data from Shopify
3. Extracts product types, brands, and prices
4. Queries for related products using smart algorithm
5. Scores and ranks recommendations
6. Returns top 4 products

### 3. Auto-Refresh
- Cart page uses `dynamic = 'force-dynamic'` to always fetch fresh data
- When you modify cart items, `router.refresh()` triggers server component re-render
- Recommendations update automatically based on new cart contents

## Testing Steps

### Test 1: Empty Cart
1. Clear your cart completely
2. Visit `/cart`
3. **Expected**: Shows 4 generic/trending products (fallback)

### Test 2: Single Product Type
1. Add a "Horse Rug" product to cart
2. Visit `/cart` or wait for auto-refresh
3. **Expected**: Recommendations include:
   - Other Horse Rugs (same category)
   - Horse Boots (complementary)
   - Horse Care products (complementary)

### Test 3: Multiple Product Types
1. Add products from different categories:
   - 1x Horse Rug
   - 1x Saddle
   - 1x Riding Boot
2. Visit `/cart` or wait for auto-refresh
3. **Expected**: Diverse recommendations across categories:
   - Saddle Pads (complementary to saddle)
   - Horse Boots (complementary to rug)
   - Riding Gloves (complementary to boots)
   - Maximum 2 products per type (diversity)

### Test 4: Brand Affinity
1. Add 2-3 products from same brand (e.g., "Ariat")
2. Visit `/cart`
3. **Expected**: More Ariat products in recommendations (+5 points per match)

### Test 5: Price Range
1. Add expensive products ($100+)
2. Visit `/cart`
3. **Expected**: Recommendations in similar price range (50%-200% of average)

### Test 6: Cart Updates
1. Add a Horse Rug to cart
2. Note the recommendations
3. Add a Saddle to cart
4. **Expected**: Recommendations automatically update to include saddle-related items

## Debugging

### Check Cart Cookie
Open browser DevTools → Application → Cookies → Look for `shopify_cart_id`

### Check Console Logs
Look for these log messages:
```
[CartPage] Fetching smart recommendations for X cart items
[getSmartCartRecommendations] Analyzing cart with X items
[getSmartCartRecommendations] Cart analysis: { productTypes, brands, avgPrice }
[getSmartCartRecommendations] Complementary types: [...]
[getSmartCartRecommendations] Found X candidate products
[getSmartCartRecommendations] Selected: Product Title (score: X, reasons: ...)
[getSmartCartRecommendations] Returning X recommendations with X unique types
```

### Common Issues

#### Issue: Recommendations Not Changing
**Cause**: Cart ID cookie not being set
**Solution**: 
- Check if cookie exists in DevTools
- Try clearing localStorage and cookies, then add items again
- Ensure you're on `/cart` page when testing

#### Issue: Same Products Always Show
**Cause**: Falling back to generic recommendations
**Solution**:
- Check console for error messages
- Verify cart has items with valid productType and vendor fields
- Check if complementary mappings exist for your product types

#### Issue: No Recommendations Show
**Cause**: Query returning no results
**Solution**:
- Check if products exist in those categories
- Verify Shopify API is responding
- Check network tab for failed requests

## Scoring Algorithm Reference

| Factor | Points | Example |
|--------|--------|---------|
| Same product type | +10 | Cart has "Horse Rugs", recommendation is "Horse Rugs" |
| Same brand | +5 | Cart has "Ariat Boots", recommendation is "Ariat Gloves" |
| Complementary category | +8 | Cart has "Saddle", recommendation is "Saddle Pad" |
| Similar price range | +3 | Cart avg $50, recommendation is $40-$100 |
| In stock | +2 | Product is available for sale |

## Complementary Mappings

Key relationships defined in `lib/mapping/complementary-products.ts`:

- **Horse Rugs** → Horse Boots, Horse Care, Horse Grooming
- **Saddles** → Saddle Pads, Girths, Stirrups, Leathers
- **Bridles** → Reins, Bits, Browbands, Nosebands
- **Riding Boots** → Riding Apparel, Jodhpurs, Breeches, Socks
- **Riding Helmets** → Body Protectors, Riding Apparel

See full list in the file.

## Performance

- **Target**: <200ms for recommendations
- **Caching**: Uses existing 15-minute product cache
- **API Calls**: 2-3 Shopify queries max (same type, same brand, complementary)
- **Deduplication**: Happens before scoring to reduce processing

## Next Steps

1. Monitor recommendation click-through rates
2. Track impact on average order value
3. Analyze which complementary mappings perform best
4. Consider A/B testing different scoring weights
5. Add more complementary mappings based on actual purchase patterns
