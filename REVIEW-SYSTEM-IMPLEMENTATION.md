# Complete Review System with Resend Integration

## 🎯 Overview

Build a custom review system that:
- ✅ Imports existing Yotpo reviews
- ✅ Sends automated review request emails via Resend
- ✅ Displays reviews on product pages
- ✅ Includes moderation workflow
- ✅ Saves $180-3,600+/year vs Yotpo

---

## 📧 Resend Integration for Review Requests

### How It Works

1. **Customer places order** → Shopify webhook fires
2. **Wait 7-14 days** → Resend scheduled email sends
3. **Customer clicks link** → Opens review form
4. **Customer submits review** → Saved to database
5. **Admin approves** → Review appears on product page

### Why Resend?

- ✅ **Already integrated** for contact form
- ✅ **Scheduled emails** built-in
- ✅ **Beautiful templates** with HTML
- ✅ **Delivery tracking** and analytics
- ✅ **Cost effective** - 3,000 emails/month free, then $0.40/1000

---

## 🗄️ Database Schema

### Vercel Postgres (Recommended)

```sql
-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(255) NOT NULL,
  product_handle VARCHAR(255) NOT NULL,
  product_title VARCHAR(500) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  verified_purchase BOOLEAN DEFAULT false,
  order_id VARCHAR(255),
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  source VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_product_handle ON reviews(product_handle);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- Review images (optional)
CREATE TABLE review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail TEXT,
  alt TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Review requests tracking
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(255) NOT NULL UNIQUE,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  products JSONB NOT NULL,
  email_sent_at TIMESTAMP,
  email_opened_at TIMESTAMP,
  review_submitted_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_requests_order_id ON review_requests(order_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_email_sent_at ON review_requests(email_sent_at);

-- Aggregate stats (for performance)
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
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_review_stats_product_handle ON review_stats(product_handle);
```

---

## 📥 Step 1: Export Yotpo Reviews

### Option A: Yotpo API Export (Recommended)

```typescript
// scripts/export-yotpo-reviews.ts
import fs from 'fs';

const YOTPO_APP_KEY = process.env.YOTPO_APP_KEY;
const YOTPO_SECRET = process.env.YOTPO_SECRET;

interface YotpoReview {
  id: number;
  score: number;
  title: string;
  content: string;
  name: string;
  email: string;
  verified_buyer: boolean;
  created_at: string;
  product_id: string;
}

async function getYotpoToken() {
  const response = await fetch('https://api.yotpo.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: YOTPO_APP_KEY,
      client_secret: YOTPO_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const data = await response.json();
  return data.access_token;
}

async function fetchYotpoReviews(productId: string, page: number = 1) {
  const response = await fetch(
    `https://api.yotpo.com/v1/apps/${YOTPO_APP_KEY}/products/${productId}/reviews?page=${page}&per_page=100`
  );
  return response.json();
}

async function exportAllReviews() {
  console.log('🔄 Fetching all products from Shopify...');
  
  // Get all product IDs from Shopify
  const products = await getAllShopifyProducts();
  const allReviews: any[] = [];
  
  console.log(`📦 Found ${products.length} products`);
  console.log('📥 Fetching reviews from Yotpo...\n');
  
  for (const product of products) {
    const productId = product.id.split('/').pop()!;
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const data = await fetchYotpoReviews(productId, page);
      
      if (data.response?.reviews?.length > 0) {
        const reviews = data.response.reviews.map((review: YotpoReview) => ({
          productId: productId,
          productHandle: product.handle,
          productTitle: product.title,
          rating: review.score,
          title: review.title || 'Great product',
          content: review.content,
          authorName: review.name,
          authorEmail: review.email,
          verifiedPurchase: review.verified_buyer,
          status: 'approved',
          source: 'yotpo',
          createdAt: review.created_at,
        }));
        
        allReviews.push(...reviews);
        console.log(`  ✓ ${product.title}: ${reviews.length} reviews (page ${page})`);
        
        page++;
        if (reviews.length < 100) hasMore = false;
      } else {
        hasMore = false;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Save to JSON
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalReviews: allReviews.length,
    reviews: allReviews,
  };
  
  fs.writeFileSync(
    'yotpo-reviews-export.json',
    JSON.stringify(exportData, null, 2)
  );
  
  console.log(`\n✅ Exported ${allReviews.length} reviews to yotpo-reviews-export.json`);
}

exportAllReviews();
```

**Run it:**
```bash
# Add to .env.local:
YOTPO_APP_KEY=your_app_key
YOTPO_SECRET=your_secret

# Run export:
npx tsx scripts/export-yotpo-reviews.ts
```

### Option B: Manual CSV Export

1. Go to Yotpo Dashboard
2. Reviews → Manage Reviews → Export
3. Download CSV
4. Use our CSV-to-JSON converter script

---

## 📤 Step 2: Import to Database

```typescript
// scripts/import-reviews-to-db.ts
import { sql } from '@vercel/postgres';
import fs from 'fs';

async function importReviews() {
  const data = JSON.parse(fs.readFileSync('yotpo-reviews-export.json', 'utf-8'));
  
  console.log(`📥 Importing ${data.totalReviews} reviews...`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const review of data.reviews) {
    try {
      await sql`
        INSERT INTO reviews (
          product_id,
          product_handle,
          product_title,
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
          ${review.productHandle},
          ${review.productTitle},
          ${review.rating},
          ${review.title},
          ${review.content},
          ${review.authorName},
          ${review.authorEmail || null},
          ${review.verifiedPurchase || false},
          ${review.status || 'approved'},
          ${review.source || 'yotpo'},
          ${review.createdAt}
        )
      `;
      imported++;
      
      if (imported % 100 === 0) {
        console.log(`  ✓ Imported ${imported}/${data.totalReviews} reviews...`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to import review:`, error);
      skipped++;
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  
  // Update stats
  console.log('\n📊 Updating review stats...');
  await updateAllReviewStats();
  console.log('✅ Stats updated!');
}

async function updateAllReviewStats() {
  await sql`
    INSERT INTO review_stats (
      product_id,
      product_handle,
      total_reviews,
      average_rating,
      rating_1_count,
      rating_2_count,
      rating_3_count,
      rating_4_count,
      rating_5_count
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
      COUNT(*) FILTER (WHERE rating = 5) as rating_5_count
    FROM reviews
    WHERE status = 'approved'
    GROUP BY product_id, product_handle
    ON CONFLICT (product_id)
    DO UPDATE SET
      total_reviews = EXCLUDED.total_reviews,
      average_rating = EXCLUDED.average_rating,
      rating_1_count = EXCLUDED.rating_1_count,
      rating_2_count = EXCLUDED.rating_2_count,
      rating_3_count = EXCLUDED.rating_3_count,
      rating_4_count = EXCLUDED.rating_4_count,
      rating_5_count = EXCLUDED.rating_5_count,
      updated_at = NOW()
  `;
}

importReviews();
```

**Run it:**
```bash
npx tsx scripts/import-reviews-to-db.ts
```

---

## 📧 Step 3: Resend Email Automation

### A. Shopify Webhook Handler

```typescript
// app/api/webhooks/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

// Verify Shopify webhook
function verifyShopifyWebhook(body: string, hmac: string): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(body, 'utf8')
    .digest('base64');
  return hash === hmac;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  
  // Verify webhook
  if (!hmac || !verifyShopifyWebhook(body, hmac)) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 });
  }
  
  const order = JSON.parse(body);
  
  // Extract order details
  const orderId = order.id.toString();
  const customerEmail = order.email;
  const customerName = `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
  
  // Extract products
  const products = order.line_items.map((item: any) => ({
    id: item.product_id.toString(),
    title: item.title,
    handle: item.handle || '',
    image: item.image_url || '',
  }));
  
  // Save review request
  await sql`
    INSERT INTO review_requests (
      order_id,
      customer_email,
      customer_name,
      products,
      status
    ) VALUES (
      ${orderId},
      ${customerEmail},
      ${customerName},
      ${JSON.stringify(products)},
      'pending'
    )
  `;
  
  // Schedule review request email (7 days from now)
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 7);
  
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: customerEmail,
      subject: `How was your recent purchase from The Equestrian?`,
      scheduledAt: scheduledDate.toISOString(),
      html: generateReviewRequestEmail(customerName, products, orderId),
    });
    
    // Update status
    await sql`
      UPDATE review_requests
      SET email_sent_at = ${scheduledDate.toISOString()},
          status = 'scheduled'
      WHERE order_id = ${orderId}
    `;
    
    console.log(`✅ Review request scheduled for ${customerEmail} on ${scheduledDate.toDateString()}`);
  } catch (error) {
    console.error('Failed to schedule review request:', error);
  }
  
  return NextResponse.json({ success: true });
}

function generateReviewRequestEmail(customerName: string, products: any[], orderId: string): string {
  const productCards = products.map(product => `
    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; background: white;">
      <div style="display: flex; gap: 16px; align-items: center;">
        ${product.image ? `
          <img src="${product.image}" alt="${product.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" />
        ` : ''}
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${product.title}</h3>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/review?product=${product.id}&order=${orderId}" 
             style="display: inline-block; background: #E91E8C; color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Write a Review
          </a>
        </div>
      </div>
    </div>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div style="background: linear-gradient(135deg, #E91E8C 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">How was your recent purchase?</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">We'd love to hear your feedback!</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #111827;">Hi ${customerName || 'there'},</p>
          
          <p style="font-size: 16px; color: #6b7280;">
            Thank you for your recent order! We hope you're loving your new products. 
            Your feedback helps other riders make informed decisions and helps us improve.
          </p>
          
          <p style="font-size: 16px; color: #6b7280; font-weight: 600;">
            Click below to review your purchase:
          </p>
          
          ${productCards}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #6b7280;">
              Your review will be published on our website after approval.
            </p>
            <p style="font-size: 12px; color: #6b7280;">
              Questions? Contact us at <a href="mailto:support@theequestrian.com.au" style="color: #E91E8C;">support@theequestrian.com.au</a>
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
          <p>The Equestrian | 41B Luck St, Macclesfield, SA 5153</p>
          <p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe?email=${encodeURIComponent(customerName)}" style="color: #9ca3af;">Unsubscribe</a>
          </p>
        </div>
      </body>
    </html>
  `;
}
```

### B. Review Submission Page

```typescript
// app/review/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product');
  const orderId = searchParams.get('order');
  
  const [product, setProduct] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  useEffect(() => {
    // Fetch product details
    if (productId) {
      fetch(`/api/products/${productId}`)
        .then(res => res.json())
        .then(data => setProduct(data));
    }
  }, [productId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          orderId,
          rating,
          title,
          content,
          authorName: name,
          authorEmail: email,
          verifiedPurchase: !!orderId,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to submit review');
      
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  };
  
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your review has been submitted and will appear on our website after approval.
          </p>
          <a href="/" className="inline-block bg-action text-white px-6 py-3 rounded-full font-semibold hover:bg-action-hover transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Write a Review</h1>
          
          {product && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-8">
              {product.image && (
                <img src={product.image} alt={product.title} className="w-20 h-20 object-cover rounded-lg" />
              )}
              <div>
                <h2 className="font-semibold text-gray-900">{product.title}</h2>
                <p className="text-sm text-gray-500">Share your experience with this product</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-3xl transition-colors"
                  >
                    {star <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
                Review Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Sum up your experience"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>
            
            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-gray-900 mb-2">
                Your Review <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={6}
                placeholder="Tell us what you think about this product..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent resize-none"
              />
            </div>
            
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-action focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">We'll never share your email publicly</p>
            </div>
            
            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || rating === 0}
              className="w-full bg-action text-white font-semibold text-lg py-4 px-6 rounded-full hover:bg-action-hover hover:-translate-y-0.5 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Submitting...' : 'Submit Review'}
            </button>
            
            {status === 'error' && (
              <p className="text-red-600 text-sm text-center">Failed to submit review. Please try again.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
```

---

## 🔌 Step 4: API Routes

### A. Get Reviews for Product

```typescript
// app/api/reviews/[productId]/route.ts
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  
  // Get reviews
  const { rows: reviews } = await sql`
    SELECT * FROM reviews
    WHERE product_id = ${productId}
    AND status = 'approved'
    ORDER BY created_at DESC
  `;
  
  // Get stats
  const { rows: stats } = await sql`
    SELECT * FROM review_stats
    WHERE product_id = ${productId}
  `;
  
  return NextResponse.json({
    reviews,
    stats: stats[0] || {
      total_reviews: 0,
      average_rating: 0,
      rating_1_count: 0,
      rating_2_count: 0,
      rating_3_count: 0,
      rating_4_count: 0,
      rating_5_count: 0,
    },
  });
}
```

### B. Submit Review

```typescript
// app/api/reviews/route.ts
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    if (!body.productId || !body.rating || !body.content || !body.authorName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Insert review
    const { rows } = await sql`
      INSERT INTO reviews (
        product_id,
        product_handle,
        product_title,
        rating,
        title,
        content,
        author_name,
        author_email,
        verified_purchase,
        order_id,
        status,
        source
      ) VALUES (
        ${body.productId},
        ${body.productHandle || ''},
        ${body.productTitle || ''},
        ${body.rating},
        ${body.title},
        ${body.content},
        ${body.authorName},
        ${body.authorEmail || null},
        ${body.verifiedPurchase || false},
        ${body.orderId || null},
        'pending',
        'custom'
      )
      RETURNING *
    `;
    
    // Update review request status if applicable
    if (body.orderId) {
      await sql`
        UPDATE review_requests
        SET review_submitted_at = NOW(),
            status = 'completed'
        WHERE order_id = ${body.orderId}
      `;
    }
    
    return NextResponse.json({ review: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
```

---

## 📋 Implementation Checklist

### Phase 1: Setup (Week 1)
- [ ] Set up Vercel Postgres database
- [ ] Run SQL schema creation
- [ ] Add Resend API key to environment variables
- [ ] Set up Shopify webhook for order creation

### Phase 2: Import (Week 2)
- [ ] Export reviews from Yotpo
- [ ] Import reviews to database
- [ ] Verify all reviews imported correctly
- [ ] Update review stats

### Phase 3: Build (Week 2-3)
- [ ] Create review display components
- [ ] Build review submission form
- [ ] Set up API routes
- [ ] Test review submission flow
- [ ] Test email scheduling

### Phase 4: Test (Week 3)
- [ ] Place test order
- [ ] Verify webhook fires
- [ ] Check email is scheduled
- [ ] Submit test review
- [ ] Verify review appears (after approval)

### Phase 5: Launch (Week 4)
- [ ] Enable webhooks in production
- [ ] Monitor first few orders
- [ ] Remove Yotpo scripts
- [ ] Cancel Yotpo subscription
- [ ] Celebrate savings! 🎉

---

## 💰 Cost Savings

| Service | Yotpo | Custom + Resend |
|---------|-------|-----------------|
| Reviews Platform | $15-300/mo | $0 |
| Email Automation | Included | $0-10/mo |
| Database | N/A | $0 (Vercel included) |
| **Monthly Total** | **$15-300** | **$0-10** |
| **Annual Savings** | - | **$180-3,480** |

---

## 🎯 Next Steps

1. **Read this document** thoroughly
2. **Set up Vercel Postgres** in dashboard
3. **Run export script** to get Yotpo data
4. **Import to database**
5. **Set up Shopify webhook**
6. **Test with a real order**
7. **Go live!**

Need help? All the code is ready to use - just follow the steps! 🚀

