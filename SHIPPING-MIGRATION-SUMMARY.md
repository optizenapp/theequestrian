# Shipping Migration Summary

## Overview

You're transitioning from a split-cart marketplace with individual vendor shipping rates to a single-cart system with "Free Shipping" on your headless frontend.

**The Solution**: Add each vendor's shipping cost to their product prices in Shopify backend, then offer "Free Shipping" on the frontend.

## Why Update Prices in Shopify Backend?

✅ **Correct Approach (Recommended)**
- Update prices in Shopify backend
- Prices sync to headless database automatically via webhooks
- Shopify checkout shows correct total
- Single source of truth
- Real-time inventory and pricing stay accurate

❌ **Wrong Approach (Don't Do)**
- Only update prices in headless frontend
- Shopify checkout would show lower prices
- Customer confusion and cart abandonment
- Inventory data and prices would be out of sync

## What You're Getting

### 1. Scripts & Tools

| Script | Purpose | Command |
|--------|---------|---------|
| `get-all-vendors.ts` | Generate vendor list template | `npm run get-vendors` |
| `add-shipping-to-prices.ts` | Add shipping to prices | `npm run add-shipping input.csv output.csv` |

### 2. Configuration Files

| File | Required | Purpose |
|------|----------|---------|
| `exports/vendor-shipping-rates.csv` | ✅ Yes | Maps vendors → shipping costs |
| `exports/tag-shipping-rates.csv` | ⚪ Optional | Overrides for heavy/special items |

### 3. Documentation

| Document | Purpose |
|----------|---------|
| `SHIPPING-PRICE-UPDATE-GUIDE.md` | Complete step-by-step guide |
| `SHIPPING-QUICK-REFERENCE.md` | Quick command reference |
| `exports/README-SHIPPING-RATES.md` | CSV configuration guide |
| `SHIPPING-MIGRATION-SUMMARY.md` | This file - overview |

## Quick Start (5 Steps)

```bash
# 1. Generate vendor list template
npm run get-vendors

# 2. Fill in exports/vendor-shipping-rates.csv with your shipping rates
# (Do this manually in Excel/Sheets)

# 3. Export products from Shopify as CSV

# 4. Run price update script
npm run add-shipping shopify-export.csv shopify-updated.csv

# 5. Import shopify-updated.csv back to Shopify
```

## How It Works

### The Script Process

```
1. Read vendor-shipping-rates.csv
   ↓
2. Read tag-shipping-rates.csv (optional)
   ↓
3. Read Shopify product export
   ↓
4. For each product:
   - Check tags → use tag rate if found
   - Otherwise → use vendor rate  
   - Calculate: new_price = old_price + shipping
   ↓
5. Output updated CSV
   ↓
6. Import to Shopify
   ↓
7. Webhooks sync to headless database
```

### Example Calculation

**Product: Ariat Riding Shirt**
- Current Price: $79.95
- Vendor: Ariat
- Vendor Shipping Rate: $12.50
- New Price: $79.95 + $12.50 = **$92.45**

**Product: Kentucky Heavy Saddle**
- Current Price: $450.00
- Vendor: Kentucky Horsewear
- Tags: "saddles"
- Tag Shipping Rate: $40.00
- New Price: $450.00 + $40.00 = **$490.00**

## Configuration Example

### vendor-shipping-rates.csv
```csv
vendor,shipping_cost,notes
Ariat,12.50,Clothing - lightweight
Acavallo,15.00,Horse gear - medium
Kentucky Horsewear,18.00,Boots and pads - heavier
Black Dog,15.00,Pet treats
Ascot Saddlery,18.00,Mix of items
```

### tag-shipping-rates.csv (optional)
```csv
tag,shipping_cost,notes
heavy,25.00,Products over 5kg
bulky,30.00,Large volume items
saddles,40.00,Saddles and heavy tack
oversized,35.00,Items requiring large box
fragile,18.00,Requires extra packaging
```

## Marketplace App Changes

After updating prices, configure your marketplace app:

### From Support Chat

1. **Disable Split Cart**
   - Go to: Feature Apps section
   - Turn off: Split Cart feature

2. **Enable Free Shipping**
   - Option A: Shopify Admin → Settings → Shipping → Set all to Free
   - Option B: Marketplace Shipping app → Enable free shipping for all vendors

3. **Verify Order Splitting**
   - Customers can add multiple vendors to one cart
   - Each vendor still gets their orders in their dashboard
   - Single checkout experience for customers

**Reference**: https://marketplace-doc.webkul.com/zenith/Featured-App/Shipping/Marketplace%20Shipping.html

## Benefits

### For Customers
- ✅ Single cart checkout (better UX)
- ✅ "Free Shipping" messaging (increases conversions)
- ✅ No surprise shipping costs at checkout
- ✅ Simpler shopping experience

### For Vendors
- ✅ Still compensated for shipping (built into price)
- ✅ Get their orders in their dashboard
- ✅ Can fulfill independently
- ✅ No change to their fulfillment process

### For Your Business
- ✅ Competitive with "free shipping" sites
- ✅ Single source of truth (Shopify backend)
- ✅ Real-time sync to headless frontend
- ✅ Better conversion rates
- ✅ Cleaner, more professional checkout

## Your 4,409 Products

Based on your product export, you have:
- **156 unique vendors** (approximate, run `npm run get-vendors` for exact count)
- **120+ product types**
- **Mix of equestrian, pet, and clothing items**

Most vendors will have 1 standard shipping rate. Heavy items (saddles, large rugs) can use tag-based overrides.

## Timeline

**Estimated Time to Complete:**

| Task | Time |
|------|------|
| Generate vendor list | 1 min |
| Map vendors to shipping rates | 30-60 min |
| Create tag overrides (optional) | 15-30 min |
| Export from Shopify | 2 min |
| Run script | 2 min |
| Review output | 10 min |
| Import to Shopify | 5 min |
| Sync to database | 2 min |
| Update marketplace settings | 5 min |
| **Total** | **~1-2 hours** |

Most time is spent mapping vendors to shipping rates.

## Safety & Testing

### Before Running on All Products

1. ✅ Test with small export (10-20 products)
2. ✅ Verify calculations are correct
3. ✅ Keep backup of original export
4. ✅ Review script output carefully

### The Script is Safe

- ✅ Only reads/writes CSV files
- ✅ Doesn't directly modify Shopify
- ✅ You control the import step
- ✅ Can review output before importing
- ✅ Can revert by importing original CSV

### Rollback Plan

If you need to revert:
1. Import your original product export
2. Or adjust rates in CSV and re-run
3. Or manually adjust in Shopify Admin

## After Migration

Once prices are updated:

### Shopify Backend
- ✅ Prices include shipping
- ✅ Set shipping methods to "Free"
- ✅ Webhooks sync to headless database

### Headless Frontend
- ✅ Shows updated prices (via sync)
- ✅ Displays "Free Shipping" messaging
- ✅ Checkout uses Shopify (correct prices)
- ✅ Real-time inventory and pricing

### Customer Experience
- ✅ Browse products with "Free Shipping"
- ✅ Add to cart from multiple vendors
- ✅ Single checkout
- ✅ No shipping surprises

## Support

### Documentation
- **Full Guide**: `SHIPPING-PRICE-UPDATE-GUIDE.md`
- **Quick Reference**: `SHIPPING-QUICK-REFERENCE.md`
- **CSV Setup**: `exports/README-SHIPPING-RATES.md`

### Script Help
Run scripts without arguments to see usage:
```bash
npm run get-vendors
npm run add-shipping
```

### Common Issues
See "Troubleshooting" section in `SHIPPING-PRICE-UPDATE-GUIDE.md`

## Next Steps

1. Read `SHIPPING-PRICE-UPDATE-GUIDE.md` for detailed instructions
2. Run `npm run get-vendors` to generate your vendor list
3. Fill in shipping rates
4. Export products from Shopify
5. Run the price update script
6. Import back to Shopify

---

**Questions?** Check the guides or review script output for detailed error messages.

**Ready?** Start with: `npm run get-vendors`
