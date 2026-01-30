# Shopify Price Offset Migration

## Overview

We've built a **new system** that updates Shopify prices directly instead of Webkul prices. This solves the sync conflict issue where Webkul would overwrite our price changes.

## Why the Change?

### Old System (Webkul-based):
```
Vendor Store ($100) → Webkul ($108) → Shopify ($108)
                          ↑
                    Our script updates here
                          ↓
                    Webkul syncs back from vendor ($100)
                          ↓
                    CONFLICT! Price resets to $100
```

### New System (Shopify-based):
```
Vendor Store ($100) → Webkul ($100) → Shopify ($100)
                                            ↓
                                    Our script adds +$8
                                            ↓
                                       Shopify ($108)
                                            ↓
                                    Frontend shows $108
```

**Key Benefit:** Webkul → Shopify is one-way sync. Shopify price changes don't push back to Webkul, so no conflicts!

## Migration Steps

### 1. Rollback Webkul Price Changes ✅ (Ready to run)

First, revert all Webkul prices back to original:

```bash
cd /Users/jonosmmachine/Documents/Cursor/theequestrian/services/webkul-price-offset
npm run rollback
```

**What it does:**
- Reverts ~914 products in Webkul
- Uses audit database to restore original prices
- Takes ~1-2 hours

### 2. Get Shopify Admin API Token

You need a Shopify Admin API access token. See `services/shopify-price-offset/SETUP.md` for detailed instructions.

**Quick steps:**
1. Shopify Admin → Settings → Apps → Develop apps
2. Create new app or use existing
3. Add scopes: `read_products`, `write_products`, `read_inventory`, `write_inventory`
4. Install app and copy access token

### 3. Configure New Service

```bash
cd /Users/jonosmmachine/Documents/Cursor/theequestrian/services/shopify-price-offset
```

Edit `.env` and add your Shopify access token:
```env
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
```

### 4. Initialize Database

```bash
npm run db:init
```

Creates `shopify_price_audit` table (separate from Webkul audit).

### 5. Test with Dry Run

```bash
npm run bulk:dry-run
```

Shows what would be updated without actually changing prices.

### 6. Test on Sample

```bash
npm run verify:sample
```

Updates 10 products (live). Check them on your frontend.

### 7. Run Full Bulk Update

```bash
npm run bulk
```

Updates all ~8,000 products. Takes ~2-3 hours.

## Frontend Changes Already Done ✅

The frontend has been updated to:
- ✅ Remove dynamic shipping calculation
- ✅ Display Shopify prices directly
- ✅ Keep "FREE SHIPPING" badge for marketing

Files updated:
- `components/ProductCard.tsx`
- `components/product/ProductBuyBox.tsx`
- `components/cart/CartPageContent.tsx`

## Webkul Configuration Required

**Important:** Disable price syncing in Webkul Dual Sync:

1. Go to Webkul Admin Panel
2. Configuration → Dual Sync Product
3. **Uncheck "Price" and "Compare At Price"** fields
4. Save

This prevents vendor price changes from overwriting your Shopify prices with shipping included.

## How It Works Going Forward

### When Vendors Update Prices:

1. Vendor updates price in their store: $100 → $90 (sale!)
2. Webkul syncs to Shopify: $90
3. **Webhook detects change** (future enhancement)
4. Script adds shipping offset: $90 + $8 = $98
5. Customer sees: $98 (sale price + shipping)

### For Now (Manual):

Until webhook is set up, you can run bulk updates periodically:

```bash
cd services/shopify-price-offset
npm run bulk
```

## Rollback

If you need to revert everything:

```bash
cd services/shopify-price-offset
npm run rollback
```

This removes all shipping offsets from Shopify prices.

## Files & Locations

### New Service:
- `services/shopify-price-offset/` - New Shopify-based service
- `services/shopify-price-offset/README.md` - Full documentation
- `services/shopify-price-offset/SETUP.md` - Setup guide

### Old Service (Keep for reference):
- `services/webkul-price-offset/` - Old Webkul-based service
- Can be archived after migration is complete

### Shared Resources:
- `vendor-shipping.csv` - Shipping rates (used by both)
- `public/seller-to-vendor-mapping.csv` - Seller mapping (used by both)

## Benefits

✅ No sync conflicts with Webkul
✅ Vendor sales/discounts sync correctly
✅ Simpler architecture (one-way sync)
✅ Full audit trail
✅ Easy rollback
✅ Frontend performance improved (no dynamic calculations)

## Next Steps

1. **Get Shopify API token** (see SETUP.md)
2. **Run Webkul rollback** (revert old changes)
3. **Test new system** (dry-run, then sample)
4. **Deploy to production** (full bulk update)
5. **Set up webhook** (future - for automatic updates)

## Questions?

- Shopify API setup: See `services/shopify-price-offset/SETUP.md`
- Technical details: See `services/shopify-price-offset/README.md`
- Troubleshooting: Check audit database or run with `SHOPIFY_DRY_RUN=true`
