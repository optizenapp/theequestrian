'use client';

import { ReviewStars } from './ReviewStars';
import type { ReviewStats } from '@/types/reviews';

interface ReviewSummaryProps {
  stats: ReviewStats;
}

export function ReviewSummary({ stats }: ReviewSummaryProps) {
  const totalReviews = stats.totalReviews;
  const distribution = stats.ratingDistribution;

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Overall Rating */}
        <div className="text-center md:text-left">
          <div className="text-5xl font-bold mb-2">
            {stats.averageRating.toFixed(1)}
          </div>
          <ReviewStars rating={stats.averageRating} size="lg" />
          <p className="text-gray-600 mt-2">
            Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
          <div className="flex gap-4 mt-4 text-sm text-gray-600">
            <span>{stats.verifiedPurchaseCount} verified purchases</span>
            {stats.withPhotosCount > 0 && (
              <span>• {stats.withPhotosCount} with photos</span>
            )}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = distribution[rating as keyof typeof distribution];
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm font-medium w-8">{rating} ★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}





