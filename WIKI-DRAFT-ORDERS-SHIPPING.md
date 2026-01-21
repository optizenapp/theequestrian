# Draft Orders Checkout with Dynamic Shipping

## Overview

The Equestrian uses Shopify Draft Orders to implement a custom checkout flow that adds vendor-specific shipping costs to product prices while displaying "FREE SHIPPING" to customers throughout their entire shopping journey.

## Why Draft Orders?

### The Challenge

Our marketplace uses the Webkul MultiVendor app, which constantly syncs vendor prices to Shopify. This created a conflict:
- **Backend price updates** → Webkul overwrites them immediately
- **Frontend-only pricing** → Shopify checkout shows different price (customer confusion)
- **Webkul API** → $15/month fee (rejected)

### The Solution

Shopify Draft Orders allow us to create orders with custom line item prices that override the product's base price, solving all conflicts:
- ✅ Webkul syncs prices freely (no conflicts)
- ✅ Frontend shows final prices (base + shipping)
- ✅ Checkout shows same price (via Draft Order)
- ✅ Vendors receive correct payouts
- ✅ FREE (no API fees)

## How It Works

### Customer Journey

```
1. Browse Products
   → Sees: $87.95 FREE SHIPPING
   (Base: $79.95 + Shipping: $8)

2. Product Page
   → Sees: $87.95 ✓ FREE SHIPPING

3. Add to Cart
   → Cart stores: base price + vendor info

4. View Cart
   → Shows: $87.95 (Shipping: FREE)

5. Click Checkout
   → Enters email

6. System Creates Draft Order
   → Line item: $87.95 (custom price)
   → Shipping: $0.00 (FREE)

7. Redirected to Shopify Invoice
   → Shows: $87.95 + FREE shipping

8. Complete Payment
   → Pays: $87.95

9. Webkul Processes Order
   → Vendor receives: $87.95 ✅
```

### Technical Flow

```
Shopify Backend
├─ Product Price: $79.95 (base - never changes)
├─ Webkul syncs this freely
└─ Shipping: $0 (FREE sitewide)

Frontend
├─ Fetches: $79.95 from Shopify
├─ Calculates shipping: +$8 (vendor rate)
├─ Displays: $87.95 FREE SHIPPING
└─ Cart: Stores base + vendor info

Checkout
├─ Customer clicks "Checkout"
├─ API calculates: $79.95 + $8 = $87.95
├─ Creates Draft Order:
│  ├─ Line item price: $87.95 (custom!)
│  └─ Shipping: $0.00 (FREE)
├─ Redirects to Shopify invoice
└─ Customer pays: $87.95

Order Processing
├─ Shopify: Order created for $87.95
├─ Webkul: Processes order normally
└─ Vendor: Receives $87.95 ✅
```

## Shipping Configuration

### Vendor Rates

26 vendors configured with specific shipping rates:

| Shipping Cost | Vendors |
|--------------|---------|
| **FREE ($0)** | Paddock Blade, The Equestrian, Trailrace |
| **$8** | QJ Riding Wear, Plum Tack, JP Equestrian Fashion, Ippico Equestrian, Top Brands, Little Equine Co, Hitchley & Harrow, Living Horse Tails Jewellery By Monika, EAC Animal Care, Dapple Eq, Thinline Global Australia |
| **$12** | Ascot Saddlery, JNK Collective |
| **$15** | HORSE QUEENED, Tacklet, Shire Saddleworld, Diamond Deluxe Horsewear |
| **$18** | Runaway Equestrian Co., Helmet Brims |

**Default:** $8 for any vendor not in the list

### Tag-Based Overrides

Special shipping rates for tagged products (highest priority):

| Tag | Shipping Cost | Use Case |
|-----|--------------|----------|
| `#HEAVY` | $15 | Ascot Saddlery heavy items |
| `ponyjet` | $15 | The Equestrian ponyjet items |

### Weight-Based Shipping

**CAN Animal Care** uses product weight for shipping calculation:

| Weight Range | Shipping Cost |
|-------------|--------------|
| 0 - 5kg | $15 |
| 5.01 - 10kg | $20 |
| 10.01 - 20kg | $25 |
| 20kg+ | $25 |

### Calculation Priority

The system checks in this order:

1. **Weight-based rules** (if vendor configured & weight available)
2. **Tag overrides** (#HEAVY, ponyjet, etc.)
3. **Vendor flat rates**
4. **Default rate** ($8)

## Implementation

### Core Files

| File | Purpose |
|------|---------|
| `lib/shipping/rates.ts` | Vendor/tag/weight shipping configuration |
| `lib/shipping/calculate-display-price.ts` | Frontend price calculation helper |
| `lib/shopify/draft-orders.ts` | Draft order creation logic |
| `lib/shopify/admin-client.ts` | Shopify Admin API client |
| `app/api/checkout/create-draft-order/route.ts` | API endpoint for checkout |
| `components/cart/DraftOrderCheckoutButton.tsx` | Checkout button component |

### Frontend Price Display

| Component | Changes |
|-----------|---------|
| `components/ProductPrice.tsx` | Shows price + shipping with "FREE SHIPPING" badge |
| `components/ProductCard.tsx` | Product cards show final prices |
| `components/product/ProductBuyBox.tsx` | Product pages show final prices |
| `components/cart/CartPageContent.tsx` | Cart calculates totals with shipping |

### API Endpoint

**POST** `/api/checkout/create-draft-order`

**Request:**
```json
{
  "items": [
    {
      "variantId": "gid://shopify/ProductVariant/123",
      "quantity": 1,
      "price": "79.95",
      "vendor": "Ariat",
      "tags": [],
      "title": "Product Name",
      "weight": 8000
    }
  ],
  "customer": {
    "email": "customer@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "draftOrderId": "gid://shopify/DraftOrder/456",
  "invoiceUrl": "https://theequestrian.myshopify.com/...",
  "total": "87.95"
}
```

## Configuration

### Environment Variables

Already configured in `.env.local`:

```bash
SHOPIFY_STORE_DOMAIN=theequestrian.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxx
```

### Shopify Settings

**Shipping Rates:**
- Set to **FREE ($0)** sitewide
- Location: Shopify Admin → Settings → Shipping and delivery

### Webkul Settings

**Marketplace Configuration:**
- Disable "Split Cart" feature
- Set all vendors to "Free Shipping" in Marketplace Shipping app

## Testing

### Local Testing

```bash
npm run dev
```

### Test Scenarios

1. **Standard Vendor** (Ariat - $8 shipping)
   - Product: $79.95 base
   - Display: $87.95 FREE SHIPPING
   - Checkout: $87.95 + $0 shipping

2. **Free Shipping Vendor** (Paddock Blade - $0 shipping)
   - Product: $79.95 base
   - Display: $79.95 FREE SHIPPING
   - Checkout: $79.95 + $0 shipping

3. **Tag Override** (Ascot Saddlery + #HEAVY - $15 shipping)
   - Product: $79.95 base + #HEAVY tag
   - Display: $94.95 FREE SHIPPING
   - Checkout: $94.95 + $0 shipping

4. **Weight-Based** (CAN Animal Care 8kg - $20 shipping)
   - Product: $45.00 base, 8kg weight
   - Display: $65.00 FREE SHIPPING
   - Checkout: $65.00 + $0 shipping

5. **Multi-Vendor Cart**
   - Item 1: Ariat $87.95
   - Item 2: Paddock Blade $79.95
   - Total: $167.90
   - Webkul splits order correctly ✅

### Console Logs

Watch for these logs during testing:

```
[Shipping] Ariat: → $8.00
[DraftOrder] Product Name: $79.95 + $8.00 = $87.95
[DraftOrder] ✅ Created: gid://shopify/DraftOrder/123
[DraftOrder] Invoice URL: https://...
```

## Maintenance

### Updating Shipping Rates

Edit `lib/shipping/rates.ts`:

```typescript
export const VENDOR_SHIPPING_RATES: Record<string, number> = {
  'Vendor Name': 12.00,  // Update or add vendors
};
```

### Adding Tag Overrides

```typescript
export const TAG_SHIPPING_OVERRIDES: Record<string, number> = {
  'new-tag': 25.00,  // Add new tag-based rates
};
```

### Adding Weight-Based Vendors

```typescript
export const WEIGHT_BASED_VENDORS: Record<string, Array<{ maxWeight: number; cost: number }>> = {
  'New Vendor': [
    { maxWeight: 10, cost: 15.00 },
    { maxWeight: 25, cost: 25.00 },
    { maxWeight: Infinity, cost: 35.00 },
  ],
};
```

## Performance

- **Frontend:** Minimal impact (simple addition calculation)
- **Checkout:** +1 API call (~200-500ms)
- **Database:** No additional queries
- **User Experience:** Negligible impact

## Benefits

✅ **No price conflicts** - Webkul syncs freely  
✅ **Consistent pricing** - Same price throughout journey  
✅ **Free shipping display** - Customer sees $0 shipping  
✅ **Vendor payouts correct** - Full amount including shipping  
✅ **Multi-vendor support** - Order splitting works  
✅ **No monthly fees** - Uses native Shopify API  
✅ **Weight-based shipping** - Accurate for heavy items  
✅ **Tag-based overrides** - Flexible for special cases  

## Documentation

- [Implementation Complete](./IMPLEMENTATION-COMPLETE.md) - Overview
- [Setup Guide](./SETUP-DRAFT-ORDERS.md) - Setup instructions
- [Weight-Based Shipping](./WEIGHT-BASED-SHIPPING.md) - Weight shipping guide
- [Frontend Updates](./FRONTEND-PRICES-UPDATED.md) - Frontend changes
- [Draft Orders Solution](./DRAFT-ORDERS-SOLUTION.md) - Technical deep dive

## Related

- [Shopify Integration](./Shopify-Integration.md)
- [API Routes](./API-Routes.md)
- [Component Library](./Component-Library.md)

---

**Status:** ✅ Production Ready  
**Last Updated:** January 2026  
**Issue:** [#13](https://github.com/optizenapp/theequestrian/issues/13)
