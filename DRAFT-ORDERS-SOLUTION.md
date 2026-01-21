# The REAL Solution: Shopify Draft Orders API

## Why This Is The Answer

Since:
- ❌ Webkul app constantly syncs prices (can't modify Shopify backend)
- ❌ Frontend-only doesn't work (Shopify checkout uses Shopify prices)
- ❌ Webkul API costs $15/month (you don't want to pay)

**We need**: Create orders with custom prices WITHOUT touching Shopify product prices.

**Solution**: Shopify Draft Orders API

## How Draft Orders Work

### Normal Checkout (Doesn't Work For You)

```
1. Add to cart → Shopify creates cart
2. Shopify uses product prices from database ($79.95)
3. Customer clicks checkout
4. Goes to checkout.shopify.com
5. Shows $79.95 (NOT your $91.95!) ❌
```

### Draft Orders (WORKS!)

```
1. Customer clicks "Checkout" on your headless site
2. Your backend creates Draft Order via Admin API
3. YOU set custom price: $91.95 (base + shipping) ✅
4. Draft Order generates invoice URL
5. Customer pays via invoice
6. Order created in Shopify with $91.95 ✅
7. Vendor receives $91.95 ✅
```

## Implementation

### 1. Create Draft Order Function

```typescript
// lib/shopify/draft-orders.ts

interface DraftOrderLineItem {
  variantId: string;
  quantity: number;
  customPrice: number;  // ← This is the key!
  vendor: string;
  title: string;
}

export async function createDraftOrderWithCustomPrices(
  items: DraftOrderLineItem[],
  customer: {
    email: string;
    firstName?: string;
    lastName?: string;
  }
) {
  const DRAFT_ORDER_MUTATION = `
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
          totalPrice
          lineItems(first: 50) {
            edges {
              node {
                title
                quantity
                originalUnitPrice
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // Create draft order with custom prices
  const response = await shopifyAdminFetch({
    query: DRAFT_ORDER_MUTATION,
    variables: {
      input: {
        lineItems: items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          originalUnitPrice: item.customPrice.toFixed(2),  // ← Custom price!
        })),
        shippingLine: {
          title: "Free Shipping",
          price: "0.00"
        },
        email: customer.email,
        customAttributes: [
          {
            key: "_created_via",
            value: "headless_storefront"
          },
          {
            key: "_prices_include_shipping",
            value: "true"
          }
        ],
        note: "Order created via headless storefront with shipping included in prices",
        tags: ["headless", "shipping-included"]
      }
    }
  });

  if (response.draftOrderCreate.userErrors.length > 0) {
    throw new Error(response.draftOrderCreate.userErrors[0].message);
  }

  return response.draftOrderCreate.draftOrder;
}
```

### 2. Update Checkout Flow

```typescript
// app/api/checkout/create/route.ts

export async function POST(request: NextRequest) {
  const { cartItems, customer } = await request.json();
  
  // Calculate prices with shipping
  const lineItems = cartItems.map((item: any) => {
    const basePrice = parseFloat(item.price);
    const shippingCost = getShippingCost(item.vendor, item.tags);
    const totalPrice = basePrice + shippingCost;
    
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      customPrice: totalPrice,  // ← Custom price with shipping!
      vendor: item.vendor,
      title: item.title
    };
  });
  
  // Create draft order
  const draftOrder = await createDraftOrderWithCustomPrices(lineItems, customer);
  
  // Return invoice URL
  return NextResponse.json({
    success: true,
    checkoutUrl: draftOrder.invoiceUrl,
    orderId: draftOrder.id,
    total: draftOrder.totalPrice
  });
}
```

### 3. Frontend Checkout Button

```typescript
// components/cart/CheckoutButton.tsx

'use client';

import { useState } from 'react';
import { useCart } from './cart-context';

export function CheckoutButton() {
  const { cart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  
  async function handleCheckout() {
    setIsLoading(true);
    
    try {
      // Get customer email (from auth or form)
      const customer = {
        email: 'customer@example.com', // Get from your auth
        firstName: 'John',
        lastName: 'Doe'
      };
      
      // Prepare cart items with pricing
      const cartItems = cart?.lines.edges.map(({ node }) => ({
        variantId: node.merchandise.id,
        quantity: node.quantity,
        price: node.merchandise.price.amount,
        vendor: node.merchandise.product.vendor,
        tags: node.merchandise.product.tags || [],
        title: node.merchandise.product.title
      })) || [];
      
      // Create draft order with custom prices
      const response = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems, customer })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to Shopify invoice/payment page
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <button
      onClick={handleCheckout}
      disabled={isLoading}
      className="w-full bg-action text-white py-3 rounded-full"
    >
      {isLoading ? 'Creating checkout...' : 'Proceed to Checkout'}
    </button>
  );
}
```

## How It Works End-to-End

```
1. YOUR HEADLESS SITE
   Customer sees: $91.95 (base + shipping) ✅
   Cart shows: $91.95 ✅
   
2. CUSTOMER CLICKS "CHECKOUT"
   Your API creates Draft Order
   Line item price: $91.95 (custom!) ✅
   Shipping line: $0.00 (Free)
   
3. SHOPIFY INVOICE PAGE
   Shows: $91.95 per item ✅
   Shipping: Free ✅
   Total: $91.95 ✅
   
4. CUSTOMER PAYS
   Payment processed by Shopify ✅
   
5. ORDER CREATED
   Order in Shopify: $91.95 ✅
   Vendor receives: $91.95 ✅
   
6. WEBKUL APP SEES ORDER
   Processes order normally ✅
   Splits by vendor ✅
   Vendor fulfills ✅
```

## Does This Work With Webkul?

**YES!** Because:

1. ✅ **Doesn't touch product prices** (Webkul can sync all it wants)
2. ✅ **Creates real Shopify orders** (Webkul processes them)
3. ✅ **Vendor gets full amount** (order total = price you set)
4. ✅ **Order splitting works** (Webkul handles multi-vendor orders)

## Requirements

### You Need Shopify Admin API Access

Check if you have it:
1. Go to Shopify Admin → Apps
2. Check Webkul app permissions
3. Or create custom app with Admin API access

**Required permissions:**
- `write_draft_orders`
- `read_draft_orders`
- `write_orders` (might be needed)

### API Credentials

```env
# .env.local
SHOPIFY_ADMIN_API_TOKEN=shpat_xxxxx
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_VERSION=2024-01
```

## Testing Checklist

Before going live:

- [ ] Create test draft order via API
- [ ] Verify custom price is used
- [ ] Complete payment on invoice page
- [ ] Check order appears in Shopify
- [ ] Verify Webkul app processes it
- [ ] Confirm vendor receives correct amount
- [ ] Test multi-vendor order (split)
- [ ] Verify order fulfillment works

## Advantages

| Aspect | Draft Orders | Backend Updates | Webkul API |
|--------|--------------|-----------------|------------|
| **Price conflicts with Webkul** | ✅ None | ❌ Constant | ✅ None |
| **Custom pricing** | ✅ Full control | ❌ Gets overwritten | ✅ If supported |
| **Setup complexity** | Medium | High | Low |
| **Ongoing maintenance** | None | High (webhooks) | None |
| **Cost** | FREE | FREE | $15/month |
| **Vendor compatibility** | ✅ Works | ⚠️ Conflicts | ✅ Works |

## Potential Issues

### 1. Customer Experience

**Invoice Page vs. Standard Checkout:**
- Draft orders redirect to invoice payment page
- Slightly different UI than standard checkout
- But still Shopify-branded and secure

**Mitigation:**
- Keep invoice page simple
- Pre-fill customer info
- Make it clear it's secure Shopify payment

### 2. Payment Methods

**Check what's available:**
- Credit cards: Usually ✅
- Shopify Payments: Usually ✅
- PayPal: Might need testing
- Afterpay/Zip: Might not work

**Test all your payment methods!**

### 3. Shopify Plan Limits

**Draft orders might have limits on:**
- Basic Shopify: Might be limited
- Shopify: Usually OK
- Advanced/Plus: Full access

**Check your plan's draft order limits**

## Implementation Timeline

### Day 1: Setup & Testing (4 hours)
- Set up Admin API access
- Create draft order function
- Test with one product
- Verify payment works

### Day 2: Integration (4 hours)
- Build checkout API route
- Update cart checkout button
- Add customer info collection
- Test full flow

### Day 3: Multi-vendor Testing (3 hours)
- Test orders with multiple vendors
- Verify Webkul processes correctly
- Check vendor receives amounts
- Test order splitting

### Day 4: Edge Cases (2 hours)
- Test failed payments
- Test inventory sync
- Test discounts/sales
- Load testing

### Day 5: Polish & Launch (2 hours)
- Improve UX
- Add loading states
- Deploy to production
- Monitor first orders

**Total: ~15 hours over 5 days**

## The Real Question

**Does Webkul properly process Draft Orders?**

You need to test:
1. Create a draft order manually in Shopify
2. Complete payment
3. Check if Webkul app:
   - ✅ Recognizes the order
   - ✅ Splits it by vendor
   - ✅ Credits vendors correctly
   - ✅ Sends vendor notifications

If YES → This solution works perfectly!  
If NO → We need to explore Webkul API ($15/month)

## Next Steps

1. **Test Draft Order with Webkul** (1 hour)
   - Create manual draft order
   - Complete payment
   - Verify Webkul processes it

2. **If successful** → I build the implementation (2-3 days)

3. **If not** → Consider Webkul API or ask them for guidance

Want me to help you test a draft order first?
