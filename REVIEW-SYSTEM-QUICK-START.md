# Review System - Quick Start Guide

## 🎯 What You're Building

A complete review system that:
1. ✅ Imports your existing Yotpo reviews
2. ✅ Automatically emails customers 7 days after purchase (via Resend)
3. ✅ Displays reviews on product pages
4. ✅ Includes moderation workflow
5. ✅ Saves $180-3,600/year

---

## 📧 Yes, You Can Use Resend!

**Resend is perfect for review request emails:**

- ✅ **Already integrated** - You're using it for contact form
- ✅ **Scheduled emails** - Built-in delay (7 days after purchase)
- ✅ **Beautiful templates** - HTML email with product images
- ✅ **Tracking** - See who opens and clicks
- ✅ **Cost effective** - 3,000 emails/month free, then $0.40/1000

### How It Works:

```
Customer buys → Shopify webhook → Save to DB → Schedule Resend email (7 days)
                                                         ↓
Customer clicks "Write Review" → Review form → Submit → Pending approval → Live!
```

---

## 🚀 Quick Setup (30 Minutes)

### 1. Set Up Database (10 min)

**In Vercel Dashboard:**
1. Go to your project
2. Click **Storage** tab
3. Click **Create Database** → **Postgres**
4. Name it: `reviews-db`
5. Click **Create**

**Run SQL Schema:**
```bash
# Copy the SQL from REVIEW-SYSTEM-IMPLEMENTATION.md
# Paste into Vercel Postgres Query tab
# Click "Run Query"
```

### 2. Add Environment Variables (5 min)

**In `.env.local`:**
```bash
# Already have these:
RESEND_API_KEY=re_f4oQgSn1_5bCfEbhbQpFPZ8mggKytYFQJ
RESEND_FROM_EMAIL=noreply@theequestrian.com.au

# Add these:
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_from_shopify
YOTPO_APP_KEY=your_yotpo_app_key
YOTPO_SECRET=your_yotpo_secret
```

**In Vercel Dashboard:**
- Add same variables to Environment Variables

### 3. Export Yotpo Reviews (10 min)

```bash
# Create the export script (provided in docs)
npx tsx scripts/export-yotpo-reviews.ts

# This creates: yotpo-reviews-export.json
```

### 4. Import to Database (5 min)

```bash
# Create the import script (provided in docs)
npx tsx scripts/import-reviews-to-db.ts

# Reviews are now in your database!
```

---

## 📝 What's Already Done

From your existing `YOTPO-MIGRATION.md`:
- ✅ Database schema designed
- ✅ Review components planned
- ✅ API routes outlined
- ✅ Migration strategy documented

**New additions:**
- ✅ Resend email automation
- ✅ Shopify webhook handler
- ✅ Review request tracking
- ✅ Beautiful email templates
- ✅ Complete code examples

---

## 📧 Email Flow Details

### When Emails Send:

```
Day 0: Customer places order
  ↓
Day 7: Resend sends review request email
  ↓
Customer clicks "Write a Review"
  ↓
Opens review form with product pre-filled
  ↓
Submits review
  ↓
You approve in admin
  ↓
Review appears on product page
```

### Email Contains:

- Personalized greeting
- Product image & name
- "Write a Review" button for each product
- Beautiful branded design
- Unsubscribe link

### Tracking:

```sql
-- See all review requests
SELECT * FROM review_requests;

-- See completion rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as completion_rate
FROM review_requests;
```

---

## 🎨 Review Display on Product Pages

Reviews will show:
- ⭐ Star rating summary
- 📊 Rating breakdown (5★: 80%, 4★: 15%, etc.)
- 💬 Individual reviews with:
  - Customer name
  - Rating
  - Title
  - Content
  - Date
  - "Verified Purchase" badge
  - Helpful/Not Helpful buttons

---

## 🛠️ Files You'll Create

Based on the implementation guide:

```
scripts/
├── export-yotpo-reviews.ts       # Export from Yotpo
└── import-reviews-to-db.ts       # Import to Postgres

app/
├── api/
│   ├── reviews/
│   │   ├── route.ts              # Submit review
│   │   └── [productId]/route.ts  # Get reviews
│   └── webhooks/
│       └── orders/
│           └── create/route.ts   # Shopify webhook
└── review/
    └── page.tsx                  # Review submission form

components/
└── reviews/
    ├── ReviewStars.tsx           # Star display
    ├── ReviewSummary.tsx         # Stats summary
    ├── ReviewCard.tsx            # Individual review
    └── ReviewForm.tsx            # Write review form
```

---

## 💡 Key Decisions

### 1. When to Send Review Requests?

**Recommended: 7 days after delivery**

```typescript
// In webhook handler:
const scheduledDate = new Date();
scheduledDate.setDate(scheduledDate.getDate() + 7);
```

**Options:**
- 3 days: Quick feedback, may be too soon
- 7 days: ✅ Recommended - enough time to use product
- 14 days: More usage time, lower response rate
- 30 days: Too late, customer may forget

### 2. Auto-Approve or Manual Review?

**Recommended: Manual approval for first 100 reviews**

```typescript
status: 'pending'  // Requires approval
// vs
status: 'approved' // Auto-published
```

**Later:** Add AI moderation to auto-approve good reviews

### 3. Incentivize Reviews?

**Options:**
- Discount code after review submission
- Entry into monthly draw
- Loyalty points
- No incentive (most authentic)

---

## 📊 Monitoring & Analytics

### Track Performance:

```sql
-- Review request stats
SELECT 
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as emails_sent,
  COUNT(*) FILTER (WHERE review_submitted_at IS NOT NULL) as reviews_submitted,
  COUNT(*) FILTER (WHERE review_submitted_at IS NOT NULL) * 100.0 / 
    COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as conversion_rate
FROM review_requests;

-- Top reviewed products
SELECT 
  product_title,
  total_reviews,
  average_rating
FROM review_stats
ORDER BY total_reviews DESC
LIMIT 10;

-- Recent reviews pending approval
SELECT 
  product_title,
  author_name,
  rating,
  title,
  created_at
FROM reviews
WHERE status = 'pending'
ORDER BY created_at DESC;
```

---

## 🎯 Success Metrics

**Target KPIs:**

| Metric | Target | Industry Average |
|--------|--------|------------------|
| Email Open Rate | 40%+ | 35% |
| Click-Through Rate | 15%+ | 10% |
| Review Submission Rate | 5%+ | 3-5% |
| Average Rating | 4.0+ | 4.2 |
| Response Time | <48hrs | 24-72hrs |

---

## 🚨 Common Issues & Solutions

### Issue: Emails not sending

**Check:**
1. Resend API key is correct
2. Domain is verified in Resend
3. `RESEND_FROM_EMAIL` matches verified domain
4. Webhook is receiving orders

### Issue: Reviews not appearing

**Check:**
1. Review status is 'approved'
2. Product ID matches
3. Database connection is working
4. Cache is cleared

### Issue: Webhook not firing

**Check:**
1. Webhook URL is correct in Shopify
2. Webhook secret matches
3. HMAC verification is passing
4. Check Shopify webhook logs

---

## 📚 Documentation

**Full guides available:**

1. **REVIEW-SYSTEM-IMPLEMENTATION.md** - Complete technical guide
2. **YOTPO-MIGRATION.md** - Original migration plan
3. **This file** - Quick start guide

---

## ✅ Next Steps

**Today:**
1. [ ] Set up Vercel Postgres
2. [ ] Run SQL schema
3. [ ] Add environment variables

**This Week:**
1. [ ] Export Yotpo reviews
2. [ ] Import to database
3. [ ] Create API routes
4. [ ] Build review components

**Next Week:**
1. [ ] Set up Shopify webhook
2. [ ] Test with real order
3. [ ] Launch!

---

## 🎉 Benefits

Once live, you'll have:

- ✅ **$180-3,600/year savings** vs Yotpo
- ✅ **Full control** over your review data
- ✅ **Automated emails** via Resend
- ✅ **Better performance** (no external scripts)
- ✅ **Custom design** matching your brand
- ✅ **Advanced features** you can build yourself

---

**Ready to start?** Begin with Step 1: Set up Vercel Postgres! 🚀


