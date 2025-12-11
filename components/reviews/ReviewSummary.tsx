import { ReviewStars } from './ReviewStars';

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
}

interface ReviewSummaryProps {
  stats: ReviewStats;
  onWriteReview?: () => void;
}

export function ReviewSummary({ stats, onWriteReview }: ReviewSummaryProps) {
  const total = stats.total_reviews;
  const averageRating = Number(stats.average_rating) || 0;
  
  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-4">No Reviews Yet</h3>
        <p className="text-gray-600 mb-6">Be the first to review this product!</p>
        {onWriteReview && (
          <button
            onClick={onWriteReview}
            className="inline-flex items-center gap-2 bg-action text-white px-6 py-3 rounded-full font-semibold hover:bg-action-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Write a Review
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Overall Rating */}
        <div className="text-center md:text-left">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Customer Reviews
          </h3>
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <span className="text-5xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <div>
              <ReviewStars rating={averageRating} size="lg" />
              <p className="text-sm text-gray-600 mt-1">
                Based on {total} {total === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          
          {onWriteReview && (
            <button
              onClick={onWriteReview}
              className="inline-flex items-center gap-2 bg-action text-white px-6 py-3 rounded-full font-semibold hover:bg-action-hover hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Write a Review
            </button>
          )}
        </div>
        
        {/* Right: Rating Breakdown */}
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats[`rating_${star}_count` as keyof ReviewStats] as number || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-12">
                  {star} star
                </span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
