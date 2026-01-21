# Shipping Migration Documentation

Complete guide for migrating from split-cart with individual vendor shipping to single-cart with free shipping.

## 📚 Documentation Overview

Your shipping migration includes 5 comprehensive guides:

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **SHIPPING-MIGRATION-SUMMARY.md** | High-level overview & context | Start here - understand the "why" |
| **SHIPPING-PRICE-UPDATE-GUIDE.md** | Complete step-by-step guide | Detailed instructions for each step |
| **SHIPPING-QUICK-REFERENCE.md** | Command cheat sheet | Quick lookup while working |
| **SHIPPING-CHECKLIST.md** | Task-by-task checklist | Track your progress |
| **exports/README-SHIPPING-RATES.md** | CSV configuration guide | Help filling in the CSV files |

## 🚀 Quick Start

**New to this project?** Follow this order:

1. **Read**: `SHIPPING-MIGRATION-SUMMARY.md` (5 min)
2. **Read**: `SHIPPING-PRICE-UPDATE-GUIDE.md` (10 min)  
3. **Run**: `npm run get-vendors` (1 min)
4. **Edit**: `exports/vendor-shipping-rates.csv` (30-60 min)
5. **Follow**: `SHIPPING-CHECKLIST.md` to complete migration

**Already started?** Use `SHIPPING-QUICK-REFERENCE.md` for commands.

## 🎯 What This Solves

### The Problem
- Marketplace app uses split cart with vendor shipping rates
- Migrating to headless frontend
- Want to offer "Free Shipping" for better conversions
- Need vendors compensated for shipping costs

### The Solution  
- Add vendor shipping cost to product prices in Shopify
- Sync updated prices to headless database via webhooks
- Set marketplace to free shipping
- Frontend shows "Free Shipping" (prices already include it)

### Why Shopify Backend?
✅ Single source of truth
✅ Shopify checkout shows correct prices  
✅ Real-time sync via webhooks
✅ Inventory and pricing stay accurate

## 🛠️ Tools Provided

### Scripts

```bash
# Generate vendor list template from database
npm run get-vendors

# Add shipping costs to product prices  
npm run add-shipping <input.csv> <output.csv>

# Example:
npm run add-shipping shopify-export.csv shopify-updated.csv

# Sync updated prices to database
npm run db:sync
```

### Configuration Files

```
exports/
  ├── vendor-shipping-rates.csv        ← Required: vendor → shipping rate
  ├── tag-shipping-rates.csv           ← Optional: tag → shipping rate
  └── README-SHIPPING-RATES.md         ← Configuration guide
```

## 📋 Process Overview

```
1. Generate Vendor List
   ↓
2. Map Vendors to Shipping Rates
   ↓
3. Export Products from Shopify
   ↓
4. Run Script to Update Prices
   ↓
5. Review Output CSV
   ↓
6. Import to Shopify
   ↓  
7. Sync to Headless Database
   ↓
8. Update Marketplace Settings
   ↓
9. Test Frontend
```

**Time Required**: ~1-2 hours (mostly mapping vendors to rates)

## 🎨 How It Works

### Priority System

When calculating shipping for a product:

1. **Check tags first** (highest priority)
   - If product has tag "heavy" → use tag rate
   - If product has tag "saddles" → use tag rate
   
2. **Fall back to vendor rate**
   - If no tag match → use vendor default rate
   
3. **Skip if no rate found**  
   - If vendor not in CSV → product skipped with warning

### Example

**vendor-shipping-rates.csv:**
```csv
vendor,shipping_cost,notes
Ariat,12.50,Clothing
Kentucky Horsewear,18.00,Horse gear
```

**tag-shipping-rates.csv:**
```csv
tag,shipping_cost,notes
saddles,40.00,Heavy tack
```

**Results:**
- Ariat shirt (no tags) → $79.95 + $12.50 = $92.45
- Kentucky saddle (tag: "saddles") → $450.00 + $40.00 = $490.00
- Kentucky boots (no tags) → $120.00 + $18.00 = $138.00

## 📖 Documentation Details

### SHIPPING-MIGRATION-SUMMARY.md
- **What**: Overview of the entire migration
- **Why**: Context and rationale
- **When**: Read this first
- **Length**: ~10 min read

**Covers:**
- Why update Shopify backend vs headless only
- What files you're getting
- How the scripts work
- Benefits for customers, vendors, business
- Timeline and effort estimate

### SHIPPING-PRICE-UPDATE-GUIDE.md  
- **What**: Complete step-by-step guide
- **Why**: Detailed instructions for each step
- **When**: Reference while doing the migration
- **Length**: ~15 min read, multiple sections

**Covers:**
- Step 1: Generate vendor list
- Step 2: Fill in shipping rates
- Step 3: Optional tag overrides
- Step 4: Export from Shopify
- Step 5: Run script
- Step 6: Review output
- Step 7: Import to Shopify
- Step 8: Verify
- Step 9: Sync database
- Step 10: Update marketplace app
- Troubleshooting
- Examples

### SHIPPING-QUICK-REFERENCE.md
- **What**: Command cheat sheet
- **Why**: Quick lookup without reading full guide
- **When**: While working, need quick command
- **Length**: 1-page reference

**Covers:**
- All commands with examples
- CSV formats
- Common issues and solutions
- Priority order
- Support chat summary

### SHIPPING-CHECKLIST.md
- **What**: Task-by-task checklist
- **Why**: Track progress, ensure nothing missed
- **When**: Use during migration
- **Length**: Print and check off items

**Covers:**
- Pre-migration prep
- 14 step checklist
- Verification steps
- Troubleshooting per step
- Success criteria
- Rollback procedure

### exports/README-SHIPPING-RATES.md
- **What**: CSV configuration guide  
- **Why**: Help filling in the rate files correctly
- **When**: When creating CSV files
- **Length**: Comprehensive reference

**Covers:**
- File formats and examples
- How priority system works
- Strategy for grouping vendors
- Tag strategy tips
- Common mistakes
- Testing your configuration

## 🔧 Configuration Strategy

### Vendor Rates

Most vendors will have **one standard rate**:

```csv
vendor,shipping_cost,notes
Ariat,12.50,Clothing - lightweight
Acavallo,15.00,Horse gear - medium
Kentucky Horsewear,18.00,Boots & pads - heavier
```

**Grouping tips:**
- Light items (clothing, accessories): $10-12
- Medium items (boots, small gear): $15-18
- Heavy items (large gear, equipment): $20-25

### Tag Overrides

For products within a vendor that need **different shipping**:

```csv
tag,shipping_cost,notes
heavy,25.00,Products over 5kg
bulky,30.00,Large volume items
saddles,40.00,Saddles and heavy tack
oversized,35.00,Items requiring large box
```

**When to use:**
- Vendor sells mix of light and heavy items
- Special handling required (fragile, oversized)
- Specific product categories (saddles, large rugs)

## ✅ Success Criteria

Migration complete when:

- ✅ All products have shipping built into price
- ✅ Prices synced to headless database  
- ✅ Marketplace app set to free shipping
- ✅ Single cart checkout works
- ✅ Vendors still receive their orders
- ✅ Frontend displays "Free Shipping"
- ✅ Checkout totals are correct

## 🆘 Getting Help

### Script Help

Run commands without arguments for usage:

```bash
npm run get-vendors
npm run add-shipping
```

### Common Issues

| Issue | Solution | Documentation |
|-------|----------|---------------|
| "No shipping rate for vendor" | Add to CSV | SHIPPING-PRICE-UPDATE-GUIDE.md → Troubleshooting |
| Tag override not working | Check tag spelling | exports/README-SHIPPING-RATES.md → How It Works |
| Import failed | Select "Overwrite" | SHIPPING-PRICE-UPDATE-GUIDE.md → Step 7 |
| Prices didn't sync | Run db:sync | SHIPPING-QUICK-REFERENCE.md → Commands |

### Support Resources

1. **Script Output**: Detailed error messages and warnings
2. **Documentation**: 5 comprehensive guides
3. **Shopify Support**: For import/marketplace issues  
4. **Marketplace Docs**: https://marketplace-doc.webkul.com/zenith/

## 🔒 Safety

### The Scripts Are Safe

✅ Only read/write CSV files
✅ Don't directly modify Shopify
✅ You control the import step
✅ Can review output before importing
✅ Can revert by importing original CSV

### Before Running

- [ ] Read the guides
- [ ] Test with small subset (10-20 products)
- [ ] Keep backup of original export
- [ ] Review output carefully

### Rollback Plan

If something goes wrong:
1. Import your original product export
2. Or adjust rates and re-run script
3. Or manually fix in Shopify Admin

## 📊 Your Data

Based on your codebase:

- **Products**: 4,409+
- **Vendors**: ~156 unique
- **Product Types**: 120+
- **Database**: Neon Postgres (fast sync)
- **Webhooks**: Real-time updates configured

## 🎯 Next Steps

**Not started yet?**

1. Read `SHIPPING-MIGRATION-SUMMARY.md`
2. Read `SHIPPING-PRICE-UPDATE-GUIDE.md`
3. Open `SHIPPING-CHECKLIST.md`
4. Run `npm run get-vendors`

**Already have vendor list?**

1. Fill in `exports/vendor-shipping-rates.csv`
2. Follow `SHIPPING-CHECKLIST.md`

**Mid-migration?**

1. Use `SHIPPING-QUICK-REFERENCE.md` for commands
2. Check `SHIPPING-CHECKLIST.md` for progress

**Completed?**

1. Keep documentation for future reference
2. Save CSV files for price updates later
3. Share with team for maintenance

## 📁 File Structure

```
theequestrian/
├── SHIPPING-README.md                      ← You are here
├── SHIPPING-MIGRATION-SUMMARY.md           ← Start here
├── SHIPPING-PRICE-UPDATE-GUIDE.md          ← Detailed guide
├── SHIPPING-QUICK-REFERENCE.md             ← Command reference
├── SHIPPING-CHECKLIST.md                   ← Task checklist
│
├── scripts/
│   ├── get-all-vendors.ts                  ← Generate vendor list
│   └── add-shipping-to-prices.ts           ← Update prices
│
└── exports/
    ├── vendor-shipping-rates.csv           ← Your config (required)
    ├── tag-shipping-rates.csv              ← Your config (optional)
    ├── vendor-shipping-rates-TEMPLATE.csv  ← Generated template
    └── README-SHIPPING-RATES.md            ← CSV guide
```

## 🎉 Benefits

### Customers
- Simple "Free Shipping" messaging
- Single cart checkout
- Better UX
- No surprise costs

### Vendors  
- Compensated for shipping
- Still get their orders
- Independent fulfillment
- No workflow changes

### Business
- Competitive pricing presentation
- Higher conversion rates
- Single source of truth
- Real-time sync
- Professional checkout

---

**Ready to start?** → `SHIPPING-MIGRATION-SUMMARY.md`

**Need quick command?** → `SHIPPING-QUICK-REFERENCE.md`

**Doing migration now?** → `SHIPPING-CHECKLIST.md`

**Questions?** → Check the specific guide for your step
