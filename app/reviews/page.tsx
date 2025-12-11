'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReviewCard from '@/components/reviews/ReviewCard';
import ReviewStars from '@/components/reviews/ReviewStars';

// Mock data - TODO: Replace with actual API call
const MOCK_REVIEWS = [
  {
    id: '1',
    productId: 'gid://shopify/Product/1',
    productHandle: 'charles-owen-4-star-helmet',
    productTitle: 'Charles Owen 4 Star Helmet',
    rating: 5,
    title: 'Best helmet I\'ve ever owned',
    content: 'Incredibly comfortable and feels very secure. The ventilation is excellent and it looks great too. Worth every penny!',
    authorName: 'Sarah M.',
    verifiedPurchase: true,
    helpfulCount: 12,
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    productId: 'gid://shopify/Product/2',
    productHandle: 'weatherbeeta-comfitec-classic-combo',
    productTitle: 'WeatherBeeta ComFiTec Classic Combo',
    rating: 4,
    title: 'Great quality rug',
    content: 'Really pleased with this rug. Fits my horse well and seems very durable. Only 4 stars because the leg straps could be a bit longer.',
    authorName: 'Emma L.',
    verifiedPurchase: true,
    helpfulCount: 8,
    createdAt: '2024-01-10T14:20:00Z',
  },
  {
    id: '3',
    productId: 'gid://shopify/Product/3',
    productHandle: 'kentucky-eventing-boots',
    productTitle: 'Kentucky Eventing Boots',
    rating: 5,
    title: 'Excellent protection',
    content: 'These boots are fantastic! Great protection for cross country and they wash up beautifully. My horse seems comfortable in them too.',
    authorName: 'James P.',
    verifiedPurchase: true,
    helpfulCount: 15,
    createdAt: '2024-01-08T09:15:00Z',
  },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate overall stats
  const totalReviews = reviews.length;
  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fourStarCount = reviews.filter(r => r.rating === 4).length;

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => {
      if (filterRating && review.rating !== filterRating) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          review.title.toLowerCase().includes(query) ||
          review.content.toLowerCase().includes(query) ||
          review.productTitle.toLowerCase().includes(query) ||
          review.authorName.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'helpful') {
        return b.helpfulCount - a.helpfulCount;
      } else {
        return b.rating - a.rating;
      }
    });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Customer Reviews</h1>
            <p className="text-xl text-gray-300 mb-8">
              See what our customers are saying about our products
            </p>
            
            {/* Overall Stats */}
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div>
                <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
                <ReviewStars rating={averageRating} size="lg" />
                <p className="text-gray-300 mt-2">{totalReviews} reviews</p>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm w-12">5 stars</span>
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-action"
                      style={{ width: `${(fiveStarCount / totalReviews) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm w-8">{fiveStarCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm w-12">4 stars</span>
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-action"
                      style={{ width: `${(fourStarCount / totalReviews) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm w-8">{fourStarCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="w-full sm:w-96">
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>

            <div className="flex gap-4 flex-wrap">
              {/* Filter by Rating */}
              <select
                value={filterRating || ''}
                onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              >
                <option value="recent">Most Recent</option>
                <option value="helpful">Most Helpful</option>
                <option value="rating">Highest Rating</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No reviews found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Product Info */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <Link
                    href={`/products/${review.productHandle}`}
                    className="text-sm font-medium text-gray-900 hover:text-action transition-colors line-clamp-1"
                  >
                    {review.productTitle}
                  </Link>
                </div>
                
                {/* Review Content */}
                <div className="p-6">
                  <ReviewCard review={review} compact />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Placeholder */}
        {filteredReviews.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-gray-500">
              Showing {filteredReviews.length} of {totalReviews} reviews
            </p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Have you purchased from us?
          </h2>
          <p className="text-gray-600 mb-6">
            We'd love to hear about your experience! Your feedback helps other customers make informed decisions.
          </p>
          <Link
            href="/review"
            className="inline-block bg-action text-white px-8 py-3 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            Write a Review
          </Link>
        </div>
      </div>
    </div>
  );
}

