# Mega Menu Database Migration

## Overview

Mega menu content has been migrated from CSV file to PostgreSQL database for better production reliability and easier management.

## Why Database?

**Problems with CSV:**
- ❌ File system dependencies in serverless environments
- ❌ Requires redeployment to update content
- ❌ Caching issues in production
- ❌ Not editable via admin panel

**Benefits of Database:**
- ✅ No file system dependencies
- ✅ Update content without redeploying
- ✅ Reliable caching with TTL
- ✅ Can be edited via API/admin panel
- ✅ Consistent with other content (collection_content)

## Database Schema

### Table: `mega_menu_content`

```sql
CREATE TABLE mega_menu_content (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) UNIQUE NOT NULL,
  featured_image_url TEXT,
  featured_title VARCHAR(255),
  featured_subtitle VARCHAR(255),
  featured_link VARCHAR(255),
  quick_links JSONB DEFAULT '[]',
  subcategory_cards JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### JSONB Structure

**quick_links:**
```json
[
  {
    "title": "Horse Boots",
    "imageUrl": "https://cdn.shopify.com/...",
    "link": "/horse/boots"
  }
]
```

**subcategory_cards:**
```json
[
  {
    "title": "Supplements",
    "imageUrl": "https://cdn.shopify.com/...",
    "link": "/horse/supplements"
  }
]
```

## Migration

### Running the Migration

```bash
npm run migrate:mega-menu
```

This script:
1. Creates the `mega_menu_content` table
2. Reads data from `exports/mega-menu-content.csv`
3. Imports all records into the database
4. Uses `ON CONFLICT` to update existing records

### What Was Migrated

- ✅ 5 categories (horse, rider, clothing, pet, accessories)
- ✅ Featured images for each category
- ✅ Quick links (2 per category)
- ✅ Subcategory cards (up to 6 per category)

## Code Changes

### Files Modified

**`lib/content/mega-menu-content.ts`:**
- Changed from CSV-only to database-first with CSV fallback
- Added `loadMegaMenuContentFromDB()` function
- Made `getMegaMenuContent()` async
- Added 15-minute caching

**`app/api/mapping/subcategories-with-images/route.ts`:**
- Updated to use async `getMegaMenuContent()`

**New Files:**
- `scripts/migrate-mega-menu-to-db.ts` - Migration script
- `app/api/admin/mega-menu/route.ts` - Admin API for managing content

## Caching Strategy

**Cache Duration:** 15 minutes (900 seconds)

```typescript
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
```

**How it works:**
1. First request loads from database and caches in memory
2. Subsequent requests use cached data (< 15 min)
3. After 15 minutes, cache expires and reloads from database
4. If database fails, falls back to CSV file

## Admin API

### Get All Mega Menu Content
```bash
GET /api/admin/mega-menu
```

### Update Mega Menu Content
```bash
PUT /api/admin/mega-menu
Content-Type: application/json

{
  "category": "horse",
  "featured_image_url": "https://...",
  "featured_title": "Horse",
  "featured_subtitle": "The best for your horse",
  "featured_link": "/horse",
  "quick_links": [...],
  "subcategory_cards": [...]
}
```

## Production Deployment

### Pre-Deployment Checklist

- [x] Migration script created
- [x] Database table created
- [x] Data imported from CSV
- [x] Code updated to use database
- [x] Fallback to CSV implemented
- [x] Caching implemented
- [x] Admin API created

### Deployment Steps

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Migrate mega menu content to database"
   git push
   ```

2. **Run migration in production:**
   - Option A: Run via Vercel CLI: `vercel env pull && npm run migrate:mega-menu`
   - Option B: Create one-time serverless function to run migration
   - Option C: Run manually via database client

3. **Verify:**
   - Visit production site
   - Hover over categories
   - Check featured images appear

## Fallback Behavior

If database is unavailable:
- ✅ Automatically falls back to CSV file
- ✅ Logs error to console
- ✅ Mega menu still works
- ✅ No user-facing errors

## Future Enhancements

1. **Admin UI:** Create admin page to edit mega menu content
2. **Image Upload:** Add image upload functionality
3. **Preview:** Show preview before saving
4. **Versioning:** Track changes to mega menu content
5. **A/B Testing:** Test different featured images

## Troubleshooting

### Featured Images Not Showing in Production

**Check:**
1. Is the database table created? `SELECT * FROM mega_menu_content;`
2. Is the data imported? Should have 5 rows
3. Are the image URLs accessible? Test in browser
4. Check server logs for errors

**Solution:**
- Re-run migration: `npm run migrate:mega-menu`
- Check database connection in production
- Verify CSV file is included in deployment

### Caching Issues

**Problem:** Updated content not showing

**Solution:**
- Wait 15 minutes for cache to expire
- Redeploy to clear server-side cache
- Update `updated_at` timestamp in database
