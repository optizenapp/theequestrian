'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewStars } from '@/components/reviews/ReviewStars';

interface Review {
  id: string;
  product_id: string;
  product_handle: string | null;
  product_title: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/reviews');
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // Calculate overall stats
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fourStarCount = reviews.filter(r => r.rating === 4).length;
  const threeStarCount = reviews.filter(r => r.rating === 3).length;
  const twoStarCount = reviews.filter(r => r.rating === 2).length;
  const oneStarCount = reviews.filter(r => r.rating === 1).length;

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => {
      if (filterRating && review.rating !== filterRating) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          review.title.toLowerCase().includes(query) ||
          review.content.toLowerCase().includes(query) ||
          review.product_title.toLowerCase().includes(query) ||
          review.author_name.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'helpful') {
        return b.helpful_count - a.helpful_count;
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
                {[
                  { stars: 5, count: fiveStarCount },
                  { stars: 4, count: fourStarCount },
                  { stars: 3, count: threeStarCount },
                  { stars: 2, count: twoStarCount },
                  { stars: 1, count: oneStarCount },
                ].map(({ stars, count }) => (
                  <div key={stars} className="flex items-center gap-2 mb-1">
                    <span className="text-sm w-12">{stars} {stars === 1 ? 'star' : 'stars'}</span>
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-action"
                        style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm w-8">{count}</span>
                  </div>
                ))}
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
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-action"></div>
            <p className="text-gray-500 text-lg mt-4">Loading reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {reviews.length === 0 ? 'No reviews yet. Be the first to write one!' : 'No reviews found matching your criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Product Info */}
                {review.product_handle && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <Link
                      href={`/products/${review.product_handle}`}
                      className="text-sm font-medium text-gray-900 hover:text-action transition-colors line-clamp-1"
                    >
                      {review.product_title}
                    </Link>
                  </div>
                )}
                
                {/* Review Content */}
                <div className="p-6">
                  <ReviewCard review={review} />
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

