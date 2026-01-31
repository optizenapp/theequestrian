# Vendor Shipping Rates - Postgres Migration Complete

## ✅ What Was Done

Migrated vendor shipping rates from CSV to Postgres for better management and real-time updates.

## 📁 Files Created

### Database Schema
- `lib/db/schema/vendor-shipping-rates.sql` - Table definitions

### Library Code
- `lib/shipping/rates.ts` - Centralized rate loading and resolution
- `services/shopify-price-offset/src/db/rates.ts` - Rate loading for bulk scripts

### Migration Scripts
- `scripts/init-vendor-shipping-tables.ts` - Create tables
- `scripts/migrate-vendor-rates-to-postgres.ts` - Import CSV data

## 📊 Database Tables

### `vendor_shipping_rates`
Stores shipping rates for each vendor:
- `vendor_name` - Vendor name (unique)
- `base_rate` - Base shipping cost
- `tag_overrides` - JSONB of tag-specific rates
- `weight_tiers` - JSONB for weight-based pricing
- `active` - Enable/disable vendors
- `notes` - Admin notes

### `shipping_tag_rates`
Global tag-based rates (fallback):
- `tag` - Tag name (unique)
- `rate` - Shipping cost
- `active` - Enable/disable tags

## 🔄 Updated Components

### Webhooks
✅ `app/api/webhooks/shopify/price-offset/route.ts` - New webhook (Postgres)
✅ `app/api/webhooks/shopify-product-update/route.ts` - Old webhook (Postgres)

### Bulk Scripts
✅ `services/shopify-price-offset/src/jobs/bulk.ts` - Reads from Postgres
✅ `services/shopify-price-offset/src/jobs/bulk-test-10.ts` - Reads from Postgres

## 🚀 How to Run Migration

### Step 1: Create Tables
```bash
npm run shipping:init
```

### Step 2: Import CSV Data
```bash
npm run shipping:migrate
```

### Step 3: Verify Data
Check the database:
```sql
SELECT * FROM vendor_shipping_rates WHERE active = true;
SELECT * FROM shipping_tag_rates WHERE active = true;
```

### Step 4: Deploy
Push to production and the webhooks will automatically use Postgres.

## 📝 Managing Rates

### Add New Vendor
```sql
INSERT INTO vendor_shipping_rates (vendor_name, base_rate, active)
VALUES ('New Vendor', 10.00, true);
```

### Update Rate
```sql
UPDATE vendor_shipping_rates
SET base_rate = 12.00
WHERE vendor_name = 'Ascot Saddlery';
```

### Add Tag Override for Vendor
```sql
UPDATE vendor_shipping_rates
SET tag_overrides = '{"#HEAVY": 15.00, "ponyjet": 15.00}'
WHERE vendor_name = 'The Equestrian';
```

### Disable Vendor
```sql
UPDATE vendor_shipping_rates
SET active = false
WHERE vendor_name = 'Old Vendor';
```

## 🎯 Benefits

1. **Real-time Updates** - Change rates without redeploying
2. **Admin UI Ready** - Can build management interface
3. **Audit Trail** - Track changes with `updated_at`
4. **Validation** - Database constraints prevent errors
5. **Performance** - Cached for 15 minutes
6. **Scalability** - Easy to add complex rules

## 🔄 Cache Management

Rates are cached for 15 minutes. To invalidate:

```typescript
import { invalidateCache } from '@/lib/shipping/rates';
invalidateCache();
```

## 📋 Next Steps (Optional)

1. **Build Admin UI** - Create `/admin/shipping-rates` page
2. **Add Audit Log** - Track rate changes
3. **Weight-Based Pricing** - Implement weight tiers
4. **Region-Based Pricing** - Add location-based rates
5. **Bulk Import** - CSV upload interface

## ⚠️ Important Notes

- CSV file (`vendor-shipping.csv`) is now **read-only backup**
- All updates should be made in Postgres
- Webhooks automatically use Postgres (no code changes needed)
- Cache refreshes every 15 minutes
- Both old and new webhooks now use Postgres

## 🧪 Testing

Test the migration:
```bash
cd services/shopify-price-offset
npx tsx src/jobs/bulk-test-10.ts
```

Should see: "Loaded X vendor rates from Postgres"
