'use client';

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
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.not_helpful_count);
  
  const handleVote = (type: 'helpful' | 'not-helpful') => {
    if (voted) return; // Already voted
    
    setVoted(type);
    if (type === 'helpful') {
      setHelpfulCount(prev => prev + 1);
      if (onHelpful) onHelpful(review.id);
    } else {
      setNotHelpfulCount(prev => prev + 1);
      if (onNotHelpful) onNotHelpful(review.id);
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
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
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
        <span className="text-sm text-gray-500 ml-4">{date}</span>
      </div>
      
      {/* Content */}
      <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">{review.content}</p>
      
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
            <span>Helpful ({helpfulCount})</span>
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
