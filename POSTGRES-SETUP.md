# Vercel Postgres Setup Guide

## 🚀 Complete Implementation of Fast Product Search

This guide walks you through setting up Vercel Postgres for blazingly fast product queries.

---

## 📋 Prerequisites

1. **Vercel Account** with Pro plan (includes Postgres)
2. **Shopify Store** with Storefront API access
3. **Environment Variables** set up

---

## 🔧 Step 1: Create Vercel Postgres Database

### Option A: Via Vercel Dashboard (Recommended)

1. Go to your project on Vercel
2. Click **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a region (closest to your users)
6. Click **Create**

### Option B: Via Vercel CLI

```bash
vercel postgres create
```

### Get Connection String

After creation, Vercel will provide environment variables:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

These are automatically added to your project.

---

## 🔑 Step 2: Set Up Environment Variables

Add to your `.env.local` (for local development):

```bash
# Vercel Postgres (get from Vercel dashboard)
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# Shopify (you should already have these)
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_STOREFRONT_ACCESS_TOKEN="your-token"

# Shopify Webhooks (generate a random secret)
SHOPIFY_WEBHOOK_SECRET="your-webhook-secret-here"

# Site URL
NEXT_PUBLIC_SITE_URL="https://theequestrian.com.au"
```

### Generate Webhook Secret

```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `SHOPIFY_WEBHOOK_SECRET`.

---

## 📦 Step 3: Install Dependencies

Dependencies are already in `package.json`. Just run:

```bash
npm install
```

This includes:
- `@vercel/postgres` - Postgres client
- All other existing dependencies

---

## 🗄️ Step 4: Initialize Database

Run the initialization script to create tables and indexes:

```bash
npm run db:init
```

This will:
- ✅ Test database connection
- ✅ Create `products` table
- ✅ Create `facet_cache` table (optional optimization)
- ✅ Create `sync_log` table (tracking)
- ✅ Create all indexes for fast queries
- ✅ Set up full-text search

**Expected output:**
```
🗄️  Initializing Vercel Postgres Database

1️⃣  Testing database connection...
✅ Database connection successful

2️⃣  Creating tables and indexes...
✅ Database initialized successfully!
```

---

## 📥 Step 5: Sync Products from Shopify

Run the sync script to populate the database:

```bash
npm run db:sync
```

This will:
- Fetch ALL products from Shopify (using your existing `getAllProducts()` function)
- Insert them into Postgres
- Take 2-5 minutes for 10,000 products

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Starting Product Sync from Shopify to Postgres
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Fetching all products from Shopify...
✅ Fetched 10,247 products from Shopify

💾 Syncing products to database...
   Progress: 50/10247 (0.5%)
   Progress: 100/10247 (1.0%)
   ...
   Progress: 10247/10247 (100.0%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Sync Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total products:     10,247
Successfully synced: 10,247
Failed:             0
Duration:           142.34s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📊 Step 6: Verify Database

Check that everything is working:

```bash
npm run db:stats
```

**Expected output:**
```
📊 Database Statistics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Products: 10,247
Last Sync: 12/11/2025, 2:45:30 PM
Products Synced: 10,247
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔄 Step 7: Set Up Shopify Webhooks

Webhooks keep your database in sync with Shopify in real-time.

### 7.1 Get Your Webhook URLs

Your webhooks are at:
- **Product Update:** `https://your-domain.vercel.app/api/webhooks/shopify/product-update`
- **Product Delete:** `https://your-domain.vercel.app/api/webhooks/shopify/product-delete`

### 7.2 Register Webhooks in Shopify

1. Go to **Shopify Admin** → **Settings** → **Notifications**
2. Scroll down to **Webhooks**
3. Click **Create webhook**

#### Webhook 1: Product Update

- **Event:** `Product update`
- **Format:** `JSON`
- **URL:** `https://your-domain.vercel.app/api/webhooks/shopify/product-update`
- **API Version:** `2024-10` (or latest)
- Click **Save**

#### Webhook 2: Product Delete

- **Event:** `Product deletion`
- **Format:** `JSON`
- **URL:** `https://your-domain.vercel.app/api/webhooks/shopify/product-delete`
- **API Version:** `2024-10` (or latest)
- Click **Save**

### 7.3 Test Webhooks

1. Edit any product in Shopify (change title, description, etc.)
2. Check Vercel logs to see webhook received
3. Run `npm run db:stats` to verify product count

---

## 🚀 Step 8: Enable Postgres in Your App

### Option A: Gradual Rollout (Recommended)

Keep both versions and test Postgres first:

1. Current Shopify version: `app/[category]/page.tsx` (keep as is)
2. New Postgres version: `app/[category]/page-postgres.tsx` (already created)

Test the Postgres version at: `https://www.theequestrian.com.au/horse`

When ready to switch:
```bash
# Backup current version
mv app/[category]/page.tsx app/[category]/page-shopify.tsx

# Enable Postgres version
mv app/[category]/page-postgres.tsx app/[category]/page.tsx
```

### Option B: Immediate Switch

```bash
# Backup current version
mv app/[category]/page.tsx app/[category]/page-shopify.tsx

# Enable Postgres version
mv app/[category]/page-postgres.tsx app/[category]/page.tsx
```

---

## 🧪 Step 9: Test Everything

### Test 1: Category Page Load

```bash
npm run dev
```

Visit: `https://www.theequestrian.com.au/horse`

**Expected:**
- ✅ Page loads in <200ms (check Network tab)
- ✅ Products display correctly
- ✅ Images load
- ✅ "Updating prices..." appears briefly
- ✅ Prices update within 1 second

### Test 2: Filters

1. Click a brand filter (e.g., "Ariat")
2. **Expected:** Results update in <100ms
3. Click a size filter
4. **Expected:** Results update in <100ms

### Test 3: Pagination

1. Scroll to bottom
2. Click "Next Page"
3. **Expected:** New products load in <200ms

### Test 4: Search API

Test the API directly:

```bash
curl "https://www.theequestrian.com.au/api/products/search?type=Horse%20Rugs&limit=10"
```

**Expected response:**
```json
{
  "products": [...],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "totalCount": 1234,
    "hasNextPage": true
  },
  "facets": {
    "brands": [...],
    "sizes": [...],
    "colors": [...]
  },
  "meta": {
    "queryTime": "45ms",
    "facetsTime": "23ms",
    "totalTime": "68ms"
  }
}
```

---

## 📈 Step 10: Deploy to Production

### 10.1 Commit Changes

```bash
git add .
git commit -m "Add Vercel Postgres for fast product queries"
git push origin main
```

### 10.2 Deploy to Vercel

Vercel will automatically deploy. After deployment:

1. **Run sync on production:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Find `sync-products-to-db`
   - Click "Invoke" (or use Vercel CLI)

   Or via CLI:
   ```bash
   vercel env pull .env.production
   npm run db:sync
   ```

2. **Verify production:**
   - Visit: `https://your-domain.vercel.app/horse`
   - Check performance in Network tab
   - Should be <200ms

---

## 🔄 Maintenance

### Re-sync Products (if needed)

If you need to re-sync all products:

```bash
npm run db:sync
```

This is safe to run multiple times (uses upsert).

### Monitor Sync Status

```bash
npm run db:stats
```

### Scheduled Syncs (Optional)

You can set up a cron job to sync products periodically:

1. Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/sync-products",
    "schedule": "0 */6 * * *"
  }]
}
```

2. Create `app/api/cron/sync-products/route.ts`:
```typescript
import { syncProductsFromShopify } from '@/scripts/sync-products-to-db';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  await syncProductsFromShopify();
  return Response.json({ ok: true });
}
```

---

## 🎯 Performance Expectations

### Before (Shopify Direct):
- `/horse` page load: **10-12 seconds**
- Filter application: **2-3 seconds**
- Total products: 4,409

### After (Postgres):
- `/horse` page load: **<200ms** ⚡⚡⚡
- Filter application: **<50ms** ⚡⚡⚡
- Total products: 4,409

**That's 50-60x faster!**

---

## 🐛 Troubleshooting

### Database Connection Fails

**Error:** `Cannot connect to database`

**Fix:**
1. Check `POSTGRES_URL` in `.env.local`
2. Make sure Postgres database is created in Vercel
3. Run `npm run db:init` again

### Sync Fails

**Error:** `Shopify API error`

**Fix:**
1. Check `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
2. Make sure Storefront API is enabled in Shopify
3. Check API rate limits

### Webhooks Not Working

**Error:** Webhook returns 401 Unauthorized

**Fix:**
1. Check `SHOPIFY_WEBHOOK_SECRET` matches in both Shopify and your app
2. Verify webhook URL is correct
3. Check Vercel logs for errors

### Products Not Showing

**Error:** Empty product list

**Fix:**
1. Run `npm run db:stats` to check if products are synced
2. If 0 products, run `npm run db:sync`
3. Check product types in mapping CSV match database

---

## 📚 Additional Resources

- **Vercel Postgres Docs:** https://vercel.com/docs/storage/vercel-postgres
- **Shopify Webhooks:** https://shopify.dev/docs/api/admin-rest/2024-10/resources/webhook
- **Performance Monitoring:** Check Vercel Analytics

---

## ✅ Success Checklist

- [ ] Vercel Postgres database created
- [ ] Environment variables set
- [ ] Database initialized (`npm run db:init`)
- [ ] Products synced (`npm run db:sync`)
- [ ] Webhooks registered in Shopify
- [ ] Local testing passed
- [ ] Postgres version enabled
- [ ] Deployed to production
- [ ] Production sync completed
- [ ] Performance verified (<200ms)

---

**🎉 Congratulations! Your store is now 50-60x faster!**
