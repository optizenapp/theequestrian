'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import type { PublicReview } from '@/lib/reviews/public-reviews';

type SortOption = 'recent' | 'helpful' | 'rating';

interface ReviewsPageClientProps {
  reviews: PublicReview[];
  productHrefByHandle: Record<string, string>;
}

const parseSortOption = (value: string): SortOption => {
  if (value === 'helpful' || value === 'rating') return value;
  return 'recent';
};

export default function ReviewsPageClient({
  reviews,
  productHrefByHandle,
}: ReviewsPageClientProps) {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reviews
      .filter((review) => {
        if (filterRating && review.rating !== filterRating) return false;
        if (!query) return true;
        return (
          review.title.toLowerCase().includes(query) ||
          review.content.toLowerCase().includes(query) ||
          review.product_title.toLowerCase().includes(query) ||
          review.author_name.toLowerCase().includes(query)
        );
      })
      .toSorted((a, b) => {
        if (sortBy === 'helpful') return b.helpful_count - a.helpful_count;
        if (sortBy === 'rating') return b.rating - a.rating;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [filterRating, reviews, searchQuery, sortBy]);

  return (
    <>
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="w-full sm:w-96">
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              />
            </div>

            <div className="flex gap-4 flex-wrap">
              <select
                value={filterRating ?? ''}
                onChange={(event) =>
                  setFilterRating(event.target.value ? Number(event.target.value) : null)
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(parseSortOption(event.target.value))}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {reviews.length === 0
                ? 'No reviews yet. Be the first to write one!'
                : 'No reviews found matching your criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {review.product_handle ? (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <Link
                      href={
                        productHrefByHandle[review.product_handle] ??
                        `/products/${review.product_handle}`
                      }
                      className="text-sm font-medium text-gray-900 hover:text-action transition-colors line-clamp-1"
                    >
                      {review.product_title}
                    </Link>
                  </div>
                ) : null}
                <div className="p-6">
                  <ReviewCard review={review} />
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredReviews.length > 0 ? (
          <div className="mt-12 text-center">
            <p className="text-gray-500">
              Showing {filteredReviews.length} of {reviews.length} reviews
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
