'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ReviewSummary } from './ReviewSummary';
import { ReviewCard } from './ReviewCard';
import { ReviewForm } from './ReviewForm';

interface Review {
  id: string;
  productId: string;
  rating: number;
  title: string;
  content: string;
  authorName: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

interface ReviewStats {
  product_id: string;
  total_reviews: number;
  average_rating: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
}

interface ProductReviewSectionProps {
  productId: string;
  productHandle: string;
  productTitle: string;
}

export default function ProductReviewSection({
  productId,
  productHandle,
  productTitle,
}: ProductReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch(`/api/reviews/${encodeURIComponent(productId)}`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
          setStats(data.stats || null);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, [productId]);

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => !filterRating || review.rating === filterRating)
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'helpful') {
        return b.helpfulCount - a.helpfulCount;
      } else {
        return b.rating - a.rating;
      }
    });

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
          {stats && stats.total_reviews > 0 && (
            <p className="text-gray-600">
              Based on {stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'}
            </p>
          )}
        </div>

        {/* Review Summary */}
        {stats && stats.total_reviews > 0 && (
          <div className="mb-8">
            <ReviewSummary stats={stats} />
          </div>
        )}

        {/* Write Review Button */}
        <div className="mb-8">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="bg-action text-white px-6 py-3 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Write a Review
            </button>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Write Your Review</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ReviewForm
                productId={productId}
                productHandle={productHandle}
                productTitle={productTitle}
                onSuccess={() => {
                  setShowForm(false);
                  // Refresh reviews
                  window.location.reload();
                }}
              />
            </div>
          )}
        </div>

        {/* Filters and Sort */}
        {reviews.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Filter by Rating */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterRating(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterRating === null
                    ? 'bg-action text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {[5, 4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(rating)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterRating === rating
                      ? 'bg-action text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {rating}★
                </button>
              ))}
            </div>

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
        )}

        {/* Reviews List */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No reviews match your filter.</p>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-gray-500 text-lg mb-4">No reviews yet</p>
            <p className="text-gray-600 mb-6">Be the first to review this product!</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-action text-white px-6 py-3 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Write the First Review
            </button>
          </div>
        )}

        {/* View All Reviews Link */}
        {reviews.length > 5 && (
          <div className="mt-8 text-center">
            <Link
              href={`/reviews?product=${productHandle}`}
              className="text-action font-semibold hover:underline"
            >
              View All {reviews.length} Reviews →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

