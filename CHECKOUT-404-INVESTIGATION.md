# Checkout 404 Issue - Investigation

## Problem

Checkout and "Buy Now" buttons are redirecting to 404 pages on production:
- Example URL: `https://www.theequestrian.com.au/cart/c/hWN8JqVEiFTSK7H6vWo39xj8?key=...`

## Root Cause

The URL format `/cart/c/[id]?key=` indicates this is **NOT** coming from our current code. Our current implementation uses Shopify's `cart.checkoutUrl` which should point to Shopify's native checkout.

### Current Implementation

All checkout buttons use `cart.checkoutUrl` from Shopify Cart API:

1. **Cart Page** (`CartPageContent.tsx` line 325):
   ```tsx
   <a href={cart.checkoutUrl}>Checkout</a>
   ```

2. **Cart Drawer** (`CartDrawer.tsx` line 139):
   ```tsx
   <a href={cart.checkoutUrl}>Checkout</a>
   ```

3. **Buy Now Button** (`BuyNowButton.tsx` line 22):
   ```tsx
   window.location.href = cart.checkoutUrl;
   ```

## Possible Causes

### 1. Old Draft Order URLs Still Cached

The `/cart/c/[id]?key=` format looks like it's from the **old draft order system** that we removed. These URLs might be:
- Cached in browser
- Saved in bookmarks
- Referenced in external links
- Still in Shopify's database

### 2. Shopify Checkout URL Configuration Issue

The `checkoutUrl` from Shopify Cart API might be incorrectly configured to point to a custom checkout URL that doesn't exist.

**Check Shopify Admin**:
1. Go to **Settings** → **Checkout**
2. Verify "Checkout URL" is set to Shopify's native checkout
3. NOT set to a custom/headless checkout URL

### 3. Missing Route Handler

We removed the draft order system but might not have added a redirect for the old URLs.

## Investigation Steps

### Step 1: Check what checkoutUrl Shopify is actually returning

Add console logging temporarily to see the actual URL:

```tsx
// In CartPageContent.tsx line 324
console.log('Cart checkoutUrl:', cart.checkoutUrl);
```

### Step 2: Test with a fresh cart

1. Clear browser cache completely
2. Add a product to cart
3. Click checkout
4. Check what URL it redirects to

### Step 3: Check Shopify Checkout Settings

In Shopify Admin:
1. **Settings** → **Checkout**
2. Look for "Checkout URL" or custom checkout configuration
3. Ensure it's using Shopify's native hosted checkout

### Step 4: Check if it's a permalink issue

The URL format suggests it might be a Shopify "Cart permalink" feature:
- Shopify generates shareable cart links in format `/cart/c/[encoded-cart-id]?key=...`
- These are usually for **sharing carts**, not checkout
- These might be disabled or broken in headless setups

## Solutions

### Solution 1: Add Redirect for Old URLs

Create a catch-all redirect for old draft order URLs:

```typescript
// middleware.ts
if (pathname.startsWith('/cart/c/')) {
  // Redirect to main cart page
  return NextResponse.redirect(new URL('/cart', request.url), 301);
}
```

### Solution 2: Verify Shopify Checkout Configuration

Ensure Shopify Settings → Checkout is configured for headless:
- Use Shopify's hosted checkout
- NOT using custom checkout apps
- Storefront API checkout enabled

### Solution 3: Check Cart API Response

The issue might be that Shopify is returning a malformed `checkoutUrl`. We should:
1. Log the actual URL being returned
2. Validate it before using it
3. Add fallback handling

## Next Steps

1. **Immediate**: Add middleware redirect for `/cart/c/` URLs → `/cart`
2. **Debug**: Add logging to see actual `checkoutUrl` from Shopify
3. **Verify**: Check Shopify Admin checkout settings
4. **Test**: Create fresh cart and verify checkout flow

## Files to Check

- `middleware.ts` - Add redirect
- `components/cart/CartPageContent.tsx` - Checkout button
- `components/cart/CartDrawer.tsx` - Checkout button
- `components/product/BuyNowButton.tsx` - Buy now flow
- Shopify Admin → Settings → Checkout
