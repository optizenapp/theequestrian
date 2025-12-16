# Shipping Price Update Guide

## Overview

This guide explains how to add vendor shipping costs to product prices in Shopify, enabling you to offer "Free Shipping" while covering shipping costs in the product price.

## Workflow

```
Shopify Products → Export CSV → Add Shipping → Import CSV → Updated Prices
```

## Step-by-Step Instructions

### 1. Set Up Vendor Shipping Rates

Edit `exports/vendor-shipping-rates.csv` with your vendor shipping costs:

```csv
vendor,shipping_cost
Ariat,15.00
Kerrits,12.50
Dublin,18.00
Kentucky,20.00
```

**Important:**
- Vendor names must match exactly as they appear in Shopify (case-insensitive)
- Shipping costs in dollars (e.g., `15.00` for $15)

### 2. Export Products from Shopify

1. Go to **Shopify Admin** → **Products**
2. Click **Export**
3. Select **All products**
4. Format: **CSV for Excel, Numbers, or other spreadsheet programs**
5. Download the file (e.g., `products_export_2024-12-12.csv`)

### 3. Run the Script

```bash
npx tsx scripts/add-shipping-to-prices.ts products_export_2024-12-12.csv products_import_updated.csv
```

**What it does:**
- Reads your product export
- Looks up shipping cost for each vendor
- Adds shipping to `Variant Price`
- Also updates `Variant Compare At Price` if present
- Outputs a new CSV ready to import

**Example output:**
```
✓ Ariat Show Jacket: $299.00 + $15.00 = $314.00
✓ Kerrits Tights: $89.00 + $12.50 = $101.50
✓ Dublin Boots: $249.00 + $18.00 = $267.00
```

### 4. Review the Output

Open `products_import_updated.csv` and spot-check a few prices to ensure they look correct.

### 5. Import Back to Shopify

1. Go to **Shopify Admin** → **Products**
2. Click **Import**
3. Upload `products_import_updated.csv`
4. **Important:** Select **"Overwrite any current products that have the same handle"**
5. Click **Upload and continue**
6. Review the preview
7. Click **Import products**

### 6. Verify

- Check a few products in Shopify admin to confirm prices updated
- Check your headless site - prices should reflect immediately
- Test checkout to ensure everything works

## Important Notes

### ✅ Pros of This Approach:
- **Single source of truth** - Shopify has the correct price
- **No code changes** - Your headless site automatically shows updated prices
- **Accurate analytics** - Revenue reports are correct
- **Legal compliance** - Display price = checkout price

### ⚠️ Things to Consider:
- **One-time update** - If shipping costs change, you'll need to re-run
- **Vendor changes** - New vendors need to be added to `vendor-shipping-rates.csv`
- **Backup first** - Always export current prices before updating

### 🚫 What NOT to Do:
- Don't modify prices in your Next.js app (display layer)
- Don't show different prices than Shopify charges
- Don't forget to update compare-at prices if products are on sale

## Automation (Optional)

If you frequently update prices, you can:
1. Schedule this script to run weekly
2. Use Shopify webhooks to trigger updates
3. Build an admin UI to manage vendor shipping rates

## Troubleshooting

### "No shipping rate for vendor: X"
- Add the vendor to `exports/vendor-shipping-rates.csv`
- Check vendor name spelling matches Shopify exactly

### Prices look wrong
- Verify shipping costs in CSV are correct
- Check if prices were already updated (don't run twice!)
- Review the output CSV before importing

### Import failed
- Ensure CSV format matches Shopify's export format
- Check for special characters in product titles
- Verify all required columns are present

## Need Help?

The script logs detailed information about:
- How many products were updated
- Which vendors have no shipping rates
- Example price calculations

Review the output carefully before importing!
