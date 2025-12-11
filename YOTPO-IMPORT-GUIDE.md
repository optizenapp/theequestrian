# Yotpo Review Import Guide

## 🎯 Overview

This guide will help you import your existing Yotpo reviews into your new custom review system.

---

## 📋 Prerequisites

You'll need:
1. **Yotpo App Key** (from Yotpo dashboard)
2. **Yotpo API Secret** (from Yotpo dashboard)
3. Neon Postgres database set up (already done ✅)

---

## 🔑 Step 1: Get Your Yotpo Credentials

### Find Your Yotpo App Key:

1. Log into **Yotpo Dashboard**: https://yap.yotpo.com/
2. Go to **Settings** → **General Settings**
3. Look for **App Key** (it's a long string like `abc123def456...`)
4. Copy it

### Find Your Yotpo API Secret:

1. In the same **General Settings** page
2. Look for **Secret Key** or **API Secret**
3. Click "Show" or "Reveal"
4. Copy it

---

## 🔧 Step 2: Add Credentials to .env.local

Add these to your `.env.local` file:

```bash
# Yotpo API Credentials
YOTPO_APP_KEY=your_app_key_here
YOTPO_API_SECRET=your_api_secret_here
```

---

## 🚀 Step 3: Run the Import Script

```bash
npx tsx scripts/import-yotpo-reviews.ts
```

### What the script does:

1. ✅ Fetches all reviews from Yotpo API
2. ✅ Matches products by URL/handle
3. ✅ Imports into your Neon database
4. ✅ Sets status to 'approved' (since they were already approved in Yotpo)
5. ✅ Marks source as 'yotpo' for tracking
6. ✅ Preserves original creation dates
7. ✅ Handles verified buyer status
8. ✅ Skips duplicates (won't import twice)

### Expected Output:

```
🚀 Starting Yotpo review import...

📥 Fetching page 1...
Found 100 reviews on page 1
✅ Imported review 12345 for Charles Owen 4 Star Helmet
✅ Imported review 12346 for WeatherBeeta ComFiTec Rug
...

📥 Fetching page 2...
Found 45 reviews on page 2
✅ Imported review 12347 for Kentucky Eventing Boots
...

✅ Import complete! Imported 145 reviews.

📊 Review stats:
   Total reviews: 145
   From Yotpo: 145
   Average rating: 4.7⭐
```

---

## 🔍 Step 4: Verify the Import

### Check in Neon Database:

```sql
-- See all imported reviews
SELECT 
  product_title, 
  rating, 
  author_name, 
  source,
  created_at 
FROM reviews 
WHERE source = 'yotpo'
ORDER BY created_at DESC
LIMIT 10;

-- Check stats
SELECT 
  COUNT(*) as total_reviews,
  ROUND(AVG(rating), 2) as avg_rating,
  COUNT(*) FILTER (WHERE source = 'yotpo') as from_yotpo
FROM reviews;
```

### Check on Your Site:

1. Go to any product that had reviews in Yotpo
2. You should see the reviews on the product page
3. The star rating should show under the product title
4. Reviews should appear in the reviews section

---

## 🐛 Troubleshooting

### Error: "YOTPO_APP_KEY is required"
- Make sure you added the credentials to `.env.local`
- Restart your terminal/dev server

### Error: "Failed to get Yotpo access token"
- Check that your API Secret is correct
- Make sure your Yotpo account is active

### Reviews not showing on product pages:
- Check that the product URLs in Yotpo match your site structure
- Run this SQL to see if reviews were imported:
  ```sql
  SELECT product_handle, COUNT(*) 
  FROM reviews 
  WHERE source = 'yotpo' 
  GROUP BY product_handle;
  ```

### Some products missing reviews:
- The script matches products by URL/handle
- If product URLs changed, some reviews might not match
- You can manually update `product_handle` in the database

---

## 📝 Manual Product Mapping (If Needed)

If some reviews didn't import because product URLs changed:

```sql
-- Update product handle for a specific review
UPDATE reviews 
SET 
  product_handle = 'new-handle',
  product_id = 'gid://shopify/Product/123456'
WHERE id = 1;

-- Or update all reviews for a product
UPDATE reviews 
SET 
  product_handle = 'new-handle',
  product_id = 'gid://shopify/Product/123456'
WHERE product_title LIKE '%Product Name%';
```

---

## 🎉 After Import

Once imported:
- ✅ Reviews appear on product pages
- ✅ Star ratings show on collection pages
- ✅ Reviews appear in `/reviews` showcase page
- ✅ Review stats auto-calculate
- ✅ All reviews are marked as "approved"

You can now:
- Continue using your new review system
- New reviews will be added alongside imported ones
- Moderate new reviews via admin dashboard
- Yotpo reviews are preserved with `source = 'yotpo'` tag

---

## 🔄 Re-running the Import

The script is safe to run multiple times:
- Uses `ON CONFLICT DO NOTHING` to skip duplicates
- Won't create duplicate reviews
- Safe to run if you add more reviews to Yotpo

---

## 📞 Need Help?

If you encounter issues:
1. Check the console output for specific errors
2. Verify your Yotpo credentials
3. Check the database for imported reviews
4. Look at the script logs for which products failed

---

**Ready to import? Run the script and your Yotpo reviews will be live!** 🚀

