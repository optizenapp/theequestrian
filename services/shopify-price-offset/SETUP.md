# Setup Guide

## Step 1: Install Dependencies

```bash
cd /Users/jonosmmachine/Documents/Cursor/theequestrian/services/shopify-price-offset
npm install
```

## Step 2: Get Shopify Admin API Access Token

### Option A: Use Existing Shopify App (if you have one)
1. Go to your Shopify Admin
2. Settings → Apps and sales channels → Develop apps
3. Click on your existing app
4. Copy the Admin API access token

### Option B: Create New Shopify App
1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → "Create an app"
3. Name it "Price Offset Service"
4. Go to "Configuration" tab
5. Click "Configure" under Admin API integration
6. Select these scopes:
   - `read_products`
   - `write_products`
   - `read_inventory`
   - `write_inventory`
7. Click "Save"
8. Go to "API credentials" tab
9. Click "Install app"
10. Copy the "Admin API access token"

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
SHOPIFY_STORE_DOMAIN=theequestrian.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
VENDOR_RATES_CSV=../../vendor-shipping.csv
SELLER_MAPPING_CSV=../../public/seller-to-vendor-mapping.csv
SHOPIFY_RATE_LIMIT_PER_SEC=2
SHOPIFY_DRY_RUN=false
```

## Step 4: Initialize Database

```bash
npm run db:init
```

This creates the `shopify_price_audit` table.

## Step 5: Test with Dry Run

```bash
npm run bulk:dry-run
```

This will:
- Fetch all products from Shopify
- Calculate shipping offsets
- Show what would be updated
- **NOT actually update any prices**

Review the output to verify calculations are correct.

## Step 6: Test on Sample Products

```bash
npm run verify:sample
```

This updates only 10 products (live). Check them on your frontend to verify.

## Step 7: Run Full Bulk Update

Once you're confident:

```bash
npm run bulk
```

This will update all products. Takes ~2-3 hours for 8,000 products.

## Troubleshooting

### "Shopify API 401: Unauthorized"
- Check your `SHOPIFY_ACCESS_TOKEN` is correct
- Verify the app is installed on your store
- Ensure the token has required scopes

### "Shopify API 429: Too Many Requests"
- Increase `SHOPIFY_RATE_LIMIT_PER_SEC` (try 1 instead of 2)
- The script will automatically retry with rate limiting

### "No shipping offset found"
- Check `vendor-shipping.csv` has the vendor name
- Verify vendor name matches exactly (case-insensitive)
- Check `seller-to-vendor-mapping.csv` if using Webkul seller IDs

## Rollback

If you need to revert all changes:

```bash
npm run rollback
```

This reverts all Shopify prices back to their original values (before shipping offset was added).
