# Price Offset Automation System

## Overview
Automated system to apply shipping offsets to product prices when:
1. New products are created in Shopify
2. Draft products are published
3. Existing products are updated

## Current Setup

### ✅ Existing Webhooks
- **Product Update**: `app/api/webhooks/shopify/product-update/route.ts`
  - Syncs product metadata to Postgres
  - Does NOT handle price offsets

### ❌ Missing Components
1. **Price Offset Webhook** - Apply offsets when products are created/updated
2. **Published Status Filter** - Only process published products
3. **Automatic Trigger** - No manual intervention needed

## Proposed Solution

### Option 1: Dedicated Price Offset Webhook (RECOMMENDED)
**Create**: `app/api/webhooks/shopify/price-offset/route.ts`

**Triggers**:
- `products/create` - New products added to Shopify
- `products/update` - Existing products updated (including draft → published)

**Logic**:
1. Verify webhook signature
2. Check if product is **published** (`status === 'active'`)
3. Check if vendor has a shipping offset in CSV
4. Calculate adjusted prices for all variants
5. Update prices in Shopify via Admin API
6. Log to `shopify_price_audit` database

**Advantages**:
- ✅ Real-time price updates
- ✅ No manual intervention
- ✅ Handles new products automatically
- ✅ Handles draft → published transitions
- ✅ Only processes published products

**Disadvantages**:
- ⚠️ Requires webhook registration in Shopify
- ⚠️ Each product update triggers price calculation

### Option 2: Scheduled Job (Alternative)
**Create**: Cron job that runs every hour

**Logic**:
1. Query Shopify for products updated in last hour
2. Filter for published products only
3. Check which ones need offsets
4. Update prices

**Advantages**:
- ✅ Batched processing
- ✅ Less API calls

**Disadvantages**:
- ❌ Not real-time (up to 1 hour delay)
- ❌ Requires cron infrastructure
- ❌ More complex error handling

### Option 3: Hybrid Approach (BEST)
Combine both:
1. **Webhook** for real-time updates (new products, published products)
2. **Daily Bulk Job** as safety net to catch any missed products

## Implementation Plan

### Step 1: Update Bulk Script to Filter Published Products
```typescript
// Only process published products
if (product.status !== 'active') {
  console.log(`[Bulk] Skipping draft/archived product: ${product.title}`);
  skipped++;
  processed++;
  continue;
}
```

### Step 2: Create Price Offset Webhook
```typescript
// app/api/webhooks/shopify/price-offset/route.ts
export async function POST(request: NextRequest) {
  // 1. Verify webhook
  // 2. Check if published
  // 3. Check if vendor has offset
  // 4. Update prices
  // 5. Log to audit DB
}
```

### Step 3: Register Webhooks in Shopify
```bash
# Register products/create webhook
POST /admin/api/2024-01/webhooks.json
{
  "webhook": {
    "topic": "products/create",
    "address": "https://yourdomain.com/api/webhooks/shopify/price-offset",
    "format": "json"
  }
}

# Register products/update webhook  
POST /admin/api/2024-01/webhooks.json
{
  "webhook": {
    "topic": "products/update",
    "address": "https://yourdomain.com/api/webhooks/shopify/price-offset",
    "format": "json"
  }
}
```

### Step 4: Test Workflow
1. Create a draft product → No price change
2. Publish the product → Webhook fires, price updated
3. Update published product → Webhook fires, price verified
4. Archive product → No price change

## Webhook Registration Options

### Option A: Manual Registration (Quick)
Use Shopify Admin UI or API to register webhooks pointing to your Next.js API routes.

### Option B: Automated Registration Script
Create a script that registers webhooks programmatically:
```bash
npx tsx scripts/register-price-offset-webhook.ts
```

### Option C: Shopify App (Future)
Convert to a Shopify app with automatic webhook management.

## Monitoring & Maintenance

### Audit Database
Track all price updates in `shopify_price_audit`:
- Source: `webhook` vs `bulk`
- Timestamp
- Old vs new prices
- Vendor and offset applied

### Error Handling
- Webhook failures → Retry mechanism
- API rate limits → Queue system
- Missing offsets → Log for review

### Daily Health Check
- Count products with offsets
- Compare against audit database
- Alert if discrepancies found

## Next Steps

1. **Immediate**: Fix bulk script to filter published products only
2. **Short-term**: Create price offset webhook
3. **Medium-term**: Register webhooks in Shopify
4. **Long-term**: Set up monitoring and alerts
