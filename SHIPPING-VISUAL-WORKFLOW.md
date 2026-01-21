# Shipping Migration Visual Workflow

A visual guide to the shipping price update process.

## 🎯 The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT STATE                               │
│  Split Cart + Individual Vendor Shipping Rates                 │
│                                                                  │
│  Customer adds:                                                 │
│    - Ariat shirt ($79.95) → Cart 1 → Shipping: $12.50         │
│    - Acavallo boots ($120) → Cart 2 → Shipping: $15.00        │
│  Total: $227.45                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    MIGRATION PROCESS
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      TARGET STATE                               │
│  Single Cart + Free Shipping (Built into Price)                │
│                                                                  │
│  Customer adds:                                                 │
│    - Ariat shirt ($92.45) → Cart → Shipping: FREE             │
│    - Acavallo boots ($135) → Cart → Shipping: FREE            │
│  Total: $227.45 (same total, better UX!)                       │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 The Process (10 Steps)

```
┌──────────────────┐
│   1. GENERATE    │   npm run get-vendors
│   Vendor List    │   ↓ Creates template CSV
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   2. MAP RATES   │   Fill in: exports/vendor-shipping-rates.csv
│   Vendor →$      │   Example: Ariat,12.50
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   3. TAG ITEMS   │   (Optional) Tag heavy items in Shopify
│   Heavy/Special  │   Create: exports/tag-shipping-rates.csv
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   4. EXPORT      │   Shopify Admin → Products → Export
│   From Shopify   │   Download CSV with all products
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   5. RUN SCRIPT  │   npm run add-shipping input.csv output.csv
│   Update Prices  │   Script adds shipping to each price
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   6. REVIEW      │   Open output CSV
│   Verify Output  │   Spot-check prices look correct
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   7. IMPORT      │   Shopify Admin → Products → Import
│   To Shopify     │   Select "Overwrite existing products"
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   8. SYNC DB     │   npm run db:sync
│   To Headless    │   Updates Neon Postgres database
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│   9. CONFIGURE   │   Disable split cart
│   Marketplace    │   Enable free shipping for all vendors
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  10. TEST & GO   │   Test frontend checkout
│   Live!          │   Verify "Free Shipping" shows
└──────────────────┘
```

## 🔄 How the Script Works

```
INPUT FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. shopify-export.csv
   ┌─────────────────────────────────────┐
   │ Handle    | Title        | Vendor  │ Price  │
   │ shirt-001 | Ariat Shirt  | Ariat   | 79.95  │
   │ boots-002 | Acavallo Boot| Acavallo| 120.00 │
   └─────────────────────────────────────┘

2. exports/vendor-shipping-rates.csv
   ┌─────────────────────────┐
   │ Vendor   | Shipping Cost │
   │ Ariat    | 12.50         │
   │ Acavallo | 15.00         │
   └─────────────────────────┘

3. exports/tag-shipping-rates.csv (optional)
   ┌─────────────────────────┐
   │ Tag      | Shipping Cost │
   │ heavy    | 25.00         │
   │ saddles  | 40.00         │
   └─────────────────────────┘


PROCESSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each product:

  ┌─────────────────────────┐
  │ Read Product            │
  │ - Title                 │
  │ - Vendor                │
  │ - Tags                  │
  │ - Current Price         │
  └──────────┬──────────────┘
             │
             ↓
  ┌─────────────────────────┐
  │ Check Tags First        │ ─── Has "heavy" tag? → Use $25.00
  │ (Highest Priority)      │ ─── Has "saddles" tag? → Use $40.00
  └──────────┬──────────────┘
             │ No tag match
             ↓
  ┌─────────────────────────┐
  │ Use Vendor Rate         │ ─── Ariat → Use $12.50
  │ (Fallback)              │ ─── Acavallo → Use $15.00
  └──────────┬──────────────┘
             │
             ↓
  ┌─────────────────────────┐
  │ Calculate New Price     │
  │ new = old + shipping    │
  │ $79.95 + $12.50 = $92.45│
  └──────────┬──────────────┘
             │
             ↓
  ┌─────────────────────────┐
  │ Write to Output         │
  └─────────────────────────┘


OUTPUT FILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

shopify-updated.csv
   ┌─────────────────────────────────────┐
   │ Handle    | Title        | Vendor  │ Price  │
   │ shirt-001 | Ariat Shirt  | Ariat   | 92.45  │ ← +$12.50
   │ boots-002 | Acavallo Boot| Acavallo| 135.00 │ ← +$15.00
   └─────────────────────────────────────┘

Ready to import back to Shopify!
```

## 🏷️ Priority System

```
WHEN CALCULATING SHIPPING FOR A PRODUCT:

┌─────────────────────────────────────────────┐
│ STEP 1: Check Product Tags                 │
│                                             │
│ Does product have tag in                   │
│ tag-shipping-rates.csv?                     │
│                                             │
│ ✓ YES → Use tag shipping rate             │
│         (HIGHEST PRIORITY)                  │
│                                             │
│ ✗ NO → Continue to Step 2                 │
└───────────────┬─────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────┐
│ STEP 2: Check Vendor Rate                  │
│                                             │
│ Does vendor exist in                        │
│ vendor-shipping-rates.csv?                  │
│                                             │
│ ✓ YES → Use vendor shipping rate          │
│         (FALLBACK)                          │
│                                             │
│ ✗ NO → Skip product with warning          │
└─────────────────────────────────────────────┘

EXAMPLES:

Product A: "Ariat Shirt"
├─ Tags: none
├─ Vendor: Ariat ($12.50)
└─ Result: +$12.50 (vendor rate)

Product B: "Kentucky Heavy Saddle"
├─ Tags: "saddles" ($40.00)
├─ Vendor: Kentucky Horsewear ($18.00)
└─ Result: +$40.00 (tag overrides vendor!)

Product C: "Unknown Vendor Item"
├─ Tags: none
├─ Vendor: Not in CSV
└─ Result: SKIPPED (warning logged)
```

## 📁 File Organization

```
theequestrian/
│
├── 📚 DOCUMENTATION (7 files)
│   ├── SHIPPING-README.md ..................... Master index
│   ├── SHIPPING-SETUP-COMPLETE.md ............. This setup summary
│   ├── SHIPPING-MIGRATION-SUMMARY.md .......... Overview
│   ├── SHIPPING-PRICE-UPDATE-GUIDE.md ......... Step-by-step
│   ├── SHIPPING-QUICK-REFERENCE.md ............ Commands
│   ├── SHIPPING-CHECKLIST.md .................. Task list
│   └── SHIPPING-VISUAL-WORKFLOW.md ............ This file
│
├── 🔧 SCRIPTS (2 files)
│   ├── scripts/get-all-vendors.ts ............. Generate template
│   └── scripts/add-shipping-to-prices.ts ...... Update prices
│
├── ⚙️  CONFIGURATION (in exports/)
│   ├── vendor-shipping-rates.csv .............. YOU FILL THIS
│   ├── tag-shipping-rates.csv ................. Optional
│   ├── vendor-shipping-rates-TEMPLATE.csv ..... Auto-generated
│   └── README-SHIPPING-RATES.md ............... CSV guide
│
└── 📦 PACKAGE.JSON (commands added)
    ├── npm run get-vendors
    └── npm run add-shipping <input> <output>
```

## 💰 Pricing Examples

### Example 1: Standard Vendor Rate

```
BEFORE MIGRATION:
┌────────────────────────────────────────┐
│ Ariat Riding Shirt                    │
│ Price: $79.95                          │
│ Shipping: $12.50 (charged at checkout)│
│ ────────────────────────────────       │
│ Total: $92.45                          │
└────────────────────────────────────────┘

                 ↓ MIGRATION ↓

AFTER MIGRATION:
┌────────────────────────────────────────┐
│ Ariat Riding Shirt                    │
│ Price: $92.45 (includes shipping)     │
│ Shipping: FREE                         │
│ ────────────────────────────────       │
│ Total: $92.45                          │
└────────────────────────────────────────┘

Customer sees: "FREE SHIPPING" ✅
Vendor gets: $92.45 (compensated for shipping) ✅
Same total, better UX! ✅
```

### Example 2: Tag Override for Heavy Item

```
BEFORE MIGRATION:
┌────────────────────────────────────────┐
│ Kentucky Saddle                        │
│ Vendor: Kentucky Horsewear             │
│ Price: $450.00                         │
│ Shipping: $40.00 (heavy item)          │
│ ────────────────────────────────       │
│ Total: $490.00                         │
└────────────────────────────────────────┘

                 ↓ MIGRATION ↓

CONFIGURATION:
vendor-shipping-rates.csv:
  Kentucky Horsewear,18.00  ← Standard rate

tag-shipping-rates.csv:
  saddles,40.00  ← Override for saddles

Product tagged with: "saddles"

                 ↓ RESULT ↓

AFTER MIGRATION:
┌────────────────────────────────────────┐
│ Kentucky Saddle                        │
│ Vendor: Kentucky Horsewear             │
│ Price: $490.00 (tag rate, not vendor!) │
│ Shipping: FREE                         │
│ ────────────────────────────────       │
│ Total: $490.00                         │
└────────────────────────────────────────┘

Used $40.00 (tag) not $18.00 (vendor) ✅
```

### Example 3: Multiple Products in Cart

```
BEFORE MIGRATION: (Split Cart)
┌────────────────────────────────────────┐
│ CART 1 - Ariat                         │
│ Shirt: $79.95 + Shipping: $12.50       │
│ Subtotal: $92.45                       │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ CART 2 - Acavallo                      │
│ Boots: $120.00 + Shipping: $15.00      │
│ Subtotal: $135.00                      │
└────────────────────────────────────────┘
Total: $227.45 (2 separate checkouts)

                 ↓ MIGRATION ↓

AFTER MIGRATION: (Single Cart)
┌────────────────────────────────────────┐
│ SINGLE CART                            │
│ Ariat Shirt: $92.45                    │
│ Acavallo Boots: $135.00                │
│ ────────────────────────────────       │
│ Subtotal: $227.45                      │
│ Shipping: FREE                         │
│ ────────────────────────────────       │
│ Total: $227.45                         │
└────────────────────────────────────────┘

Same total ✅
Better UX ✅
Single checkout ✅
Both vendors still get their orders ✅
```

## 🎯 Success Metrics

```
BEFORE MIGRATION          →     AFTER MIGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cart Experience:
❌ Split carts              →     ✅ Single cart
❌ Multiple checkouts       →     ✅ One checkout
❌ Shipping costs added     →     ✅ "Free Shipping"

Price Display:
❌ $79.95 + $12.50 ship    →     ✅ $92.45 Free Ship
❌ Confusing total          →     ✅ Clear total

Customer Perception:
❌ "Expensive shipping"     →     ✅ "Free Shipping!"
❌ Cart abandonment         →     ✅ Better conversion

Technical:
❌ Multiple data sources    →     ✅ Single source (Shopify)
❌ Manual price management  →     ✅ Automated sync
❌ Price inconsistency      →     ✅ Real-time accuracy
```

## 🚀 Quick Start Commands

```bash
# Step 1: See your vendors
npm run get-vendors

# Step 2: Fill in CSV
# (Open exports/vendor-shipping-rates-TEMPLATE.csv)
# (Save as exports/vendor-shipping-rates.csv)

# Step 3: Export from Shopify
# (Shopify Admin → Products → Export)

# Step 4: Update prices
npm run add-shipping shopify-export.csv shopify-updated.csv

# Step 5: Review output
# (Open shopify-updated.csv, spot-check)

# Step 6: Import to Shopify
# (Shopify Admin → Products → Import)

# Step 7: Sync to database
npm run db:sync

# Done! 🎉
```

## 📖 Documentation Flow

```
START HERE
    ↓
┌─────────────────────────────┐
│ SHIPPING-README.md          │ ← Master index
│ (What docs exist & when     │
│  to use each)               │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ SHIPPING-MIGRATION-         │ ← Why & what
│ SUMMARY.md                  │   (10 min read)
│ (Overview & context)        │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ SHIPPING-PRICE-UPDATE-      │ ← How (detailed)
│ GUIDE.md                    │   (15 min read)
│ (Step-by-step)              │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ SHIPPING-CHECKLIST.md       │ ← Track progress
│ (Task list to check off)    │
└──────────┬──────────────────┘
           │
           ├─────────────────────────┐
           │                         │
           ↓                         ↓
┌──────────────────────┐   ┌──────────────────────┐
│ SHIPPING-QUICK-      │   │ SHIPPING-VISUAL-     │
│ REFERENCE.md         │   │ WORKFLOW.md          │
│ (Command cheat)      │   │ (This file!)         │
└──────────────────────┘   └──────────────────────┘

While filling CSV:
    ↓
┌─────────────────────────────┐
│ exports/README-             │ ← CSV help
│ SHIPPING-RATES.md           │
│ (Configuration guide)       │
└─────────────────────────────┘
```

## ✅ You're Ready!

All tools are set up. Next step:

```bash
npm run get-vendors
```

Then follow `SHIPPING-CHECKLIST.md` to complete the migration!

---

**Questions?** Check `SHIPPING-README.md` for the full documentation index.
