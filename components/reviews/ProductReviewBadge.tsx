'use client';

import { ReviewStars } from './ReviewStars';
import { useState, useEffect } from 'react';

interface ProductReviewBadgeProps {
  productId: string;
  productHandle: string;
  compact?: boolean;
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
}

export function ProductReviewBadge({ 
  productId, 
  productHandle,
  compact = false 
}: ProductReviewBadgeProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Fetch review stats
    fetch(`/api/reviews/stats/${productId}`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [productId]);
  
  if (isLoading) {
    return (
      <div className="h-5 w-24 bg-gray-100 animate-pulse rounded" />
    );
  }
  
  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="text-xs text-gray-400">
        No reviews yet
      </div>
    );
  }
  
  const averageRating = Number(stats.average_rating) || 0;
  
  if (compact) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-yellow-400">★</span>
        <span className="font-medium">{averageRating.toFixed(1)}</span>
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
        <ReviewStars rating={averageRating} size="sm" />
        <span className="text-sm text-gray-600">
          {averageRating.toFixed(1)} ({stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'})
        </span>
      </div>
      
      {/* Hover breakdown */}
      {showBreakdown && (
        <div className="absolute z-10 left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64">
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats[`rating_${star}_count` as keyof ReviewStats] as number || 0;
              const percentage = stats.total_reviews > 0 
                ? (count / stats.total_reviews) * 100 
                : 0;
              
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-gray-600">{star}★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 transition-all"
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

