# Scripts and Automation Wiki

**Last Updated:** January 23, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Dynamic Data (No Scripts Required)](#dynamic-data-no-scripts-required)
3. [CSV-Based Content Scripts](#csv-based-content-scripts)
4. [Database Scripts](#database-scripts)
5. [Cron Schedule Summary](#cron-schedule-summary)
6. [GitHub Actions Setup](#github-actions-setup)
7. [CSV Files Reference](#csv-files-reference)
8. [Deployment Considerations](#deployment-considerations)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Equestrian headless site uses **two distinct data update mechanisms**:

### 1. Dynamic Updates (Real-time from Shopify)

Data fetched directly from Shopify Storefront API on each request with ISR (Incremental Static Regeneration) caching:
- Product data (title, price, images, variants, availability)
- Product types and vendors
- Collections structure
- Blog posts
- Review stats (from Neon database)

### 2. CSV-Based Content (Requires Scripts)

Static content stored in CSV files that must be regenerated periodically:
- Collection page content
- Product bullet points
- Category mapping
- Mega menu structure
- Redirects
- Shipping rates

---

## Dynamic Data (No Scripts Required)

### What Updates Automatically

| Data Type | Source | Cache Strategy | Update Frequency |
|-----------|--------|----------------|------------------|
| Products | Shopify Storefront API | ISR 300s (5 min) | Real-time |
| Collections | Shopify Storefront API | ISR 900s (15 min) | Real-time |
| Prices | Shopify Storefront API | ISR 300s | Real-time |
| Inventory | Shopify Storefront API | ISR 300s | Real-time |
| Blog Posts | Shopify Storefront API | ISR 3600s (1 hour) | Real-time |
| Reviews | Neon Postgres | No cache | Real-time |
| Product Images | Shopify CDN | Browser cache | Real-time |

### Key Files

- `lib/shopify/products.ts` - Product fetching
- `lib/shopify/collections.ts` - Collection fetching
- `lib/shopify/blogs.ts` - Blog fetching
- `lib/db/queries.ts` - Review queries

### ISR Configuration

```typescript
// Product pages: 5 minute revalidation
export const revalidate = 300;

// Collection pages: 15 minute revalidation
export const revalidate = 900;
```

**How It Works:**
- When a user visits a page, Next.js serves cached version
- After revalidation time expires, Next.js regenerates page in background
- User always gets fast response (cached or fresh)
- No manual intervention needed

---

## CSV-Based Content Scripts

### A. Collection Page Content

**Primary Script:** `scripts/master-content-generator-v2.ts`

**What It Does:**
- Generates H1 titles, meta descriptions, short/long descriptions
- Creates category-specific bullet points
- Generates FAQs and internal links
- Validates content quality (score ≥90)
- Uses actual Shopify product types for accuracy

**CSV Output:** `exports/collection-content.csv`

**Usage:**
```bash
# Dry run first (preview changes)
npm run master-generate-v2 -- --start=0 --max=5 --dry-run

# Process all 238 collection pages
npm run master-generate-v2 -- --start=0 --max=238

# Process specific range
npm run master-generate-v2 -- --start=50 --max=20
```

**When to Run:**
- After adding new categories/subcategories
- When improving SEO content
- Quarterly content refresh

**Cron Schedule:** Manual (on-demand)

**Documentation:** See `MASTER-CONTENT-GENERATOR-V2.md`

**Related Scripts (Legacy - Use master-generate-v2 instead):**
- `fix-h1-titles.ts`
- `fix-meta-descriptions.ts`
- `fix-short-descriptions-*.ts`
- `fix-long-descriptions-*.ts`
- All other `fix-*` and `add-*` scripts

---

### B. Product Bullet Points

**Primary Script:** `scripts/generate-product-bullets.ts`

**What It Does:**
- AI-generates 3 unique bullet points per product
- Uses OpenAI GPT-4o + Claude Sonnet 4.5 validation
- Processes in batches of 50 with automatic progress saves
- Creates product-specific features (no generic text)
- Plain text format (no markdown)

**CSV Output:** `exports/product-bullet-points-YYYY-MM-DD.csv`

**Usage:**
```bash
# Generate for all products (~10,000)
npm run generate:bullets

# Test on 10 products first
npm run generate:bullets -- --dry-run --limit=10

# Resume if interrupted
npm run generate:bullets -- --resume=exports/product-bullet-points-YYYY-MM-DD-progress.csv

# Start from specific position
npm run generate:bullets -- --start=1000 --limit=500
```

**Incremental Update Script:** `scripts/update-product-bullets.ts`

**Usage:**
```bash
# Update only new products (no bullets yet)
npm run update:bullets

# Dry run to see what would be updated
npm run update:bullets -- --dry-run

# Force regenerate all products
npm run update:bullets -- --force
```

**When to Run:**
- **Initial:** Once for all products (~4 hours, ~$10)
- **Ongoing:** Weekly for new products (~5 min, ~$0.06)

**Cron Schedule:** Weekly (Sundays 2 AM UTC)

**GitHub Action:** `.github/workflows/update-product-bullets.yml`

**Cost:**
- Initial bulk: ~$10 for 10,000 products
- Weekly updates: ~$0.06 for ~50 new products
- Annual ongoing: ~$3/year

**Documentation:** See `PRODUCT-BULLET-POINTS-SYSTEM.md`

**How It Works:**
1. Fetches all products from Shopify
2. Identifies products without bullets (or all if --force)
3. Processes in batches of 50
4. Saves progress after each batch
5. Creates final CSV with date stamp
6. Frontend automatically loads latest CSV

---

### C. Product Type Classification

**Script:** `scripts/ai-classify-products.ts`

**What It Does:**
- AI-classifies products without proper product types
- Uses dual AI validation (OpenAI + Claude)
- Exports suggestions to CSV for manual review
- Identifies products needing categorization

**CSV Output:** `exports/ai-classified-products-YYYY-MM-DD.csv`

**Usage:**
```bash
# Dry run on 10 products
npm run ai:classify-products -- --dry-run --limit=10

# Process all unclassified products
npm run ai:classify-products

# Resume from previous run
npm run ai:classify-products -- --resume=exports/ai-classified-products-YYYY-MM-DD.csv
```

**When to Run:**
- After bulk product imports from new vendors
- When fixing product categorization issues
- As needed for uncategorized products

**Cron Schedule:** Manual (on-demand)

**Documentation:** See `AI-PRODUCT-CLASSIFIER-SETUP.md`

**Workflow:**
1. Run script to generate classifications
2. Review CSV file (check `needs_review=true` rows)
3. Edit `manual_override` column if needed
4. Use Shopify bulk editor to update product types
5. Verify products appear in correct categories

---

### D. Redirects

**Script:** `scripts/generate-redirects.ts`

**What It Does:**
- Generates 301 redirects from old URLs to new category-based URLs
- Reads from `redirects/redirects.csv`
- Creates `next.config.ts` redirects array
- Ensures SEO continuity during URL structure changes

**CSV Input:** `redirects/redirects.csv`

**Usage:**
```bash
# Automatically runs before dev/build
npm run dev  # Runs redirects:generate first
npm run build  # Runs redirects:generate first

# Manual run
npm run redirects:generate

# Test redirects
npm run redirects:test
npm run redirects:test:prod
```

**When to Run:**
- Automatically on every `dev` and `build`
- After adding new redirect rules to CSV
- No manual intervention needed

**Cron Schedule:** N/A (automatic)

**Documentation:** See `URL-REDIRECT-STRATEGY.md`

---

### E. Sitemap (Dynamic - No Script Needed)

**Files:** 
- `app/sitemap.ts` - Sitemap index
- `app/sitemap/static.xml/route.ts` - Static pages
- `app/sitemap/collections.xml/route.ts` - Collections
- `app/sitemap/products-[batch]/route.ts` - Products (batched)
- `app/sitemap/news.xml/route.ts` - Blog posts

**What It Does:**
- Automatically generates XML sitemaps at `/sitemap.xml`
- Splits into multiple sitemaps for better performance
- Fetches all products and collections from Shopify
- Updates dynamically on each request (with 1-hour cache)
- Uses Next.js built-in sitemap support

**Sitemap Structure:**
```
/sitemap.xml (index)
├── /sitemap/static.xml (~10 pages)
│   ├── Homepage
│   ├── About, Contact, FAQ
│   ├── Policy pages
│   └── On Sale, Brands
├── /sitemap/collections.xml (241 collections)
│   └── All headless frontend categories (from mapping-template-draft2.csv)
│   └── Includes: top-level, parent, sub, and sub-sub categories
├── /sitemap/products-0.xml (products 0-1,999)
│   └── URLs: /{category}/{subcategory}/{product-handle}
├── /sitemap/products-1.xml (products 2,000-3,999)
│   └── URLs: /{category}/{subcategory}/{product-handle}
├── /sitemap/products-2.xml (products 4,000-5,999)
│   └── URLs: /{category}/{subcategory}/{product-handle}
├── /sitemap/products-3.xml (products 6,000-7,999)
│   └── URLs: /{category}/{subcategory}/{product-handle}
├── /sitemap/products-4.xml (products 8,000-9,999)
│   └── URLs: /{category}/{subcategory}/{product-handle}
└── /sitemap/news.xml (blog posts)
```

**Product URL Structure:**
- All products use canonical URLs with full hierarchical path
- Based on `primary_collection` metafield from Shopify
- URL depth varies by category structure:
  - 2 levels: `/{category}/{product-handle}`
  - 3 levels: `/{category}/{subcategory}/{product-handle}`
  - 4+ levels: `/{category}/{subcategory}/{sub-subcategory}/{product-handle}`
- Examples:
  - `/saddles/wintec-pro-dressage-saddle`
  - `/horse/rugs/zilco-defender-cotton-combo`
  - `/horse/rugs/turnout-rugs/horseware-rambo-original`
- Ensures proper SEO and hierarchical structure
- Fallback to `/products/{handle}` only if no primary_collection set

**Why Batched?**
- Google recommends max 50,000 URLs per sitemap
- With ~10,000 products, we split into 5 batches of 2,000 each
- Faster generation and parsing
- Better SEO crawl efficiency

**How It Works:**
- Next.js automatically serves sitemaps
- Each sitemap regenerates on request with 1-hour cache
- No manual script execution needed
- Always up-to-date with current products

**When to Update:**
- Never - it's automatic!
- Sitemaps update whenever products/collections change in Shopify

**Cron Schedule:** N/A (automatic)

**Legacy Script (No Longer Needed):**
- `scripts/export-sitemap.ts` - Exports to CSV for reference/auditing only
- Use only if you need a CSV export for analysis

---

## Database Scripts

### A. Product Sync to Database

**Script:** `scripts/sync-products-to-db.ts`

**What It Does:**
- Syncs product handles and IDs to Neon Postgres
- Required for canonical URL lookups
- Enables fast product-to-category mapping
- Keeps database in sync with Shopify

**Usage:**
```bash
npm run db:sync

# Check database stats
npm run db:stats
```

**When to Run:**
- After bulk product imports
- Weekly to catch new products
- After major Shopify changes

**Cron Schedule:** Weekly (Sundays 3 AM UTC)

**Why It's Needed:**
- Canonical URLs require product-to-category mapping
- Database lookup is faster than Shopify API
- Enables offline/cached URL generation

---

### B. Review Import

**Script:** `scripts/import-yotpo-reviews.ts`

**What It Does:**
- Imports reviews from Yotpo to Neon Postgres
- One-time migration script
- Preserves review history

**Usage:**
```bash
npm run import:yotpo-reviews
```

**When to Run:**
- One-time (already completed)
- Not needed for ongoing operations

**Cron Schedule:** N/A (one-time migration)

**Documentation:** See `YOTPO-IMPORT-GUIDE.md`

---

## Cron Schedule Summary

### Recommended Schedule

| Script | Frequency | Day/Time | Command | Priority | Cost |
|--------|-----------|----------|---------|----------|------|
| Product Bullets Update | Weekly | Sunday 2 AM UTC | `npm run update:bullets` | HIGH | ~$0.06 |
| Product DB Sync | Weekly | Sunday 3 AM UTC | `npm run db:sync` | HIGH | Free |
| Collection Content | Quarterly | Manual | `npm run master-generate-v2` | LOW | Free |
| Product Classification | As needed | Manual | `npm run ai:classify-products` | LOW | Varies |

### Visual Schedule

```
Weekly (Sunday):
├─ 2:00 AM UTC: Update product bullets (5-10 min)
└─ 3:00 AM UTC: Sync products to database (2-5 min)

Quarterly (Manual):
└─ Refresh collection content (30-60 min)

As Needed (Manual):
└─ Classify new products (varies)

Automatic (No Action Needed):
└─ Sitemap generation at /sitemap.xml (dynamic)
```

---

## GitHub Actions Setup

### Current Actions

1. **`.github/workflows/update-product-bullets.yml`**
   - Weekly product bullets update
   - Runs Sundays at 2 AM UTC
   - Commits updated CSV to repository

### Recommended Actions

#### Weekly Maintenance

**File:** `.github/workflows/weekly-maintenance.yml`

```yaml
name: Weekly Maintenance

on:
  schedule:
    - cron: '0 2 * * 0'  # Sunday 2 AM UTC
  workflow_dispatch:

jobs:
  update-bullets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run update:bullets
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SHOPIFY_STOREFRONT_ACCESS_TOKEN: ${{ secrets.SHOPIFY_STOREFRONT_ACCESS_TOKEN }}
          SHOPIFY_STORE_DOMAIN: ${{ secrets.SHOPIFY_STORE_DOMAIN }}
      - run: npm run db:sync
        env:
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
          SHOPIFY_STOREFRONT_ACCESS_TOKEN: ${{ secrets.SHOPIFY_STOREFRONT_ACCESS_TOKEN }}
          SHOPIFY_STORE_DOMAIN: ${{ secrets.SHOPIFY_STORE_DOMAIN }}
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add exports/
          git diff --staged --quiet || git commit -m "chore: weekly maintenance [automated]"
          git push
```

**Note:** Monthly sitemap export is no longer needed since Next.js generates the sitemap dynamically at `/sitemap.xml`.

### Required GitHub Secrets

Configure these in GitHub repository settings:

| Secret Name | Description | Where to Get |
|-------------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key | https://platform.openai.com/api-keys |
| `ANTHROPIC_API_KEY` | Claude API key | https://console.anthropic.com/settings/keys |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Shopify Storefront API | Shopify Admin → Apps |
| `SHOPIFY_STORE_DOMAIN` | Store domain | e.g., `theequestrian.myshopify.com` |
| `POSTGRES_URL` | Neon database URL | Neon dashboard |

### Manual Trigger

All GitHub Actions can be triggered manually:
1. Go to GitHub repository
2. Click **Actions** tab
3. Select workflow (e.g., "Weekly Maintenance")
4. Click **Run workflow** button
5. Confirm and run

---

## CSV Files Reference

### Active CSV Files (Used by Frontend)

| File | Purpose | Updated By | Update Frequency | Size |
|------|---------|------------|------------------|------|
| `collection-content.csv` | Collection page content | `master-generate-v2` | Quarterly | ~500 KB |
| `product-bullet-points-YYYY-MM-DD.csv` | Product bullets | `generate:bullets` / `update:bullets` | Weekly | ~2 MB |
| `mapping-template-draft2.csv` | Category/product mapping | Manual | As needed | ~300 KB |
| `mega-menu-content.csv` | Navigation menu | Manual | As needed | ~50 KB |
| `redirects/redirects.csv` | URL redirects | Manual | As needed | ~100 KB |
| `exports/shipping-rates.csv` | Shipping calculations | Manual | As needed | ~20 KB |

### Archive/Backup Files

- `collection-content.backup-*.csv` - Automatic backups before script runs
- `product-bullet-points-*-progress.csv` - Progress saves during generation
- `ai-classified-products-*.csv` - Product classification results

### CSV Loading Behavior

**Development:**
- CSVs reload on every request
- Changes visible immediately
- No caching

**Production:**
- CSVs cached in memory on first load
- Cache invalidated on file modification
- Automatic cache refresh on deploy

---

## Deployment Considerations

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| CSV Loading | Reloads on every request | Cached in memory |
| Shopify API | Direct calls | ISR cached |
| Database | Neon (same) | Neon (same) |
| Redirects | Generated on `npm run dev` | Generated on `npm run build` |
| Bullet Points | Latest CSV auto-detected | Latest CSV auto-detected |

### When Site Goes Live

**Pre-Launch Checklist:**

1. **Set up GitHub Actions**
   - Create weekly-maintenance.yml
   - Create monthly-maintenance.yml
   - Test with manual triggers

2. **Configure GitHub Secrets**
   - Add all required API keys
   - Verify secrets are accessible
   - Test in workflow runs

3. **Enable Vercel Auto-Deploy**
   - Connect GitHub repository
   - Enable auto-deploy on main branch
   - CSV changes trigger new deployment

4. **Monitor Cron Jobs**
   - Set up GitHub Actions notifications
   - Monitor for failed runs
   - Review logs weekly

5. **Set Up Alerts**
   - Email notifications for failures
   - Slack/Discord webhooks (optional)
   - Cost monitoring for AI APIs

### Post-Launch Monitoring

**Weekly:**
- Check GitHub Actions success/failure
- Review product bullet points quality
- Monitor API costs

**Monthly:**
- Review sitemap generation
- Check for new unclassified products
- Audit CSV file sizes

**Quarterly:**
- Refresh collection content
- Review and update documentation
- Optimize cron schedules if needed

---

## Troubleshooting

### CSV Not Updating on Frontend

**Symptoms:**
- Old content still showing
- Changes not visible after script run

**Solutions:**
1. Check file exists: `ls -la exports/product-bullet-points-*.csv`
2. Restart dev server (CSV cached on startup)
3. Check file modification time matches
4. Verify CSV format is correct (no syntax errors)
5. Clear Next.js cache: `rm -rf .next && npm run dev`

### Script Fails Midway

**Symptoms:**
- Script stops before completion
- Error messages in terminal

**Solutions:**
1. Check for `-progress.csv` file in exports/
2. Use `--resume` flag to continue from last save
3. Check API rate limits (OpenAI/Anthropic)
4. Verify API keys are valid and have credits
5. Check network connection
6. Review error message for specific issue

### GitHub Action Fails

**Symptoms:**
- Red X on GitHub Actions tab
- Email notification of failure

**Solutions:**
1. Check GitHub Actions logs for error details
2. Verify all secrets are set correctly
3. Check API quotas/limits not exceeded
4. Review error messages for specific failures
5. Test script locally with same environment
6. Manually trigger workflow to retry

### High API Costs

**Symptoms:**
- Unexpected charges from OpenAI/Anthropic
- Costs higher than estimated

**Solutions:**
1. Check how many products were processed
2. Verify script not running in infinite loop
3. Review GitHub Actions logs for multiple runs
4. Set up cost alerts in OpenAI/Anthropic dashboards
5. Consider increasing confidence threshold to reduce Claude validation
6. Use `--dry-run` to test before running on all products

### Products Missing Bullets

**Symptoms:**
- Some products show generic bullets
- New products not getting custom bullets

**Solutions:**
1. Check if product is in latest CSV: `grep "product-handle" exports/product-bullet-points-*.csv`
2. Run incremental update: `npm run update:bullets`
3. Verify GitHub Action ran successfully
4. Check product was added after last script run
5. Manually generate for specific products if needed

### Database Sync Issues

**Symptoms:**
- Canonical URLs not working
- Products not appearing in categories

**Solutions:**
1. Run database sync: `npm run db:sync`
2. Check database stats: `npm run db:stats`
3. Verify Postgres connection: Check `POSTGRES_URL` env var
4. Review sync logs for errors
5. Check Shopify API is accessible

---

## Quick Reference

### Most Common Commands

```bash
# Weekly maintenance (automated via GitHub Actions)
npm run update:bullets        # Update product bullets for new products
npm run db:sync               # Sync products to database

# Monthly maintenance
npm run export:sitemap        # Export sitemap for SEO

# As needed
npm run master-generate-v2    # Refresh collection content
npm run ai:classify-products  # Classify new products

# Development
npm run dev                   # Start dev server (auto-generates redirects)
npm run build                 # Build for production (auto-generates redirects)
```

### File Locations

```
theequestrian/
├── scripts/                  # All automation scripts
├── exports/                  # CSV files (content, bullets, etc.)
├── .github/workflows/        # GitHub Actions (cron jobs)
├── lib/
│   ├── shopify/             # Shopify API integrations
│   ├── products/            # Product utilities (bullet-points.ts)
│   └── content/             # Content loading (collections.ts)
└── app/                     # Next.js pages (ISR configuration)
```

### Support Resources

- **Product Bullets:** `PRODUCT-BULLET-POINTS-SYSTEM.md`
- **Collection Content:** `MASTER-CONTENT-GENERATOR-V2.md`
- **Product Classification:** `AI-PRODUCT-CLASSIFIER-SETUP.md`
- **Reviews:** `YOTPO-IMPORT-GUIDE.md`
- **Redirects:** `URL-REDIRECT-STRATEGY.md`

---

## Summary

**Dynamic Data (No Action Needed):**
- Products, prices, inventory, collections → Auto-updates from Shopify
- Reviews → Real-time from Neon database
- ISR caching ensures fast performance

**Weekly Automation (GitHub Actions):**
- Product bullet points → New products get custom bullets
- Database sync → Keeps canonical URLs working

**Monthly Automation (GitHub Actions):**
- Sitemap export → SEO updates

**Quarterly Manual:**
- Collection content refresh → Improve SEO content

**As Needed Manual:**
- Product classification → New vendor products
- Redirect updates → URL structure changes

**Total Ongoing Cost:** ~$3/year for AI-powered bullet points

---

**Last Updated:** January 23, 2026  
**Maintained By:** Development Team  
**Questions?** Review specific documentation files linked throughout this wiki.
