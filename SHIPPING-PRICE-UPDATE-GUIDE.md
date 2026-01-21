# Shipping Price Update Guide

This guide will help you add shipping costs to product prices in Shopify, enabling a "Free Shipping" model on your headless frontend.

## Overview

**Goal**: Add each vendor's shipping cost to their product prices in Shopify, so you can offer "Free Shipping" on the frontend while vendors still get compensated for shipping.

**Approach**: 
1. Generate a vendor list from your database
2. Map each vendor to their shipping rate(s)
3. Export products from Shopify
4. Run the script to update prices
5. Import updated prices back to Shopify

## Step-by-Step Instructions

### Step 1: Generate Vendor List Template

Run this command to create a CSV template with all your vendors:

```bash
npm run get-vendors
```

This will:
- Query your database for all unique vendors
- Show you how many products each vendor has
- Create `exports/vendor-shipping-rates-TEMPLATE.csv`

### Step 2: Fill in Shipping Rates

Open `exports/vendor-shipping-rates-TEMPLATE.csv` and fill in the `shipping_cost` column:

**Example:**

```csv
vendor,shipping_cost,notes
Acavallo,15.00,254 products - Standard shipping
Ariat,12.50,423 products - Standard shipping
Ascot Saddlery,18.00,1205 products - Mix of items
Black Dog,15.00,204 products - Pet treats
...
```

**Tips:**
- Most vendors will have 1 standard rate
- For vendors with heavy items, you can use tag-based overrides (see Step 3)
- The `notes` column is optional - just for your reference

Save the file as `exports/vendor-shipping-rates.csv` (remove `-TEMPLATE` from filename).

### Step 3: (Optional) Create Tag-Based Shipping Overrides

If some products within a vendor's catalog have different shipping (e.g., heavy items), create `exports/tag-shipping-rates.csv`:

```csv
tag,shipping_cost
heavy,25.00
bulky,30.00
oversized,35.00
fragile,18.00
saddles,40.00
rugs-heavy,28.00
```

**How it works:**
- Tags are checked first (highest priority)
- If a product has a matching tag, that shipping rate is used
- Otherwise, the vendor's default rate is used

**To add tags to products:**
1. Go to Shopify Admin → Products
2. Filter by vendor
3. Select products that need special shipping
4. Bulk add tags like "heavy" or "bulky"

### Step 4: Export Products from Shopify

1. Go to **Shopify Admin** → **Products**
2. Click **Export**
3. Export **All products** in **CSV** format
4. Save the file in your project (e.g., `shopify-products-export.csv`)

### Step 5: Run the Price Update Script

```bash
npm run add-shipping shopify-products-export.csv shopify-products-updated.csv
```

Or with full path:

```bash
npx tsx scripts/add-shipping-to-prices.ts shopify-products-export.csv shopify-products-updated.csv
```

**What it does:**
1. Reads your product export
2. Reads vendor shipping rates from `exports/vendor-shipping-rates.csv`
3. Reads tag shipping overrides from `exports/tag-shipping-rates.csv` (if exists)
4. For each product:
   - Checks if product has a tag with shipping override → use that rate
   - Otherwise, uses vendor's default shipping rate
   - Adds shipping cost to price: `new_price = old_price + shipping_cost`
   - Also updates "Compare At Price" if present
5. Outputs `shopify-products-updated.csv`

**Example output:**

```
🚀 Starting price update process...

📦 Loading vendor shipping rates...
✅ Loaded 156 vendor shipping rates

🏷️  Loading tag-based shipping overrides...
✅ Loaded 6 tag-based shipping overrides

📥 Reading product export: shopify-products-export.csv
✅ Loaded 4409 product rows

💰 Calculating new prices...
  ✓ Ariat Auburn Baselayer: $79.95 + $12.50 = $92.45 (vendor:"Ariat")
  ✓ Heavy Saddle Pad: $149.00 + $40.00 = $189.00 (tag:"saddles")
  ✓ Dog Toy: $12.99 + $15.00 = $27.99 (vendor:"Black Dog")
  ...

📊 Summary:
   ✅ Updated: 4320 products
   🏷️  Tag overrides: 89 products
   ⚠️  No shipping rate: 12 products
   ⏭️  Skipped: 77 products

💾 Writing updated CSV: shopify-products-updated.csv

✅ Done! Import shopify-products-updated.csv back to Shopify to update prices.
```

### Step 6: Review the Updated CSV

Open `shopify-products-updated.csv` and spot-check some prices:

- Verify prices increased by the correct amount
- Check that heavy/special items used tag overrides
- Look for any products that were skipped or had warnings

### Step 7: Import Back to Shopify

1. Go to **Shopify Admin** → **Products**
2. Click **Import**
3. Upload `shopify-products-updated.csv`
4. **Important**: Select **"Overwrite existing products"** option
5. Click **Import**
6. Wait for import to complete (may take a few minutes for 4400+ products)

### Step 8: Verify in Shopify

1. Check a few products in Shopify Admin
2. Verify prices were updated correctly
3. Check products with tags to ensure overrides worked

### Step 9: Sync to Headless Database

Once prices are updated in Shopify, sync them to your headless database:

```bash
npm run db:sync
```

This will pull the updated prices into your Neon Postgres database.

### Step 10: Update Marketplace App Settings

As per your support chat, you need to:

1. Disable "Split Cart" feature in the marketplace app
2. Enable free shipping for all vendors in the marketplace app settings
3. Or set up free shipping in Shopify shipping settings

**Reference**: https://marketplace-doc.webkul.com/zenith/Featured-App/Shipping/Marketplace%20Shipping.html

## Important Notes

### Price Storage Strategy

**✅ Correct approach (what you're doing):**
- Update prices in Shopify backend
- Prices sync to headless database via webhooks
- Single source of truth

**❌ Don't do this:**
- Only update prices in headless database
- Shopify checkout would show different (lower) prices
- Customers would be confused

### Backup & Safety

Before importing to Shopify:
1. Export your current products as backup
2. Review the updated CSV carefully
3. Test with a small subset first if nervous

### Webhooks

Your project has real-time webhooks set up. After you update prices in Shopify:
- Webhooks will automatically sync changes to Neon database
- No manual sync needed (though you can run `npm run db:sync` to be sure)

### Reverting Changes

If you need to revert:
1. Keep your original export file
2. Import it back to Shopify (it has the old prices)
3. Or manually adjust shipping rates in the CSV and re-run

## Troubleshooting

### "No shipping rate for vendor: X"

**Solution**: Add that vendor to `exports/vendor-shipping-rates.csv`

### Tag override not working

**Checklist**:
- Tag is in `exports/tag-shipping-rates.csv`
- Tag name matches exactly (case-insensitive)
- Product has that tag in Shopify
- Tag CSV file is in `exports/` folder

### Price didn't update in Shopify

**Checklist**:
- Selected "Overwrite existing products" during import
- Wait for import to complete fully
- Check Shopify import log for errors
- Verify the Handle column matches between export and import

### Products skipped

Products are skipped if:
- No Vendor specified
- No matching shipping rate found
- Invalid price format

Check the script output for specific warnings.

## Examples

### Standard vendor (all products same shipping)

```csv
vendor,shipping_cost,notes
Ariat,12.50,All items standard shipping
```

### Vendor with heavy items using tags

1. Add vendor default rate:
```csv
vendor,shipping_cost,notes
Kentucky Horsewear,15.00,Most items
```

2. Add tag override:
```csv
tag,shipping_cost
kentucky-heavy,28.00
```

3. Tag heavy products in Shopify with "kentucky-heavy"

### Mix of both

`vendor-shipping-rates.csv`:
```csv
vendor,shipping_cost,notes
Acavallo,15.00,254 products
Ariat,12.50,423 products
Ascot Saddlery,18.00,1205 products
```

`tag-shipping-rates.csv`:
```csv
tag,shipping_cost
heavy,25.00
bulky,30.00
saddles,40.00
```

Products will use:
- Tag rate if they have "heavy", "bulky", or "saddles" tag
- Vendor rate otherwise

## Summary

1. ✅ **npm run get-vendors** - Generate template
2. ✅ Fill in `exports/vendor-shipping-rates.csv`
3. ✅ (Optional) Create `exports/tag-shipping-rates.csv`
4. ✅ Export products from Shopify
5. ✅ **npm run add-shipping input.csv output.csv**
6. ✅ Review output CSV
7. ✅ Import to Shopify
8. ✅ Verify prices
9. ✅ **npm run db:sync**
10. ✅ Update marketplace app settings

Your headless frontend can now truthfully show "Free Shipping" 🎉

## Questions?

Check the script output for detailed logs and error messages. The script is designed to be safe and provide clear feedback about what it's doing.
