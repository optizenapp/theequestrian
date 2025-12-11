'use client';

import { useEffect, useState } from 'react';
import { ReviewStars } from './ReviewStars';

interface ProductPageReviewBadgeProps {
  productId: string;
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
}

export function ProductPageReviewBadge({ productId }: ProductPageReviewBadgeProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/reviews/stats/${encodeURIComponent(productId)}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching review stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>No reviews yet</span>
      </div>
    );
  }

  const averageRating = Number(stats.average_rating) || 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <ReviewStars rating={averageRating} size="sm" />
      <span className="text-gray-500 hover:underline cursor-pointer">
        {averageRating.toFixed(1)} ({stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
}

