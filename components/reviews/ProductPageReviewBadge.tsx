'use client';

import { useEffect, useState } from 'react';
import { ReviewStars } from './ReviewStars';

interface ProductPageReviewBadgeProps {
  productId: string;
  productHandle?: string;
  initialStats?: ReviewStats | null;
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
}

export function ProductPageReviewBadge({ productId, productHandle, initialStats = null }: ProductPageReviewBadgeProps) {
  const [stats, setStats] = useState<ReviewStats | null>(initialStats);
  const [isLoading, setIsLoading] = useState(!initialStats);

  useEffect(() => {
    if (initialStats) {
      return;
    }

    async function fetchStats() {
      try {
        // Use productHandle if available (for imported reviews), otherwise fall back to productId
        const identifier = productHandle || productId;
        const response = await fetch(`/api/reviews/stats/${encodeURIComponent(identifier)}`);
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
  }, [productId, productHandle, initialStats]);

  if (isLoading) {
    return (
      <div className="flex min-h-5 items-center gap-2 text-sm animate-pulse">
        <div className="h-4 w-28 rounded bg-gray-200"></div>
      </div>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="flex min-h-5 items-center gap-2 text-sm text-gray-500">
        <span>No reviews yet</span>
      </div>
    );
  }

  const averageRating = Number(stats.average_rating) || 0;

  return (
    <div className="flex min-h-5 items-center gap-2 text-sm">
      <ReviewStars rating={averageRating} size="sm" />
      <span className="text-gray-500 hover:underline cursor-pointer">
        {averageRating.toFixed(1)} ({stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
}

