'use client';

import { ReviewStars } from './ReviewStars';
import type { Review } from '@/types/reviews';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formattedDate = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="border rounded-lg p-6 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <ReviewStars rating={review.rating} size="sm" />
          {review.title && (
            <h3 className="font-semibold text-lg mt-2">{review.title}</h3>
          )}
        </div>
        {review.verifiedPurchase && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            ✓ Verified Purchase
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-gray-700 mb-4">{review.content}</p>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4">
          {review.images.map((image) => (
            <img
              key={image.id}
              src={image.thumbnail}
              alt={image.alt || 'Review image'}
              className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-75"
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          <span className="font-medium">{review.authorName}</span>
          <span className="mx-2">•</span>
          <span>{formattedDate}</span>
        </div>
        
        {/* Helpful buttons */}
        <div className="flex items-center gap-4">
          <button className="hover:text-gray-900 flex items-center gap-1">
            <span>👍</span>
            <span>Helpful ({review.helpful})</span>
          </button>
        </div>
      </div>
    </div>
  );
}





