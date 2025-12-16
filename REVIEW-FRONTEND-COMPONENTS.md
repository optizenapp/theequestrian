# Review Frontend Components - Complete Guide

## 🎯 Overview

Complete review UI system with:
- ✅ **Collection Pages** - Star ratings and review count on product cards
- ✅ **Product Pages** - Full review display with summary, filters, and form
- ✅ **Reviews Showcase Page** - Beautiful collage of all reviews
- ✅ **Review Widgets** - Reusable components throughout site

---

## 📍 Where Reviews Appear

### 1. Collection Pages (`/horse/rugs`)
- Star rating on each product card
- Review count (e.g., "4.8 ★ (24 reviews)")
- Hover shows rating breakdown

### 2. Product Pages (`/horse/rugs/product-name`)
- Review summary at top
- Rating breakdown chart
- Individual review cards
- Write review button
- Filter/sort options
- Pagination

### 3. Reviews Showcase Page (`/reviews`)
- Hero section with overall stats
- Featured reviews
- Review collage/masonry layout
- Filter by rating, product, category
- Search reviews

### 4. Homepage (Optional)
- "Recent Reviews" carousel
- "Top Rated Products" section

---

## 🎨 Component Architecture

```
components/reviews/
├── ReviewStars.tsx           # Star rating display
├── ReviewSummary.tsx         # Stats summary with chart
├── ReviewCard.tsx            # Individual review card
├── ReviewForm.tsx            # Write review form
├── ReviewList.tsx            # List with filters/sort
├── ReviewCollage.tsx         # Masonry layout
├── ProductReviewBadge.tsx    # Badge for product cards
└── ReviewShowcase.tsx        # Homepage carousel
```

---

## 📦 Component Code

### 1. ReviewStars.tsx - Star Rating Display

```typescript
// components/reviews/ReviewStars.tsx
interface ReviewStarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  count?: number;
}

export function ReviewStars({ 
  rating, 
  size = 'md', 
  showNumber = false,
  count 
}: ReviewStarsProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className="flex items-center gap-1">
      <div className={`flex items-center ${sizeClasses[size]}`}>
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400">★</span>
        ))}
        
        {/* Half star */}
        {hasHalfStar && (
          <span className="relative">
            <span className="text-gray-300">★</span>
            <span className="absolute inset-0 overflow-hidden w-1/2 text-yellow-400">★</span>
          </span>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300">★</span>
        ))}
      </div>
      
      {showNumber && (
        <span className="text-sm text-gray-600 ml-1">
          {rating.toFixed(1)}
          {count !== undefined && ` (${count})`}
        </span>
      )}
    </div>
  );
}
```

---

### 2. ProductReviewBadge.tsx - For Collection Pages

```typescript
// components/reviews/ProductReviewBadge.tsx
'use client';

import { ReviewStars } from './ReviewStars';
import { useState } from 'react';

interface ProductReviewBadgeProps {
  productId: string;
  productHandle: string;
  compact?: boolean;
}

export function ProductReviewBadge({ 
  productId, 
  productHandle,
  compact = false 
}: ProductReviewBadgeProps) {
  const [stats, setStats] = useState<any>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Fetch review stats
  useState(() => {
    fetch(`/api/reviews/stats/${productId}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});
  });
  
  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="text-xs text-gray-400">
        No reviews yet
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-yellow-400">★</span>
        <span className="font-medium">{stats.average_rating.toFixed(1)}</span>
        <span className="text-gray-500">({stats.total_reviews})</span>
      </div>
    );
  }
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
    >
      <div className="flex items-center gap-2">
        <ReviewStars rating={stats.average_rating} size="sm" />
        <span className="text-sm text-gray-600">
          {stats.average_rating.toFixed(1)} ({stats.total_reviews} reviews)
        </span>
      </div>
      
      {/* Hover breakdown */}
      {showBreakdown && (
        <div className="absolute z-10 left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64">
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats[`rating_${star}_count`] || 0;
              const percentage = stats.total_reviews > 0 
                ? (count / stats.total_reviews) * 100 
                : 0;
              
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-gray-600">{star}★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 3. ReviewSummary.tsx - Product Page Summary

```typescript
// components/reviews/ReviewSummary.tsx
import { ReviewStars } from './ReviewStars';

interface ReviewSummaryProps {
  stats: {
    total_reviews: number;
    average_rating: number;
    rating_1_count: number;
    rating_2_count: number;
    rating_3_count: number;
    rating_4_count: number;
    rating_5_count: number;
  };
  onWriteReview?: () => void;
}

export function ReviewSummary({ stats, onWriteReview }: ReviewSummaryProps) {
  const total = stats.total_reviews;
  
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Overall Rating */}
        <div className="text-center md:text-left">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Customer Reviews
          </h3>
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <span className="text-5xl font-bold text-gray-900">
              {stats.average_rating.toFixed(1)}
            </span>
            <div>
              <ReviewStars rating={stats.average_rating} size="lg" />
              <p className="text-sm text-gray-600 mt-1">
                Based on {total} {total === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          
          {onWriteReview && (
            <button
              onClick={onWriteReview}
              className="inline-flex items-center gap-2 bg-action text-white px-6 py-3 rounded-full font-semibold hover:bg-action-hover transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Write a Review
            </button>
          )}
        </div>
        
        {/* Right: Rating Breakdown */}
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats[`rating_${star}_count` as keyof typeof stats] as number || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-12">
                  {star} star
                </span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

### 4. ReviewCard.tsx - Individual Review Display

```typescript
// components/reviews/ReviewCard.tsx
import { ReviewStars } from './ReviewStars';
import { useState } from 'react';

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  product_title?: string;
}

interface ReviewCardProps {
  review: Review;
  showProduct?: boolean;
  onHelpful?: (reviewId: string) => void;
  onNotHelpful?: (reviewId: string) => void;
}

export function ReviewCard({ 
  review, 
  showProduct = false,
  onHelpful,
  onNotHelpful 
}: ReviewCardProps) {
  const [voted, setVoted] = useState<'helpful' | 'not-helpful' | null>(null);
  
  const handleVote = (type: 'helpful' | 'not-helpful') => {
    if (voted) return; // Already voted
    
    setVoted(type);
    if (type === 'helpful' && onHelpful) {
      onHelpful(review.id);
    } else if (type === 'not-helpful' && onNotHelpful) {
      onNotHelpful(review.id);
    }
  };
  
  const date = new Date(review.created_at).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ReviewStars rating={review.rating} size="sm" />
            {review.verified_purchase && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified Purchase
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 text-lg">{review.title}</h4>
        </div>
        <span className="text-sm text-gray-500">{date}</span>
      </div>
      
      {/* Content */}
      <p className="text-gray-700 leading-relaxed mb-4">{review.content}</p>
      
      {/* Product (if shown on reviews page) */}
      {showProduct && review.product_title && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            Review for: <span className="font-medium text-gray-700">{review.product_title}</span>
          </p>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-action/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-action">
              {review.author_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-700">{review.author_name}</span>
        </div>
        
        {/* Helpful buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleVote('helpful')}
            disabled={voted !== null}
            className={`flex items-center gap-1 text-sm transition-colors ${
              voted === 'helpful' 
                ? 'text-green-600 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            } disabled:cursor-not-allowed`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span>Helpful ({review.helpful_count + (voted === 'helpful' ? 1 : 0)})</span>
          </button>
          
          <button
            onClick={() => handleVote('not-helpful')}
            disabled={voted !== null}
            className={`flex items-center gap-1 text-sm transition-colors ${
              voted === 'not-helpful' 
                ? 'text-red-600 font-medium' 
                : 'text-gray-500 hover:text-gray-700'
            } disabled:cursor-not-allowed`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 5. ReviewList.tsx - Product Page Review List

```typescript
// components/reviews/ReviewList.tsx
'use client';

import { useState } from 'react';
import { ReviewCard } from './ReviewCard';

interface ReviewListProps {
  reviews: any[];
  productId: string;
}

export function ReviewList({ reviews: initialReviews, productId }: ReviewListProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [sort, setSort] = useState<'recent' | 'helpful' | 'rating'>('recent');
  
  // Filter reviews
  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(r => r.rating === parseInt(filter));
  
  // Sort reviews
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sort === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sort === 'helpful') {
      return b.helpful_count - a.helpful_count;
    } else {
      return b.rating - a.rating;
    }
  });
  
  const handleHelpful = async (reviewId: string) => {
    await fetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' });
    // Update local state
    setReviews(reviews.map(r => 
      r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
    ));
  };
  
  const handleNotHelpful = async (reviewId: string) => {
    await fetch(`/api/reviews/${reviewId}/not-helpful`, { method: 'POST' });
    // Update local state
    setReviews(reviews.map(r => 
      r.id === reviewId ? { ...r, not_helpful_count: r.not_helpful_count + 1 } : r
    ));
  };
  
  return (
    <div>
      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Filter by rating */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            {['all', '5', '4', '3', '2', '1'].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilter(rating as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === rating
                    ? 'bg-action text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating === 'all' ? 'All' : `${rating}★`}
              </button>
            ))}
          </div>
        </div>
        
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-action focus:border-transparent"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rating</option>
          </select>
        </div>
      </div>
      
      {/* Review count */}
      <p className="text-sm text-gray-600 mb-4">
        Showing {sortedReviews.length} of {reviews.length} reviews
      </p>
      
      {/* Reviews */}
      <div className="space-y-4">
        {sortedReviews.length > 0 ? (
          sortedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onHelpful={handleHelpful}
              onNotHelpful={handleNotHelpful}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-500">No reviews match your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 📄 Page Implementations

### 1. Collection Page Integration

```typescript
// app/[category]/[subcategory]/page.tsx

import { ProductReviewBadge } from '@/components/reviews/ProductReviewBadge';

export default async function SubcategoryPage({ params }) {
  const products = await getProducts();
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <div key={product.id} className="group">
          {/* Product image */}
          <Link href={`/products/${product.handle}`}>
            <img src={product.image} alt={product.title} />
          </Link>
          
          {/* Product info */}
          <div className="mt-3">
            <h3 className="font-semibold text-gray-900">{product.title}</h3>
            
            {/* Review badge */}
            <div className="mt-2">
              <ProductReviewBadge 
                productId={product.id} 
                productHandle={product.handle}
              />
            </div>
            
            <p className="mt-2 font-bold text-gray-900">${product.price}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 2. Product Page Integration

```typescript
// app/[category]/[subcategory]/[product]/page.tsx

import { ReviewSummary } from '@/components/reviews/ReviewSummary';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';

async function getProductReviews(productId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/reviews/${productId}`, {
    cache: 'no-store'
  });
  return res.json();
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.product);
  const { reviews, stats } = await getProductReviews(product.id);
  
  return (
    <div>
      {/* Product details */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Images, price, add to cart, etc. */}
      </div>
      
      {/* Reviews Section */}
      <section id="reviews" className="mt-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
        
        {/* Summary */}
        <ReviewSummary 
          stats={stats}
          onWriteReview={() => {
            document.getElementById('write-review')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        
        {/* Review List */}
        <div className="mt-8">
          <ReviewList reviews={reviews} productId={product.id} />
        </div>
        
        {/* Write Review Form */}
        <div id="write-review" className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Write a Review</h3>
          <ReviewForm 
            productId={product.id}
            productHandle={product.handle}
            productTitle={product.title}
          />
        </div>
      </section>
    </div>
  );
}
```

---

### 3. Reviews Showcase Page (`/reviews`)

```typescript
// app/reviews/page.tsx
import { Metadata } from 'next';
import { ReviewCollage } from '@/components/reviews/ReviewCollage';
import { ReviewCard } from '@/components/reviews/ReviewCard';

export const metadata: Metadata = {
  title: 'Customer Reviews | The Equestrian',
  description: 'See what our customers are saying about their purchases from The Equestrian.',
};

async function getAllReviews() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/reviews/all`, {
    cache: 'no-store'
  });
  return res.json();
}

export default async function ReviewsPage() {
  const { reviews, stats } = await getAllReviews();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-action to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Customer Reviews
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              Real feedback from real riders across Australia
            </p>
            
            {/* Overall Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div>
                <div className="text-4xl font-bold">{stats.total_reviews.toLocaleString()}</div>
                <div className="text-white/80 text-sm">Total Reviews</div>
              </div>
              <div>
                <div className="text-4xl font-bold">{stats.average_rating.toFixed(1)}★</div>
                <div className="text-white/80 text-sm">Average Rating</div>
              </div>
              <div>
                <div className="text-4xl font-bold">{stats.verified_percentage}%</div>
                <div className="text-white/80 text-sm">Verified Purchases</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Featured Reviews */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Reviews</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {reviews.featured.map((review: any) => (
            <ReviewCard 
              key={review.id} 
              review={review}
              showProduct={true}
            />
          ))}
        </div>
        
        {/* All Reviews - Masonry Layout */}
        <h2 className="text-3xl font-bold text-gray-900 mb-8">All Reviews</h2>
        <ReviewCollage reviews={reviews.all} />
      </div>
    </div>
  );
}
```

---

### 4. ReviewCollage.tsx - Masonry Layout

```typescript
// components/reviews/ReviewCollage.tsx
'use client';

import { useState } from 'react';
import { ReviewCard } from './ReviewCard';

interface ReviewCollageProps {
  reviews: any[];
}

export function ReviewCollage({ reviews: initialReviews }: ReviewCollageProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<'all' | '5' | '4'>('all');
  const [category, setCategory] = useState<string>('all');
  
  // Filter logic
  const filteredReviews = reviews.filter(review => {
    if (filter !== 'all' && review.rating !== parseInt(filter)) return false;
    if (category !== 'all' && !review.product_handle.startsWith(category)) return false;
    return true;
  });
  
  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Rating:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              filter === 'all' ? 'bg-action text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('5')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              filter === '5' ? 'bg-action text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            5★ Only
          </button>
          <button
            onClick={() => setFilter('4')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              filter === '4' ? 'bg-action text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            4★+
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Category:</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Products</option>
            <option value="horse">Horse</option>
            <option value="rider">Rider</option>
            <option value="pet">Pet</option>
            <option value="clothing">Clothing</option>
          </select>
        </div>
      </div>
      
      {/* Masonry Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {filteredReviews.map((review) => (
          <div key={review.id} className="break-inside-avoid">
            <ReviewCard review={review} showProduct={true} />
          </div>
        ))}
      </div>
      
      {filteredReviews.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">No reviews match your filters.</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 Design Features

### Visual Highlights:
- ✅ **Star ratings** with half-star support
- ✅ **Verified purchase badges** in green
- ✅ **Hover tooltips** on collection pages
- ✅ **Rating breakdown charts** with animated bars
- ✅ **Helpful/Not helpful** voting buttons
- ✅ **Masonry layout** for reviews showcase
- ✅ **Filter & sort** options
- ✅ **Responsive design** for all devices

### Brand Consistency:
- Pink action color throughout
- Rounded corners (rounded-xl, rounded-full)
- Smooth transitions and hover effects
- Clean, modern typography
- Professional spacing and layout

---

## 📊 API Routes Needed

```typescript
// app/api/reviews/stats/[productId]/route.ts
// Returns: { total_reviews, average_rating, rating_X_count }

// app/api/reviews/[productId]/route.ts
// Returns: { reviews: [], stats: {} }

// app/api/reviews/all/route.ts
// Returns: { reviews: { featured: [], all: [] }, stats: {} }

// app/api/reviews/[reviewId]/helpful/route.ts
// POST: Increment helpful count

// app/api/reviews/[reviewId]/not-helpful/route.ts
// POST: Increment not helpful count
```

---

## ✅ Implementation Checklist

- [ ] Create all review components
- [ ] Add ProductReviewBadge to collection pages
- [ ] Add full review section to product pages
- [ ] Create /reviews showcase page
- [ ] Build API routes for stats and voting
- [ ] Test on mobile devices
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test with real data

---

All components are ready to build! Want me to start creating them? 🚀



