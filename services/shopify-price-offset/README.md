# Shopify Price Offset Service

This service updates Shopify product prices directly by adding vendor-specific shipping offsets. Unlike the Webkul approach, this updates Shopify prices while keeping Webkul prices at their original vendor values.

## How It Works

```
Vendor Store ($100) 
     ↓
 Webkul ($100) ← Original price stays here
     ↓ (one-way sync)
 Shopify ($100) ← Synced from Webkul
     ↓
This Script adds +$8
     ↓
 Shopify ($108) ← Final customer price
     ↓
Headless Frontend shows $108
```

## Features

- ✅ Updates Shopify prices directly (not Webkul)
- ✅ Vendor-specific shipping rates
- ✅ Tag-based overrides (e.g., #HEAVY items)
- ✅ Weight-based rates (future)
- ✅ Dry-run mode for testing
- ✅ Full audit logging
- ✅ Rollback capability
- ✅ Rate limiting (2 req/sec)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables:**
   ```env
   SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your-admin-api-access-token
   DATABASE_URL=postgresql://...
   ```

4. **Initialize database:**
   ```bash
   npm run db:init
   ```

## Usage

### Dry Run (Test Mode)
Test without updating any prices:
```bash
npm run bulk:dry-run
```

### Sample Test (10 Products)
Test on 10 products:
```bash
npm run verify:sample
```

### Full Bulk Update
Update all products:
```bash
npm run bulk
```

### Rollback
Revert all prices to original Shopify prices:
```bash
npm run rollback
```

## Shopify Admin API Setup

You need a Shopify Admin API access token with these permissions:

- `read_products`
- `write_products`
- `read_inventory`
- `write_inventory`

### Create Access Token:

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps"
3. Create a new app
4. Configure Admin API scopes (permissions above)
5. Install app and copy the access token

## Shipping Rate Configuration

Rates are loaded from CSV files:

- `vendor-shipping.csv` - Vendor rates, tag overrides, weight-based rules
- `seller-to-vendor-mapping.csv` - Maps Webkul seller IDs to vendor names

## Audit Database

All price changes are logged to `shopify_price_audit` table:

- Original Shopify price
- Adjusted price (with shipping)
- Shipping offset applied
- Vendor name
- Tags matched
- Timestamp

This enables:
- Full rollback capability
- Price change history
- Debugging and verification

## Integration with Webkul Sync

This service is designed to work alongside Webkul's dual sync:

1. Vendors update prices in their stores
2. Webkul syncs to Shopify (original price)
3. **This service adds shipping offset** to Shopify
4. Customers see final price on frontend

## Important Notes

- ⚠️ Shopify → Webkul sync should be **disabled** for prices
- ⚠️ Only Webkul → Shopify sync should be enabled
- ⚠️ This prevents price conflicts and loops
- ⚠️ Run rollback before switching between systems
