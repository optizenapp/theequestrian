# Draft Orders Setup Complete! ✅

I've implemented the complete Draft Orders checkout flow for your headless store.

## What's Been Created

### 1. Shipping Configuration
**File**: `lib/shipping/rates.ts`
- Maps vendors to shipping costs
- Tag-based overrides for heavy items
- Helper functions to calculate shipping

### 2. Draft Order Creation Logic
**File**: `lib/shopify/draft-orders.ts`
- Creates draft orders with custom prices (base + shipping)
- Calculates totals
- Comprehensive logging

### 3. API Endpoint
**File**: `app/api/checkout/create-draft-order/route.ts`
- POST endpoint to create draft orders
- Validates customer email
- Returns invoice URL

### 4. Checkout Component
**File**: `components/cart/DraftOrderCheckoutButton.tsx`
- Replaces standard Shopify checkout
- Collects customer email
- Creates draft order and redirects to invoice

### 5. Updated Cart Page
**File**: `components/cart/CartPageContent.tsx`
- Now uses DraftOrderCheckoutButton
- Removed cart.checkoutUrl redirect

## Next Steps

### Step 1: Fill in Vendor Shipping Rates (30 min)

Run the vendor list generator:
```bash
npm run get-vendors
```

This will show all your vendors. Then update `lib/shipping/rates.ts`:

```typescript
export const VENDOR_SHIPPING_RATES: Record<string, number> = {
  'Ariat': 12.50,
  'Acavallo': 15.00,
  'Kentucky Horsewear': 18.00,
  'Black Dog': 15.00,
  // ... add all 156 vendors
};
```

### Step 2: Set Up Shopify Admin API (5 min)

Add to `.env.local`:
```bash
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxx
```

**How to get this:**
1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps"
3. Click "Create an app"
4. Name it "Headless Storefront"
5. Go to "Configuration" tab
6. Under "Admin API access scopes", enable:
   - `write_draft_orders`
   - `read_draft_orders`
7. Click "Install app"
8. Copy the Admin API access token

### Step 3: Test the Flow (10 min)

1. Start dev server:
```bash
npm run dev
```

2. Add products to cart

3. Go to cart page

4. Click "Checkout"

5. Enter your email

6. Click "Continue to Payment"

7. You'll be redirected to Shopify invoice page

8. Complete payment (use test mode)

9. Check:
   - Order appears in Shopify
   - Webkul app processes it
   - Vendor receives it

### Step 4: Update Webkul Settings (5 min)

1. Disable Split Cart
2. Set all vendor shipping to FREE
3. Test order splitting still works

## How It Works

### Customer Journey

```
1. Customer browses your headless site
   → Sees: $91.95 FREE SHIPPING

2. Adds to cart
   → Cart stores base price ($79.95) + vendor

3. Clicks "Checkout"
   → Your site asks for email

4. Enters email, clicks "Continue"
   → API calculates: $79.95 + $12 shipping = $91.95
   → Creates draft order with $91.95
   → Sets shipping to $0.00 (FREE)

5. Redirected to Shopify invoice
   → Shows: $91.95 + FREE shipping

6. Completes payment
   → Order created: $91.95

7. Webkul processes
   → Vendor receives: $91.95 ✅
```

### Behind the Scenes

```typescript
// Your API creates draft order
{
  lineItems: [{
    variantId: "gid://shopify/ProductVariant/123",
    quantity: 1,
    originalUnitPrice: "91.95"  // ← Base ($79.95) + Shipping ($12)
  }],
  shippingLine: {
    title: "Free Shipping",
    price: "0.00"                 // ← FREE!
  }
}
```

## File Structure

```
lib/
  shipping/
    rates.ts                      ← Vendor → shipping mapping
  shopify/
    draft-orders.ts               ← Draft order creation
    admin-client.ts               ← Already existed

app/
  api/
    checkout/
      create-draft-order/
        route.ts                  ← API endpoint

components/
  cart/
    DraftOrderCheckoutButton.tsx  ← New checkout button
    CartPageContent.tsx           ← Updated to use new button
```

## Key Benefits

✅ **No price sync conflicts** - Webkul can update prices freely  
✅ **Custom checkout prices** - You control final price (base + shipping)  
✅ **Works with Webkul** - You confirmed Draft Orders work!  
✅ **FREE shipping shown** - Customer sees $0.00 shipping  
✅ **No ongoing costs** - FREE (no API fees)  
✅ **Vendor payouts correct** - They receive full amount  

## Troubleshooting

### "SHOPIFY_ADMIN_ACCESS_TOKEN not set"
→ Add it to `.env.local` (see Step 2 above)

### "Failed to create checkout"
→ Check console logs for detailed error
→ Verify API token has correct permissions

### "Invalid email format"
→ Customer must enter valid email address

### Webkul doesn't see order
→ Verify Draft Orders work (you said they do!)
→ Check order in Shopify Admin
→ Contact Webkul support if needed

## Testing Checklist

- [ ] Vendor shipping rates filled in
- [ ] Admin API token configured
- [ ] Can add products to cart
- [ ] Checkout button shows email input
- [ ] Can enter email and proceed
- [ ] Redirects to Shopify invoice
- [ ] Invoice shows correct price + FREE shipping
- [ ] Can complete test payment
- [ ] Order appears in Shopify
- [ ] Webkul app processes order
- [ ] Vendor receives order
- [ ] Order splitting works (multi-vendor)

## Next: Fill in Shipping Rates!

The only thing left is to map your 156 vendors to their shipping rates.

Run this to see all vendors:
```bash
npm run get-vendors
```

Then update `lib/shipping/rates.ts` with the rates.

**Ready to test!** 🚀
