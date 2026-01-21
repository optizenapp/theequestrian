# ✅ CONFIRMED: Draft Orders Work with Webkul

## Implementation Plan

Since you've confirmed Draft Orders work with Webkul, here's the complete implementation.

## Architecture Overview

```
CUSTOMER JOURNEY:
─────────────────────────────────────────────────────────────
1. Browse headless site
   → Prices shown: $91.95 (base $79.95 + shipping $12)
   
2. Add to cart
   → Cart stores: base price, shipping cost, total
   
3. Click "Checkout"
   → Your API creates Draft Order with total price ($91.95)
   → Shipping line: $0.00 (FREE)
   
4. Redirect to Shopify invoice
   → Shows: $91.95 + FREE shipping
   
5. Customer pays
   → Order created in Shopify: $91.95
   
6. Webkul processes
   → Vendor receives: $91.95 ✅
   → Order splits by vendor ✅
```

## What We're Building

1. **Shipping rate configuration** (vendor → shipping cost mapping)
2. **Draft Order API route** (creates orders with custom prices)
3. **Updated checkout flow** (uses Draft Orders instead of cart.checkoutUrl)
4. **Customer info collection** (email required for draft orders)

## Timeline

- **Day 1**: Shipping configuration + API route (4 hours)
- **Day 2**: Checkout integration (3 hours)
- **Day 3**: Testing (2 hours)
- **Total**: ~9 hours over 3 days

## Files I'll Create

```
lib/
  shipping/
    rates.ts                    ← Vendor shipping rate mapping
    calculator.ts               ← Calculate shipping per product
  shopify/
    admin-client.ts             ← Shopify Admin API client
    draft-orders.ts             ← Draft order creation logic

app/
  api/
    checkout/
      create-draft-order/
        route.ts                ← Main API endpoint

components/
  cart/
    DraftOrderCheckout.tsx      ← New checkout component
  
types/
  checkout.ts                   ← TypeScript types
```

## Step-by-Step Implementation

### Phase 1: Configuration (30 min)

Map vendors to shipping rates.

### Phase 2: Backend (3 hours)

Build Draft Order creation API.

### Phase 3: Frontend (2 hours)

Update checkout button to use Draft Orders.

### Phase 4: Testing (2 hours)

Test full flow end-to-end.

---

**Ready to start?** Let me know and I'll begin building!
