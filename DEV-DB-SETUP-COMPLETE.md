# Development Database Setup - COMPLETE ✅

## Your Dev Database is Ready!

### Connection Details
- **Database**: Neon Development Branch
- **Region**: ap-southeast-2 (Sydney)
- **Connection**: Pooler endpoint (optimized for serverless)
- **Status**: ✅ Connected and working

### Current State
- ✅ All tables created (products, reviews, review_stats, sync_log, facet_cache)
- ✅ Data copied from production: **9,943 products**
- ✅ Schema matches production
- ✅ Ready to use immediately

## How to Use

### Add to .env.local

Open your `.env.local` file and update this line:

```env
POSTGRES_URL=postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
```

### Test the Connection

```bash
# Test with npm script
npm run db:stats

# Expected output:
# ✅ Total Products: 9,943
# ✅ Available for Sale: [number]
# ✅ Last Synced: [timestamp]
```

### Start Development

```bash
# Use the automated startup script
./start-dev.sh

# Or manually
git checkout jono-dev
git pull origin jono-dev
npm run dev
```

## Database Management

### Current Data
- **9,943 products** - Snapshot from production at time of branch creation
- This is SAFE to modify - it won't affect production
- Great for testing without syncing from Shopify

### When to Re-sync

You typically don't need to re-sync since you have production data, but if you want fresh data:

```bash
# Re-sync from Shopify (takes 2-5 minutes)
npm run db:sync

# This will update to latest products from Shopify
```

### Reset Development Database

If you need to start fresh:

```bash
# Option 1: Delete and recreate branch in Neon Console
# 1. Go to https://console.neon.tech
# 2. Delete dev branch
# 3. Create new branch from main

# Option 2: Just re-sync data
npm run db:sync
```

## Quick Test

Let's verify everything works:

```bash
# 1. Test database connection
psql 'postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require' -c "SELECT COUNT(*) FROM products;"

# Expected: 9943 (or similar)

# 2. Test via npm script
npm run db:stats

# 3. Start dev server
npm run dev

# 4. Visit http://localhost:3001
```

## What's Different from Production?

| Feature | Production DB | Development DB |
|---------|---------------|----------------|
| Data | Live customer data | Snapshot at branch creation |
| Writes | Affects live site | Safe sandbox |
| Auto-suspend | No | Yes (saves money) |
| Compute | Always on | Wakes on first query |
| Cost | Paid tier | Free tier |

## Advantages

### You Got Production Data! 🎉
This is actually great because:
- ✅ **Real product data** for testing
- ✅ **Realistic testing** scenarios
- ✅ **No sync wait** (already populated)
- ✅ **Safe to experiment** (won't affect production)

### Auto-Suspend
- Dev database automatically suspends after 5 minutes of inactivity
- Saves compute hours on free tier
- Wakes in 2-3 seconds on first query
- Completely automatic

## Troubleshooting

### First Query Slow
**Expected**: First query after idle takes 2-3 seconds (database waking up)
**Solution**: This is normal! Subsequent queries are instant.

### Connection Timeout
```bash
# Check if database is active
# It will auto-wake on connection attempt

# Or manually check in Neon Console
# Go to https://console.neon.tech → Branches → Check compute status
```

### Stale Data
```bash
# If you need latest product data from Shopify
npm run db:sync
```

## Environment Variable Format

Your connection string includes:
- `postgresql://` - Protocol
- `neondb_owner:npg_...` - Username and password
- `@ep-square-dawn-a7cjzpyx-pooler...` - Pooler endpoint (faster)
- `.ap-southeast-2.aws.neon.tech` - Sydney region
- `/neondb` - Database name
- `?sslmode=require` - SSL encryption (required)

## Next Steps

1. ✅ Database is ready
2. Add connection string to `.env.local`
3. Run `npm run db:stats` to verify
4. Start developing with `./start-dev.sh`

## You're All Set! 🚀

Your development environment is fully configured with:
- ✅ jono-dev branch (Git)
- ✅ Development database (Neon)
- ✅ Production data snapshot
- ✅ All tables and schema
- ✅ Ready to code!

Just add the connection string to `.env.local` and start the dev server!
