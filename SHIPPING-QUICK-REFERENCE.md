# Shipping Price Update - Quick Reference

## Commands

```bash
# 1. Generate vendor list template
npm run get-vendors

# 2. Run price update script
npm run add-shipping <input.csv> <output.csv>

# Example:
npm run add-shipping shopify-export.csv shopify-updated.csv

# 3. Sync to database after Shopify import
npm run db:sync
```

## Files You Need

### Required
- `exports/vendor-shipping-rates.csv` - Your vendor → shipping cost mapping

### Optional
- `exports/tag-shipping-rates.csv` - Tag-based overrides for heavy/bulky items

## CSV Format

### vendor-shipping-rates.csv
```csv
vendor,shipping_cost,notes
Ariat,12.50,Standard shipping
Acavallo,15.00,Standard shipping
```

### tag-shipping-rates.csv
```csv
tag,shipping_cost
heavy,25.00
bulky,30.00
saddles,40.00
```

## Workflow

1. **Generate template** → `npm run get-vendors`
2. **Fill in shipping costs** → Edit `exports/vendor-shipping-rates.csv`
3. **Export from Shopify** → Products → Export → CSV
4. **Run script** → `npm run add-shipping input.csv output.csv`
5. **Review output** → Check `output.csv` for correctness
6. **Import to Shopify** → Products → Import → Select "Overwrite"
7. **Sync database** → `npm run db:sync`
8. **Update marketplace app** → Disable split cart, enable free shipping

## What the Script Does

- Reads vendor shipping rates
- Reads tag overrides (optional)
- For each product:
  - Check tags first → use tag rate if found
  - Otherwise → use vendor rate
  - Calculate: `new_price = old_price + shipping`
- Updates both price and compare-at price
- Outputs new CSV ready to import

## Priority Order

1. **Tag-based shipping** (highest priority)
2. **Vendor default shipping** (fallback)
3. **Skip product** (if no rate found)

## Example Output

```
📦 Loading vendor shipping rates...
✅ Loaded 156 vendor shipping rates

🏷️  Loading tag-based shipping overrides...
✅ Loaded 6 tag-based shipping overrides

💰 Calculating new prices...
  ✓ Product A: $79.95 + $12.50 = $92.45 (vendor:"Ariat")
  ✓ Product B: $149.00 + $40.00 = $189.00 (tag:"saddles")

📊 Summary:
   ✅ Updated: 4320 products
   🏷️  Tag overrides: 89 products
   ⚠️  No shipping rate: 12 products
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "No shipping rate for vendor" | Add vendor to `vendor-shipping-rates.csv` |
| Tag override not working | Ensure tag is in `tag-shipping-rates.csv` and product has that tag |
| Import failed | Select "Overwrite existing products" option in Shopify |
| Prices didn't sync | Run `npm run db:sync` manually |

## Safety

- ✅ Script only reads/writes CSVs (doesn't touch Shopify directly)
- ✅ Review output before importing
- ✅ Keep backup of original export
- ✅ Test with small subset first if needed

## Support Chat Summary

From your Webkul support chat:

1. **Disable Split Cart** → Feature Apps section
2. **Enable Free Shipping** → Either:
   - Shopify shipping settings (store-wide), OR
   - Marketplace Shipping feature app (per vendor)
3. **Orders still split** → Each vendor gets their orders in their dashboard

After price update, all products will have shipping built into price, so you can set "Free Shipping" everywhere.

---

**Full documentation**: See `SHIPPING-PRICE-UPDATE-GUIDE.md`
