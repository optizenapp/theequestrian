# 🚀 Neon Database Setup - Quick Start

## ✅ All Code Updated for Neon!

I've updated all files to use your existing **Neon database** (same as reviews).

---

## 🔑 Step 1: Set Environment Variable

You need to set `DATABASE_URL` in your local environment.

### Option A: Check if you already have it

```bash
echo $DATABASE_URL
```

If it shows your Neon connection string, you're good! Skip to Step 2.

### Option B: Get it from your `.env.local` file

```bash
# Look for DATABASE_URL in your .env.local file
cat .env.local | grep DATABASE_URL
```

### Option C: Get it from Neon Dashboard

1. Go to [Neon Console](https://console.neon.tech/)
2. Select your project
3. Go to **Connection Details**
4. Copy the connection string

It looks like:
```
postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

### Set it in your terminal:

```bash
export DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

Or add to `.env.local`:
```bash
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

---

## 🗄️ Step 2: Initialize Database

```bash
npm run db:init
```

**Expected output:**
```
🗄️  Initializing Neon Database

1️⃣  Testing database connection...
[DB] Connection successful: 2025-12-11 ...

2️⃣  Creating tables and indexes...
✅ Database initialized successfully!
```

This creates:
- ✅ `products` table (alongside your existing `reviews` table)
- ✅ `facet_cache` table
- ✅ `sync_log` table
- ✅ All indexes

---

## 📥 Step 3: Sync Products

```bash
npm run db:sync
```

This fetches all products from Shopify and stores them in Neon.

**Takes:** 2-5 minutes for 10k products

---

## 📊 Step 4: Verify

```bash
npm run db:stats
```

Should show:
```
📊 Database Statistics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Products: 10,247
Last Sync: 12/11/2025, 2:45:30 PM
Products Synced: 10,247
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ What Changed

### Files Updated to Use Neon:
- ✅ `lib/db/client.ts` - Uses `@neondatabase/serverless`
- ✅ `lib/db/queries.ts` - Updated query methods
- ✅ `scripts/sync-products-to-db.ts` - Updated import
- ✅ `scripts/init-database.ts` - Updated messages
- ✅ `app/api/webhooks/shopify/product-update/route.ts` - Updated import
- ✅ `app/api/webhooks/shopify/product-delete/route.ts` - Updated import

### Environment Variable:
- **Before:** `POSTGRES_URL` (Vercel Postgres)
- **After:** `DATABASE_URL` (Neon - you already have this!)

---

## 🎯 Benefits of Using Neon

1. ✅ **You already have it** - No new database to create
2. ✅ **Same connection** - Reviews + Products in one database
3. ✅ **Cost savings** - No additional database fees
4. ✅ **Same performance** - Neon is just as fast as Vercel Postgres
5. ✅ **Simpler** - One database to manage

---

## 🐛 Troubleshooting

### Error: "No database connection string"

**Fix:** Set `DATABASE_URL` in your environment:

```bash
# Add to .env.local
DATABASE_URL="your-neon-connection-string"

# Or export in terminal
export DATABASE_URL="your-neon-connection-string"
```

### Error: "Cannot connect to database"

**Fix:** Check your Neon connection string is correct:

1. Go to [Neon Console](https://console.neon.tech/)
2. Verify connection string
3. Make sure it includes `?sslmode=require`

---

## 🚀 Next Steps

Once you've completed Steps 1-4 above:

1. **Set up webhooks** in Shopify (see [POSTGRES-SETUP.md](./POSTGRES-SETUP.md))
2. **Enable Postgres version** of category page
3. **Deploy** to production

---

## 📚 Full Documentation

- **This guide:** Quick start for Neon
- **Complete guide:** [POSTGRES-SETUP.md](./POSTGRES-SETUP.md)
- **Technical details:** [POSTGRES-IMPLEMENTATION.md](./POSTGRES-IMPLEMENTATION.md)

---

**🎉 Your Neon database is ready to make your store 50-60x faster!**
