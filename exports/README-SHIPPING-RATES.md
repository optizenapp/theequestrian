# Shipping Rates Configuration

This folder contains CSV files for configuring vendor shipping rates.

## Files

### vendor-shipping-rates.csv (REQUIRED)
Maps each vendor to their default shipping cost.

**Format:**
```csv
vendor,shipping_cost,notes
Vendor Name,15.00,Optional notes
```

**Example:**
```csv
vendor,shipping_cost,notes
Ariat,12.50,Standard clothing items
Acavallo,15.00,Horse gear
Black Dog,15.00,Pet treats and toys
Kentucky Horsewear,18.00,Mix of items
```

### tag-shipping-rates.csv (OPTIONAL)
Overrides vendor rates for products with specific tags.

**Format:**
```csv
tag,shipping_cost
tag-name,25.00
```

**Example:**
```csv
tag,shipping_cost
heavy,25.00
bulky,30.00
oversized,35.00
saddles,40.00
rugs-heavy,28.00
fragile,18.00
```

## How It Works

### Priority System

When calculating shipping for a product:

1. **Check tags first** (highest priority)
   - If product has tag "heavy" → use $25.00
   - If product has tag "saddles" → use $40.00
   - First matching tag wins

2. **Fall back to vendor rate**
   - If no tag match → use vendor's default rate
   - e.g., "Ariat" → $12.50

3. **Skip if no rate found**
   - If vendor not in CSV → product skipped
   - Warning logged in script output

### Example Scenarios

**Scenario 1: Simple vendor rate**
- Product: "Ariat Riding Shirt"
- Vendor: "Ariat"
- Tags: none
- Result: Uses vendor rate ($12.50)

**Scenario 2: Tag override**
- Product: "Kentucky Heavy Saddle Pad"
- Vendor: "Kentucky Horsewear"
- Tags: "saddles, autumn"
- Result: Uses tag rate for "saddles" ($40.00), ignores vendor rate

**Scenario 3: Multiple tags**
- Product: "Fragile Heavy Item"
- Vendor: "Acavallo"
- Tags: "heavy, fragile"
- Result: First matching tag wins ("heavy" = $25.00)

**Scenario 4: No match**
- Product: "Unknown Vendor Product"
- Vendor: "New Vendor"
- Tags: none
- Result: Skipped (vendor not in CSV)

## Creating Your Configuration

### Step 1: Generate Vendor List

Run this command to see all your vendors:

```bash
npm run get-vendors
```

This creates `vendor-shipping-rates-TEMPLATE.csv` with all vendors pre-populated.

### Step 2: Fill in Default Rates

Open the template and add shipping costs:

```csv
vendor,shipping_cost,notes
Ariat,12.50,Clothing - lightweight
Acavallo,15.00,Horse gear - medium weight
Kentucky Horsewear,18.00,Boots and pads
Black Dog,15.00,Pet treats
...
```

### Step 3: Identify Special Cases

Look for products that need different rates:
- Heavy items (saddles, large rugs)
- Bulky items (large equipment)
- Fragile items (requires extra packaging)
- Oversized items (doesn't fit standard boxes)

### Step 4: Create Tag Overrides (if needed)

If you have special cases, create `tag-shipping-rates.csv`:

```csv
tag,shipping_cost
heavy,25.00
bulky,30.00
saddles,40.00
oversized,35.00
rugs-large,28.00
fragile,18.00
```

### Step 5: Tag Products in Shopify

For products needing special shipping:

1. Go to Shopify Admin → Products
2. Filter by vendor or search for heavy items
3. Select products
4. Bulk add tags (e.g., "heavy", "saddles")

## Tips

### Vendor Rate Strategy

**Group by weight/size:**
- Light items (clothing, small accessories): $10-12
- Medium items (boots, small gear): $15-18
- Heavy items (large gear, equipment): $20-25

**Consider product value:**
- Higher value items might need better packaging
- Fragile items need extra protection
- Could justify higher shipping cost

### Tag Strategy

**Keep it simple:**
- Use 4-6 tags maximum
- Clear names: "heavy", "bulky", "oversized", "saddles"
- Avoid vendor-specific tags unless necessary

**Document your tags:**
```csv
tag,shipping_cost,description
heavy,25.00,Products over 5kg
bulky,30.00,Large volume items
saddles,40.00,Saddles and related heavy tack
oversized,35.00,Items requiring large box
fragile,18.00,Requires extra packaging
```

### Common Mistakes

❌ **Don't:**
- Use commas in vendor names without quotes
- Mix up vendor spelling/case
- Forget to save as CSV format
- Skip the header row

✅ **Do:**
- Use exact vendor names from Shopify
- Keep vendor names consistent
- Test with small export first
- Keep backup of original files

## Testing Your Configuration

### 1. Test with sample data

Create a small test export with 10-20 products covering:
- Different vendors
- Products with tags
- Products without tags

### 2. Run the script

```bash
npm run add-shipping test-export.csv test-output.csv
```

### 3. Verify output

Check that:
- Vendor rates applied correctly
- Tag overrides work as expected
- No unexpected skips or errors

### 4. Review summary

Script shows:
```
📊 Summary:
   ✅ Updated: 4320 products
   🏷️  Tag overrides: 89 products
   ⚠️  No shipping rate: 12 products
   ⏭️  Skipped: 77 products
```

If "No shipping rate" > 0, check those vendors in your CSV.

## Updating Rates Later

If you need to change shipping rates after import:

1. Update your CSV files with new rates
2. Export products from Shopify again
3. Re-run the script
4. Import to Shopify (will overwrite)

Or for small changes:
- Update prices manually in Shopify Admin

## File Locations

All shipping rate files live in this folder:

```
exports/
  ├── vendor-shipping-rates.csv          ← Your vendor rates
  ├── tag-shipping-rates.csv             ← Your tag overrides (optional)
  ├── vendor-shipping-rates-TEMPLATE.csv ← Generated template
  └── README-SHIPPING-RATES.md           ← This file
```

## Questions?

See the main guides:
- `SHIPPING-PRICE-UPDATE-GUIDE.md` - Full step-by-step guide
- `SHIPPING-QUICK-REFERENCE.md` - Quick command reference

Or check script output for detailed error messages.
