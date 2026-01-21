# Shipping Migration Checklist

Use this checklist to track your progress through the shipping migration.

## Pre-Migration

- [ ] Read `SHIPPING-MIGRATION-SUMMARY.md` (overview)
- [ ] Read `SHIPPING-PRICE-UPDATE-GUIDE.md` (detailed steps)
- [ ] Understand why we're updating Shopify backend (single source of truth)
- [ ] Have access to Shopify Admin
- [ ] Know your vendors' shipping costs

## Step 1: Generate Vendor List

- [ ] Run `npm run get-vendors`
- [ ] Check terminal output for vendor list
- [ ] Verify `exports/vendor-shipping-rates-TEMPLATE.csv` was created
- [ ] Review the vendor list - does it look complete?

**Expected Output:**
```
📦 Fetching all unique vendors from database...
✅ Found 156 unique vendors

Vendors:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Vendor Name (XX products)
  ...
```

## Step 2: Configure Vendor Shipping Rates

- [ ] Open `exports/vendor-shipping-rates-TEMPLATE.csv`
- [ ] Fill in `shipping_cost` column for each vendor
- [ ] Add notes if helpful (optional)
- [ ] Save as `exports/vendor-shipping-rates.csv` (remove -TEMPLATE)
- [ ] Double-check formatting (CSV, comma-separated, proper headers)

**CSV Format:**
```csv
vendor,shipping_cost,notes
Ariat,12.50,Clothing items
Acavallo,15.00,Horse gear
```

## Step 3: Configure Tag Overrides (Optional)

Only if you have products requiring different shipping (heavy items, saddles, etc.)

- [ ] Identify products needing special shipping
- [ ] Create `exports/tag-shipping-rates.csv`
- [ ] Define tags and their shipping costs
- [ ] Tag products in Shopify Admin

**CSV Format:**
```csv
tag,shipping_cost,notes
heavy,25.00,Over 5kg
saddles,40.00,Saddles and heavy tack
```

**Or skip this step if all vendors use one rate:**
- [ ] No special shipping needed - using vendor rates only

## Step 4: Export Products from Shopify

- [ ] Go to Shopify Admin → Products
- [ ] Click "Export"
- [ ] Select "All products"
- [ ] Format: CSV for Excel, Numbers, or other spreadsheet
- [ ] Click "Export products"
- [ ] Save file (e.g., `shopify-products-export.csv`)
- [ ] Move file to project directory

**File saved as:** ______________________________

## Step 5: Test with Sample Data (Recommended)

- [ ] Create test CSV with 10-20 products
- [ ] Run: `npm run add-shipping test.csv test-output.csv`
- [ ] Review output for correctness
- [ ] Check that vendor rates applied
- [ ] Check that tag overrides worked (if applicable)
- [ ] Verify calculations are correct

**Or skip testing and go to full run:**
- [ ] Confident - skipping test, running on all products

## Step 6: Run Price Update Script

- [ ] Run: `npm run add-shipping shopify-products-export.csv shopify-updated.csv`
- [ ] Watch terminal output for progress
- [ ] Review summary statistics
- [ ] Note any warnings or errors

**Script Output:**
```
✅ Updated: ____ products
🏷️  Tag overrides: ____ products  
⚠️  No shipping rate: ____ products
⏭️  Skipped: ____ products
```

**Issues to address:**
- [ ] No shipping rate warnings → Add missing vendors to CSV
- [ ] Unexpected skips → Check product data
- [ ] All clear ✅

## Step 7: Review Updated CSV

- [ ] Open `shopify-updated.csv`
- [ ] Spot-check 5-10 products
- [ ] Verify prices increased correctly
- [ ] Check Compare At Price updated (if applicable)
- [ ] Look for any anomalies

**Sample checks:**
- [ ] Vendor with standard rate → correct increase
- [ ] Product with tag override → correct tag rate applied
- [ ] Compare prices → also increased by shipping amount
- [ ] No unexpected changes

## Step 8: Backup Current Data

- [ ] Keep original export as backup
- [ ] Note date/time of export
- [ ] Save copy somewhere safe

**Backup location:** ______________________________

## Step 9: Import to Shopify

- [ ] Go to Shopify Admin → Products
- [ ] Click "Import"
- [ ] Upload `shopify-updated.csv`
- [ ] **IMPORTANT**: Select "Overwrite existing products"
- [ ] Review import preview
- [ ] Click "Import products"
- [ ] Wait for import to complete

**Import started at:** ______________________________
**Import completed at:** ______________________________

## Step 10: Verify in Shopify

- [ ] Check 5-10 products in Shopify Admin
- [ ] Verify prices updated correctly
- [ ] Check products with tags (if using tag overrides)
- [ ] Look for any import errors in Shopify

**Sample product checks:**
1. [ ] Product: _____________ → Price correct ✅
2. [ ] Product: _____________ → Price correct ✅
3. [ ] Product: _____________ → Price correct ✅
4. [ ] Product: _____________ → Price correct ✅
5. [ ] Product: _____________ → Price correct ✅

## Step 11: Sync to Headless Database

- [ ] Run: `npm run db:sync`
- [ ] Wait for sync to complete
- [ ] Verify product count
- [ ] Check for any sync errors

**Expected Output:**
```
✅ Synced ____ products
Duration: ____s
```

## Step 12: Update Marketplace App

- [ ] Go to Marketplace app → Feature Apps
- [ ] Disable "Split Cart" feature
- [ ] Configure free shipping (choose one):
  - [ ] Option A: Shopify Admin → Settings → Shipping → Free
  - [ ] Option B: Marketplace Shipping app → Free for all vendors
- [ ] Verify settings saved

**Reference:** https://marketplace-doc.webkul.com/zenith/Featured-App/Shipping/Marketplace%20Shipping.html

## Step 13: Test Frontend

- [ ] Visit your headless site (theequestrian.vercel.app)
- [ ] Browse products → verify updated prices showing
- [ ] Check product pages → prices correct
- [ ] Add items from different vendors to cart
- [ ] Proceed to checkout
- [ ] Verify single cart (not split)
- [ ] Verify shipping shows as "Free"
- [ ] Complete test order (or stop before payment)

**Frontend tests:**
- [ ] Prices match Shopify ✅
- [ ] Single cart ✅  
- [ ] Free shipping displayed ✅
- [ ] Checkout works ✅

## Step 14: Vendor Dashboard Check

- [ ] Log in to vendor dashboard (or have vendor test)
- [ ] Verify orders appear correctly
- [ ] Check that order splitting still works
- [ ] Confirm vendor can fulfill independently

**Vendor tests:**
- [ ] Vendor sees their orders ✅
- [ ] Can fulfill independently ✅

## Post-Migration

- [ ] Update any price displays on website
- [ ] Add "Free Shipping" messaging/badges
- [ ] Update marketing materials
- [ ] Inform vendors of change
- [ ] Monitor for customer questions
- [ ] Track conversion rate changes

## Documentation

- [ ] Keep this checklist for reference
- [ ] Save vendor-shipping-rates.csv for future updates
- [ ] Save tag-shipping-rates.csv (if used)
- [ ] Document any issues encountered
- [ ] Note date migration completed

**Migration completed:** ______________________________

## Troubleshooting

### Issue: Script shows "No shipping rate for vendor X"
- [ ] Added vendor to `vendor-shipping-rates.csv`
- [ ] Re-ran script

### Issue: Tag override not working  
- [ ] Verified tag in `tag-shipping-rates.csv`
- [ ] Confirmed product has that tag in Shopify
- [ ] Tag name matches exactly (case-insensitive)

### Issue: Import failed
- [ ] Selected "Overwrite existing products" option
- [ ] Checked Shopify import log for errors
- [ ] Verified CSV format is correct

### Issue: Prices didn't sync to headless
- [ ] Ran `npm run db:sync` manually
- [ ] Checked webhook configuration
- [ ] Verified database connection

### Other Issues:
________________________________
________________________________
________________________________

## Rollback (if needed)

If something goes wrong:

- [ ] Go to Shopify Admin → Products → Import
- [ ] Upload original export CSV (your backup)
- [ ] Select "Overwrite existing products"
- [ ] Import to restore original prices
- [ ] Run `npm run db:sync` to sync rollback

## Notes

Use this space for any observations, issues, or reminders:

________________________________
________________________________
________________________________
________________________________
________________________________

---

## Quick Commands

```bash
# Generate vendor list
npm run get-vendors

# Run price update
npm run add-shipping input.csv output.csv

# Sync to database
npm run db:sync

# View database stats
npm run db:stats
```

## Success Criteria

Migration is complete when:

- ✅ All product prices include shipping cost
- ✅ Prices synced to headless database
- ✅ Marketplace app shows free shipping
- ✅ Single cart checkout works
- ✅ Vendors receive orders correctly
- ✅ Frontend displays updated prices
- ✅ Customers see "Free Shipping"

**Status:** ☐ In Progress  ☐ Complete  ☐ Rolled Back
