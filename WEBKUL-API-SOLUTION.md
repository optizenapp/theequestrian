# 🚀 POTENTIAL GAME-CHANGER: Webkul Marketplace API

## The Discovery

Your marketplace app (Webkul MultiVendor Marketplace for Shopify) has an API!

**API Base URL**: https://mvmapi.webkul.com

**Source**: https://webkul.com/blog/shopify-multivendor-marketplace-app-api/

## Why This Could Solve Everything

### The Problem We Were Trying to Solve

1. ❌ Frontend-only pricing doesn't work (Shopify checkout uses Shopify prices)
2. ❌ Backend pricing gets overwritten by marketplace app
3. ❌ Can't pass custom prices to Shopify checkout

### The Potential Solution

**Use the Webkul API to create orders with custom prices!**

```typescript
// Instead of Shopify checkout
const order = await webkulAPI.createOrder({
  lineItems: [
    {
      variantId: "variant-123",
      quantity: 1,
      customPrice: 91.95  // Base + shipping! ✅
    }
  ],
  shipping: {
    method: "Free Shipping",
    cost: 0.00
  }
});

// Redirect to payment
window.location.href = order.paymentUrl;
```

## What We Need to Verify

### Critical Questions

1. **Can the API create orders with custom prices?**
   - Need to check API documentation
   - Look for order creation endpoints
   - See if `customPrice` or `originalUnitPrice` is supported

2. **Does it bypass Shopify checkout?**
   - Or does it still use Shopify's cart system?
   - What payment flow does it use?

3. **Does it handle vendor payouts correctly?**
   - Will vendors get the full amount (including shipping)?
   - Does order splitting still work?

4. **What payment methods are supported?**
   - Shopify Payments?
   - Credit cards?
   - PayPal, Afterpay, etc.?

## The API Features (From Documentation)

### What We Know

**From the blog post:**

- **API Version 2** is available
- Admin can generate API credentials for users and sellers
- Has endpoints for:
  - Products (GET, POST, PUT, DELETE)
  - Orders (GET, POST, PUT, DELETE)
  - Account Info (GET, POST, PUT, DELETE)
- Rate limit: 2 API calls per second
- Access token valid for 30 days (sellers) / 1 year (users)

### What We Need to Find Out

**API Documentation Access:**

You need to enable the API feature in your app:
1. Go to **Feature Apps** section
2. Find **Multi-vendor API**
3. Click **ENABLE** (costs $15/month extra)
4. Access the **API Doc** from your admin panel

**Then check the documentation for:**
- Order creation endpoint
- Whether custom pricing is supported
- Payment flow details
- Webhook events

## Potential Implementation

### If API Supports Custom Prices

```typescript
// lib/webkul/client.ts

const WEBKUL_API_BASE = 'https://mvmapi.webkul.com';

async function webkulFetch(endpoint: string, options: RequestInit = {}) {
  const accessToken = process.env.WEBKUL_API_TOKEN;
  
  const response = await fetch(`${WEBKUL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  return response.json();
}

// Create order with custom pricing
export async function createOrderWithCustomPrices(items: CartItem[]) {
  const orderData = {
    lineItems: items.map(item => ({
      variantId: item.variantId,
      quantity: item.quantity,
      // The magic: custom price with shipping included!
      price: item.basePrice + item.shippingCost,
    })),
    shipping: {
      method: 'Free Shipping',
      cost: 0,
    },
    customer: {
      // Customer details
    }
  };
  
  const order = await webkulFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
  
  return order;
}
```

### The Flow

```
1. Customer browses your headless site
   - Sees prices with shipping: $91.95 ✅
   
2. Customer adds to cart
   - Cart stores: base price + shipping cost
   
3. Customer clicks "Checkout"
   - Instead of Shopify checkout...
   - Call Webkul API to create order
   - Pass custom prices (base + shipping)
   
4. Webkul API processes:
   - Creates order with your custom prices ✅
   - Handles payment
   - Splits order by vendor ✅
   - Notifies vendors ✅
   
5. Customer completes payment
   - Via Webkul's payment flow
   
6. Vendor receives order
   - Gets full amount (including shipping) ✅
   - Fulfills as normal ✅
```

## Advantages of This Approach

### vs. Backend Price Updates

| Approach | Webkul API | Backend Updates |
|----------|------------|----------------|
| **Custom Prices** | ✅ YES (if supported) | ❌ Gets overwritten |
| **Vendor Updates** | ✅ Compatible | ❌ Conflicts |
| **Maintenance** | ✅ Code only | ❌ 4400 products + webhooks |
| **Reversible** | ✅ Easy | ❌ Need re-import |
| **Complexity** | Medium | High |

### vs. Frontend-Only

| Aspect | Webkul API | Frontend Only |
|--------|------------|---------------|
| **Checkout Price Match** | ✅ YES | ❌ NO |
| **Vendor Payouts** | ✅ Correct | ❌ Missing shipping |
| **Payment Flow** | ✅ Works | ❌ Broken |

## Next Steps

### 1. Enable the API Feature

In your Shopify admin:
1. Go to Webkul MultiVendor app
2. Navigate to **Feature Apps**
3. Find **Multi-vendor API**
4. Click **ENABLE** ($15/month)

### 2. Generate API Credentials

1. Go to **Multi-vendor API** menu in admin
2. Click **Add User**
3. Fill in details
4. Set permissions for:
   - ✅ Orders (create, read)
   - ✅ Products (read)
   - ✅ Account Info

### 3. Access API Documentation

Once enabled:
1. API Doc link will appear in your admin panel
2. Review all available endpoints
3. Specifically look for:
   - **POST /api/orders** or similar
   - Order creation parameters
   - Whether custom pricing is supported
   - Payment flow details

### 4. Test Order Creation

Create a test order via API:
```bash
curl -X POST https://mvmapi.webkul.com/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lineItems": [{
      "variantId": "gid://shopify/ProductVariant/123",
      "quantity": 1,
      "price": 91.95
    }],
    "shipping": {
      "method": "Free Shipping",
      "cost": 0
    }
  }'
```

### 5. Verify Vendor Payout

1. Place test order with custom price
2. Check vendor dashboard
3. Verify vendor receives full amount
4. Confirm order splitting works

## Questions to Ask Webkul Support

If the API docs aren't clear:

1. **Can we create orders with custom line item prices via the API?**
   - Not Shopify's default prices
   - Our own calculated prices (base + shipping)

2. **What payment methods does API order creation support?**
   - Shopify Payments?
   - Third-party gateways?

3. **How does vendor payout work for API-created orders?**
   - Do they get the custom price we set?
   - Is it the same as regular orders?

4. **Does order splitting work for API orders?**
   - Multiple vendors in one order
   - Each gets their items

5. **Can we customize the checkout/payment page?**
   - Branding?
   - Custom fields?

Contact: http://webkul.uvdesk.com/ or [email protected]

## Implementation Plan (If API Supports It)

### Phase 1: Enable & Explore (1 day)

1. ✅ Enable API feature ($15/month)
2. ✅ Generate credentials
3. ✅ Read full API documentation
4. ✅ Test basic API calls
5. ✅ Verify order creation capabilities

### Phase 2: Prototype (2-3 days)

1. Create Webkul API client
2. Build order creation function
3. Test with one product
4. Verify payment flow
5. Check vendor receives correct amount

### Phase 3: Integrate with Frontend (3-4 days)

1. Update cart to store base + shipping
2. Create checkout handler using Webkul API
3. Replace Shopify checkout with Webkul flow
4. Test full purchase flow
5. Verify order appears in vendor dashboard

### Phase 4: Testing & Launch (2-3 days)

1. Test with multiple vendors
2. Test with different payment methods
3. Verify order splitting
4. Monitor vendor payouts
5. Launch to production

**Total Time**: ~8-11 days (vs. ongoing maintenance nightmare)

## Fallback Plan

If Webkul API doesn't support custom prices:

1. Ask Webkul if they can add it (feature request)
2. Or revert to backend approach with protection webhooks
3. Or explore Draft Orders API (Shopify Plus required)

## Cost Analysis

### Webkul API Approach

- API feature: $15/month
- Development time: 8-11 days one-time
- Maintenance: Minimal (just code)
- **Total Year 1**: $180 + dev cost

### Backend + Protection Approach

- No extra fees
- Development time: 12-15 days one-time
- Maintenance: Ongoing webhook monitoring
- Risk: Marketplace app conflicts
- **Total Year 1**: Just dev cost + risk

## My Recommendation

**TRY THE WEBKUL API FIRST!**

Why:
1. ✅ Designed for your marketplace app
2. ✅ Should handle vendor payouts natively
3. ✅ Cleaner than hacking Shopify prices
4. ✅ Less maintenance than backend approach
5. ✅ $15/month is cheap for the convenience

**Steps:**
1. Enable the API feature TODAY
2. Read the documentation
3. Test order creation with custom prices
4. If it works → implement it
5. If it doesn't → ask Webkul or use backend approach

## Questions for You

1. **Do you already have the Webkul API enabled?**
   - Can you access the API docs?

2. **Can you enable it now?**
   - $15/month extra
   - Would need to test capabilities

3. **Want me to help integrate it?**
   - Once you have API access
   - I can build the client and checkout flow

## The Big Picture

This could be the **perfect solution** because:

```
WEBKUL API APPROACH:
────────────────────────────────────────────────────────
✅ Headless shows: $91.95 (base + shipping)
✅ Cart shows: $91.95
✅ Checkout via Webkul API: $91.95 custom price
✅ Payment: Customer pays $91.95
✅ Vendor receives: $91.95 (includes shipping)
✅ Order splitting: Works (built into Webkul)
✅ Marketplace app: Compatible (it's their API!)

NO PRICE MISMATCH ✅
NO OVERWRITE ISSUES ✅
NO WEBHOOK COMPLEXITY ✅
```

---

**Bottom Line**: Enable the Webkul API and check the docs. If it supports custom order pricing, this could be WAY easier than any of the other approaches we've discussed!

Let me know when you have API access and I'll help you explore the endpoints! 🚀
