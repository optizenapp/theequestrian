# GMC Feed Audit Workflow

## Overview

This workflow implements the [GMC Headless Feed Audit Runbook](./gmc_headless_feed_audit_runbook.md) with automated scripts for exporting, auditing, and fixing your Google Merchant Center product feed.

## Quick Start

```bash
# Validate taxonomy mappings (run first)
npm run feed:validate-taxonomy

# Export current feed snapshot
npm run feed:export

# Run audit on latest snapshot
npm run feed:audit
```

## What Was Implemented

### Phase 1 — Critical Compliance Audit ✅

- **Variant grouping**: All variants now use correct `item_group_id` (parent product ID)
- **Variant deep links**: All variant links include `?variant=VARIANT_ID` parameter
- **Variant images**: Feed uses variant-specific images when available, with color-matched fallback
- **ID stability**: IDs are deterministic (Shopify GID numeric tail)

### Phase 2 — GMC Diagnostics Scan ⚠️

- Manual diagnostics export required (see below)

### Phase 3 — Free Listings Optimisation ✅

- **Title construction**: `Brand + Title + Color + Size + Material`
- **Google Product Category**: Mapped via `config/gmc-product-category-mapping.csv`
- **Required attributes**: `color`, `size`, `gender`, `age_group`, `material`, `pattern`, `brand`, `gtin`, `mpn`

### Phase 4 — Paid Ads Performance Levers ✅

- **Custom labels**:
  - `custom_label_0`: Price tier (under_50, 50_to_100, over_100)
  - `custom_label_1`: Margin tier (high, medium, low, unknown)
  - `custom_label_2`: Seasonality (summer, winter, spring, autumn, evergreen)
  - `custom_label_3`: Stock pressure (high_stock, low_stock)
  - `custom_label_4`: Performance bucket (bestseller, slow_mover, unknown)
- **GTIN validation**: Checksum validated, extracted from `barcode` field
- **MPN**: Extracted from `sku` field

### Phase 5 — Feed Sampling Audit ✅

- Automated sampling in audit report

### Phase 6 — Technical Source Verification ✅

- Feed generation: `app/api/feeds/gmc/route.ts`
- ID source: Shopify GIDs (numeric tail)
- Update frequency: 15-minute cache, GMC scheduled fetch at 03:00 Australia/Sydney

## Files Modified

### Feed Generation
- `app/api/feeds/gmc/route.ts` - Complete rewrite with all runbook requirements
- `lib/gmc/category-mapping.ts` - Google Product Category mapping logic (returns numeric taxonomy IDs)
- `config/gmc-product-category-mapping.csv` - Product type → Google category ID mappings (99 entries)
- `config/google-product-taxonomy-official.txt` - Official Google taxonomy (5595 categories)

### Data Schema
- `lib/shopify/queries.ts` - Added `sku`, `barcode`, and variant `image` fields
- `types/shopify.ts` - Added `sku` and `barcode` to `ShopifyVariant` type

### Audit Scripts
- `scripts/export-gmc-feed.ts` - Export feed snapshots
- `scripts/audit-gmc-feed.ts` - Run full compliance audit
- `scripts/validate-gmc-taxonomy.ts` - Validate category mappings against official Google taxonomy

### Configuration
- `package.json` - Added `feed:export`, `feed:audit`, and `feed:validate-taxonomy` scripts

## Usage

### 0. Validate Taxonomy Mappings (First Time Setup)

```bash
npm run feed:validate-taxonomy
```

This validates that all category IDs in `config/gmc-product-category-mapping.csv` exist in Google's official taxonomy. Run this:
- After adding new product type mappings
- Before deploying feed changes
- To verify taxonomy compliance

The script will report:
- ✅ Valid mappings with category paths
- ❌ Invalid category IDs not found in official taxonomy
- 📊 Category distribution across top-level categories

### 1. Export Feed Snapshot

```bash
npm run feed:export
```

Saves to:
- `exports/gmc-feed-YYYYMMDD-HHMMSS.xml` (timestamped)
- `exports/gmc-feed-latest.xml` (always current)

### 2. Run Audit

```bash
# Audit latest snapshot
npm run feed:audit

# Audit specific snapshot
npx tsx scripts/audit-gmc-feed.ts --feed exports/gmc-feed-20260207-180755.xml

# Compare with previous snapshot (ID stability check)
npx tsx scripts/audit-gmc-feed.ts \
  --feed exports/gmc-feed-latest.xml \
  --previous exports/gmc-feed-20260207-163239.xml

# Include GMC diagnostics
npx tsx scripts/audit-gmc-feed.ts \
  --feed exports/gmc-feed-latest.xml \
  --diagnostics reports/gmc-diagnostics.json
```

### 3. Review Audit Report

Reports are saved to `reports/gmc-feed-audit-YYYYMMDD-HHMMSS.md` with:
- Pass/Fail status
- Violations by severity (Critical, High, Medium, Low)
- Sample violations with IDs
- Recommended fixes
- Sample corrected field values

## Google Product Category Mapping

Edit `config/gmc-product-category-mapping.csv` to map your product types to Google's taxonomy using **numeric taxonomy IDs**:

```csv
product_type,google_product_category,category_name
Horse Boots,5569,Sporting Goods > Outdoor Recreation > Equestrian > Horse Care > Horse Boots & Leg Wraps
Breeches,5322,Apparel & Accessories > Clothing > Activewear
Helmets,3821,Sporting Goods > Outdoor Recreation > Equestrian > Riding Apparel & Accessories > Equestrian Helmets
```

**Important Notes**:
- Use **numeric taxonomy IDs** (e.g., `5569`) not category paths
- The `category_name` column is optional but helps with readability
- Run `npm run feed:validate-taxonomy` to verify mappings
- Official taxonomy file: `config/google-product-taxonomy-official.txt` (5595 categories)

**Google Taxonomy Reference**: https://support.google.com/merchants/answer/6324436

**Current Mappings**: 99 product types mapped across:
- Sporting Goods (Equestrian): 50 types
- Apparel & Accessories: 26 types  
- Animals & Pet Supplies: 21 types
- Home & Garden: 1 type
- Luggage & Bags: 1 type

## Custom Labels Configuration

Custom labels are auto-populated from:

### Price Tier (custom_label_0)
- Calculated from variant price
- Values: `under_50`, `50_to_100`, `over_100`

### Margin Tier (custom_label_1)
- Extracted from product tags: `margin:high`, `margin:medium`, `margin:low`
- Default: `unknown`

### Seasonality (custom_label_2)
- Detected from product tags: `summer`, `winter`, `spring`, `autumn`/`fall`
- Default: `evergreen`

### Stock Pressure (custom_label_3)
- Based on variant availability
- Values: `high_stock` (available), `low_stock` (out of stock)

### Performance Bucket (custom_label_4)
- Detected from product tags: `bestseller`, `best seller`, `slow`, `slow_mover`, `clearance`
- Default: `unknown`

## GTIN/MPN Configuration

### GTIN (Barcode)
- Source: Shopify variant `barcode` field
- Validation: Checksum validated (8, 12, 13, or 14 digits)
- Invalid barcodes are excluded

### MPN (Manufacturer Part Number)
- Source: Shopify variant `sku` field
- Used when GTIN is not available

## GMC Diagnostics Integration

To include GMC diagnostics in audit reports:

### 1. Export Diagnostics from GMC

1. Go to Google Merchant Center → Products → Diagnostics
2. Export diagnostics data
3. Save as JSON: `reports/gmc-diagnostics.json`

### 2. Format (example)

```json
{
  "imageMismatch": 150,
  "duplicateProducts": 0,
  "landingPageMismatch": 10,
  "structuredDataMismatch": 5,
  "invalidGtin": 20
}
```

### 3. Run Audit with Diagnostics

```bash
npx tsx scripts/audit-gmc-feed.ts \
  --feed exports/gmc-feed-latest.xml \
  --diagnostics reports/gmc-diagnostics.json
```

## Deployment

After verifying fixes locally:

1. Commit changes:
   ```bash
   git add .
   git commit -m "Implement GMC feed audit runbook fixes"
   git push
   ```

2. Deploy to production (Vercel auto-deploys from `main`)

3. Wait for deployment, then export and audit live feed:
   ```bash
   npm run feed:export
   npm run feed:audit
   ```

4. Review new audit report for improvements

## Feed URL

- **Live feed**: `https://www.theequestrian.com.au/api/feeds/gmc`
- **Cache**: 15 minutes
- **GMC fetch schedule**: 03:00 Australia/Sydney (configured in `lib/gmc/content.ts`)

## Troubleshooting

### Audit shows old issues after deployment

- Clear CDN cache or wait 15 minutes for feed cache to expire
- Re-export feed: `npm run feed:export`
- Re-run audit: `npm run feed:audit`

### Missing Google Product Categories

- Check `config/gmc-product-category-mapping.csv` for unmapped product types
- Add missing mappings using Google's taxonomy
- Redeploy

### GTIN/MPN not appearing

- Verify Shopify products have `barcode` or `sku` fields populated
- Check audit report samples for `gtin` and `mpn` values
- Invalid GTINs (bad checksum) are automatically excluded

### Variant images still wrong

- Check Shopify variant images are assigned correctly
- Verify color option names match image alt text or URLs
- Review audit report samples for `image_link` values

## Support

For issues or questions:
1. Review audit report violations
2. Check this documentation
3. Refer to [gmc_headless_feed_audit_runbook.md](./gmc_headless_feed_audit_runbook.md)
