# Yotpo to Custom Reviews Migration Guide

## 🎯 Overview

This guide walks you through migrating from Yotpo to a custom review system, reducing app dependencies and costs while maintaining full control.

## 📊 Benefits of Custom Reviews

- ✅ **No Monthly Fees**: Save $15-300+/month on Yotpo subscription
- ✅ **Full Control**: Own your review data
- ✅ **Better Performance**: No external scripts, faster page loads
- ✅ **Custom Design**: Match your brand perfectly
- ✅ **Advanced Features**: Build exactly what you need
- ✅ **No Vendor Lock-in**: Your data, your rules

## 🗄️ Database Options

### Option 1: Vercel Postgres (Recommended)

```bash
# Install Vercel Postgres
npm install @vercel/postgres

# In Vercel Dashboard:
# Storage → Create Database → Postgres
```

**Schema:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL,
  product_handle VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  verified_purchase BOOLEAN DEFAULT false,
  helpful INTEGER DEFAULT 0,
  not_helpful INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  source VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);

CREATE TABLE review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  alt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Option 2: Supabase (Alternative)

```bash
npm install @supabase/supabase-js
```

### Option 3: MongoDB/Mongoose (NoSQL)

```bash
npm install mongodb mongoose
```

## 📥 Step 1: Export Existing Yotpo Reviews

### Method A: Yotpo API Export

```typescript
// scripts/export-yotpo-reviews.ts
import { fetchAllYotpoReviews, transformYotpoReview } from '@/lib/reviews/import-yotpo';
import { getAllProducts } from '@/lib/shopify/products';
import fs from 'fs';

async function exportReviews() {
  // Get all product IDs from Shopify
  const products = await getAllProducts();
  const productIds = products.map(p => p.id.split('/').pop()!);

  console.log(`Exporting reviews for ${productIds.length} products...`);

  // Fetch all reviews from Yotpo
  const reviewsMap = await fetchAllYotpoReviews(productIds);

  // Transform to custom format
  const allReviews = [];
  for (const [productId, reviews] of reviewsMap.entries()) {
    const transformed = reviews.map(transformYotpoReview);
    allReviews.push(...transformed);
  }

  // Save to JSON file
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalReviews: allReviews.length,
    reviews: allReviews,
  };

  fs.writeFileSync(
    'yotpo-reviews-export.json',
    JSON.stringify(exportData, null, 2)
  );

  console.log(`✅ Exported ${allReviews.length} reviews to yotpo-reviews-export.json`);
}

exportReviews();
```

Run it:
```bash
npx tsx scripts/export-yotpo-reviews.ts
```

### Method B: Yotpo Dashboard Export

1. Go to Yotpo Dashboard
2. Navigate to **Reviews** → **Manage Reviews**
3. Click **Export** button
4. Download CSV file
5. Convert CSV to JSON (we'll provide script)

## 📤 Step 2: Import to Your Database

```typescript
// scripts/import-reviews-to-db.ts
import { sql } from '@vercel/postgres';
import fs from 'fs';

async function importReviews() {
  const data = JSON.parse(fs.readFileSync('yotpo-reviews-export.json', 'utf-8'));
  
  console.log(`Importing ${data.totalReviews} reviews...`);

  for (const review of data.reviews) {
    await sql`
      INSERT INTO reviews (
        product_id,
        product_handle,
        rating,
        title,
        content,
        author_name,
        author_email,
        verified_purchase,
        status,
        source,
        created_at
      ) VALUES (
        ${review.productId},
        ${review.productHandle || ''},
        ${review.rating},
        ${review.title},
        ${review.content},
        ${review.authorName},
        ${review.authorEmail || null},
        ${review.verifiedPurchase},
        'approved',
        ${review.source},
        ${review.createdAt}
      )
    `;
  }

  console.log('✅ Import complete!');
}

importReviews();
```

## 🔌 Step 3: Create API Routes

```typescript
// app/api/reviews/[productId]/route.ts
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  const { rows } = await sql`
    SELECT * FROM reviews
    WHERE product_id = ${productId}
    AND status = 'approved'
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ reviews: rows });
}
```

```typescript
// app/api/reviews/route.ts
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { rows } = await sql`
    INSERT INTO reviews (
      product_id,
      rating,
      title,
      content,
      author_name,
      author_email,
      status
    ) VALUES (
      ${body.productId},
      ${body.rating},
      ${body.title},
      ${body.content},
      ${body.authorName},
      ${body.authorEmail},
      'pending'
    )
    RETURNING *
  `;

  return NextResponse.json({ review: rows[0] });
}
```

## 🎨 Step 4: Add Reviews to Product Pages

```typescript
// app/[category]/[subcategory]/[product]/page.tsx

import { ReviewStars } from '@/components/reviews/ReviewStars';
import { ReviewSummary } from '@/components/reviews/ReviewSummary';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewForm } from '@/components/reviews/ReviewForm';

async function getProductReviews(productId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/reviews/${productId}`);
  return res.json();
}

export default async function ProductPage({ params }) {
  const product = await getProductByHandle(productHandle);
  const { reviews, stats } = await getProductReviews(product.id);

  return (
    <div>
      {/* Product details */}
      
      {/* Reviews Section */}
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-6">Customer Reviews</h2>
        
        {/* Summary */}
        <ReviewSummary stats={stats} />
        
        {/* Review List */}
        <div className="mt-8 space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
        
        {/* Write Review Form */}
        <div className="mt-8">
          <ReviewForm productId={product.id} productName={product.title} />
        </div>
      </section>
    </div>
  );
}
```

## 🚀 Step 5: Migration Timeline

### Week 1: Setup
- [x] Create review components (DONE)
- [ ] Set up database (Vercel Postgres)
- [ ] Create API routes
- [ ] Export Yotpo reviews

### Week 2: Import & Test
- [ ] Import reviews to database
- [ ] Test review display on products
- [ ] Test review submission
- [ ] Add moderation workflow

### Week 3: Parallel Run
- [ ] Run custom reviews alongside Yotpo
- [ ] Compare data
- [ ] Fix any issues
- [ ] Train team on moderation

### Week 4: Cutover
- [ ] Switch to custom reviews
- [ ] Remove Yotpo scripts
- [ ] Cancel Yotpo subscription
- [ ] Monitor for issues

## 💰 Cost Comparison

| Feature | Yotpo | Custom |
|---------|-------|--------|
| Monthly Cost | $15-300+ | $0 (Vercel included) |
| Setup Time | 1 hour | 1-2 weeks |
| Customization | Limited | Unlimited |
| Data Ownership | Yotpo | You |
| Performance | External scripts | Native |
| **Annual Savings** | - | **$180-3,600+** |

## 🛠️ Advanced Features to Add

Once you own the system, you can add:

- ✅ **Video Reviews**: Upload video testimonials
- ✅ **Review Rewards**: Points for leaving reviews
- ✅ **Q&A Section**: Product questions alongside reviews
- ✅ **Vendor Reviews**: Rate individual vendors
- ✅ **Review Analytics**: Deep insights into customer sentiment
- ✅ **AI Moderation**: Auto-approve/flag reviews
- ✅ **Review Syndication**: Share reviews across products
- ✅ **Social Proof**: "X people found this helpful"

## 📝 Next Steps

1. **Set up Vercel Postgres** in your Vercel dashboard
2. **Run the export script** to get your Yotpo data
3. **Import reviews** to your database
4. **Test on staging** environment
5. **Go live** and cancel Yotpo

Need help with any step? Check the component files in `components/reviews/` - they're ready to use!





