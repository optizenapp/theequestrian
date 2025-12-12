# Review System - Deployment Checklist

## 🎉 What's Been Built

### ✅ Frontend Components
- **ReviewStars** - Star rating display with half-star support
- **ProductReviewBadge** - Compact badge for collection pages with hover breakdown
- **ReviewSummary** - Full stats summary with animated rating breakdown
- **ReviewCard** - Individual review display with helpful/not-helpful voting
- **ReviewForm** - Complete review submission form with validation
- **ProductReviewSection** - Full review section for product pages

### ✅ Pages
- **/review** - Review submission page (with product and order context)
- **/reviews** - Reviews showcase page with filtering, sorting, and search

### ✅ API Routes
- `GET /api/reviews/stats/[productId]` - Get review statistics
- `GET /api/reviews/[productId]` - Get all reviews for a product
- `POST /api/reviews` - Submit a new review
- `POST /api/webhooks/shopify/orders` - Shopify webhook handler for order fulfillment

### ✅ Integrations
- Product pages now display reviews section
- Collection pages show review badges on product cards
- Resend email integration for review requests

---

## 📋 Deployment Steps

### 1. Set Up Vercel Postgres

**Why:** Store review data in a production database.

```bash
# In your Vercel dashboard:
# 1. Go to your project
# 2. Click "Storage" tab
# 3. Click "Create Database"
# 4. Select "Postgres"
# 5. Name it "reviews-db"
# 6. Click "Create"
```

**Then run the SQL schema:**

```sql
-- Create reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  product_handle VARCHAR(255) NOT NULL,
  product_title VARCHAR(500) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  content TEXT NOT NULL,
  author_name VARCHAR(200) NOT NULL,
  author_email VARCHAR(255),
  verified_purchase BOOLEAN DEFAULT FALSE,
  order_id VARCHAR(255),
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  source VARCHAR(50) DEFAULT 'custom' CHECK (source IN ('custom', 'yotpo', 'imported')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_product_handle ON reviews(product_handle);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Create review_stats table (for fast aggregations)
CREATE TABLE review_stats (
  product_id VARCHAR(255) PRIMARY KEY,
  product_handle VARCHAR(255) NOT NULL,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  rating_1_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_stats_product_handle ON review_stats(product_handle);

-- Function to update review stats
CREATE OR REPLACE FUNCTION update_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate stats for the affected product
  INSERT INTO review_stats (
    product_id,
    product_handle,
    total_reviews,
    average_rating,
    rating_1_count,
    rating_2_count,
    rating_3_count,
    rating_4_count,
    rating_5_count,
    updated_at
  )
  SELECT
    product_id,
    product_handle,
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as average_rating,
    COUNT(*) FILTER (WHERE rating = 1) as rating_1_count,
    COUNT(*) FILTER (WHERE rating = 2) as rating_2_count,
    COUNT(*) FILTER (WHERE rating = 3) as rating_3_count,
    COUNT(*) FILTER (WHERE rating = 4) as rating_4_count,
    COUNT(*) FILTER (WHERE rating = 5) as rating_5_count,
    CURRENT_TIMESTAMP
  FROM reviews
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    AND status = 'approved'
  GROUP BY product_id, product_handle
  ON CONFLICT (product_id)
  DO UPDATE SET
    product_handle = EXCLUDED.product_handle,
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    rating_1_count = EXCLUDED.rating_1_count,
    rating_2_count = EXCLUDED.rating_2_count,
    rating_3_count = EXCLUDED.rating_3_count,
    rating_4_count = EXCLUDED.rating_4_count,
    rating_5_count = EXCLUDED.rating_5_count,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
CREATE TRIGGER trigger_update_review_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_review_stats();
```

### 2. Update API Routes to Use Database

Replace the mock data in these files with actual database queries:

**`app/api/reviews/stats/[productId]/route.ts`:**
```typescript
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  
  const { rows } = await sql`
    SELECT * FROM review_stats
    WHERE product_id = ${productId}
  `;
  
  return NextResponse.json(rows[0] || {
    product_id: productId,
    total_reviews: 0,
    average_rating: 0,
    rating_1_count: 0,
    rating_2_count: 0,
    rating_3_count: 0,
    rating_4_count: 0,
    rating_5_count: 0,
  });
}
```

**`app/api/reviews/[productId]/route.ts`:**
```typescript
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  
  const { rows: reviews } = await sql`
    SELECT * FROM reviews
    WHERE product_id = ${productId}
    AND status = 'approved'
    ORDER BY created_at DESC
  `;

  const { rows: stats } = await sql`
    SELECT * FROM review_stats
    WHERE product_id = ${productId}
  `;
  
  return NextResponse.json({
    reviews,
    stats: stats[0] || { /* default stats */ },
  });
}
```

**`app/api/reviews/route.ts`:**
```typescript
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Validation...
  
  const { rows } = await sql`
    INSERT INTO reviews (
      product_id, product_handle, product_title,
      rating, title, content,
      author_name, author_email,
      verified_purchase, order_id,
      status, source
    ) VALUES (
      ${body.productId}, ${body.productHandle}, ${body.productTitle},
      ${body.rating}, ${body.title}, ${body.content},
      ${body.authorName}, ${body.authorEmail || null},
      ${body.verifiedPurchase || false}, ${body.orderId || null},
      'pending', 'custom'
    )
    RETURNING *
  `;
  
  return NextResponse.json({ review: rows[0] }, { status: 201 });
}
```

### 3. Environment Variables

Add these to your `.env.local` and Vercel:

```bash
# Resend (already set up)
RESEND_API_KEY=re_f4oQgSn1_5bCfEbhbQpFPZ8mggKytYFQJ
RESEND_FROM_EMAIL=reviews@theequestrian.com.au
CONTACT_EMAIL=support@theequestrian.com.au

# Shopify Webhook
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_from_shopify

# Site URL
NEXT_PUBLIC_SITE_URL=https://theequestrian.com.au

# Vercel Postgres (auto-added by Vercel)
POSTGRES_URL=...
POSTGRES_PRISMA_URL=...
POSTGRES_URL_NON_POOLING=...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
```

### 4. Set Up Shopify Webhook

1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Click "Create webhook"
3. Configure:
   - **Event:** Order fulfillment
   - **Format:** JSON
   - **URL:** `https://theequestrian.com.au/api/webhooks/shopify/orders`
   - **Webhook API version:** 2024-01 (or latest)
4. Copy the webhook signing secret
5. Add it to your environment variables as `SHOPIFY_WEBHOOK_SECRET`

### 5. Import Yotpo Reviews (Optional)

See `REVIEW-SYSTEM-IMPLEMENTATION.md` for the Yotpo export/import script.

### 6. Test the System

**Local Testing:**
```bash
npm run dev

# Test review submission:
# 1. Go to any product page
# 2. Scroll to reviews section
# 3. Click "Write a Review"
# 4. Submit a review

# Test review request email:
# 1. Use a tool like ngrok to expose localhost
# 2. Update Shopify webhook URL to ngrok URL
# 3. Place a test order and fulfill it
# 4. Check your email
```

**Production Testing:**
```bash
# After deploying to Vercel:
# 1. Update Shopify webhook URL to production URL
# 2. Place a test order
# 3. Fulfill the order
# 4. Check customer email for review request
```

---

## 🚀 Quick Deploy

```bash
# Commit all changes
git add -A
git commit -m "Add complete review system"
git push origin main

# Vercel will auto-deploy
# Then:
# 1. Set up Vercel Postgres
# 2. Run SQL schema
# 3. Update API routes to use database
# 4. Add environment variables
# 5. Set up Shopify webhook
```

---

## 📊 Admin Dashboard (Future Enhancement)

You may want to build an admin dashboard to:
- Approve/reject pending reviews
- Respond to reviews
- View analytics
- Moderate content

This can be added as `/admin/reviews` with authentication.

---

## 🎯 Success Metrics

After deployment, monitor:
- **Review submission rate** (% of customers who leave reviews)
- **Average rating** across all products
- **Email open rate** for review requests
- **Time to first review** after purchase

---

## 🐛 Troubleshooting

**Reviews not showing:**
- Check database connection
- Verify reviews are approved (`status = 'approved'`)
- Check API route responses in Network tab

**Emails not sending:**
- Verify Resend API key is correct
- Check domain verification in Resend dashboard
- Look for errors in Vercel logs

**Webhook not working:**
- Verify webhook secret matches
- Check Vercel logs for webhook requests
- Test webhook signature verification

---

## 📚 Related Documentation

- `REVIEW-SYSTEM-IMPLEMENTATION.md` - Technical implementation details
- `REVIEW-SYSTEM-QUICK-START.md` - Quick start guide
- `REVIEW-FRONTEND-COMPONENTS.md` - Component documentation
- `CONTACT-FORM-SETUP.md` - Resend setup guide


