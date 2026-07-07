import Link from 'next/link';
import { ReviewStars } from '@/components/reviews/ReviewStars';
import {
  formatStoreReviewCount,
  type StoreReviewStats,
} from '@/lib/reviews/store-stats';

interface StoreRatingBadgeProps {
  stats: StoreReviewStats | null;
}

/** Store-wide rating row: stars · "4.8 store rating" · "300+ reviews" */
export function StoreRatingBadge({ stats }: StoreRatingBadgeProps) {
  if (!stats || stats.total_reviews === 0) return null;

  const averageRating = Number(stats.average_rating) || 0;

  return (
    <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <ReviewStars rating={averageRating} size="sm" />
      <span className="text-gray-500">{averageRating.toFixed(1)} store rating</span>
      <span className="text-gray-400" aria-hidden="true">
        ·
      </span>
      <Link href="/reviews" className="font-medium text-primary hover:underline">
        {formatStoreReviewCount(stats.total_reviews)}
      </Link>
    </div>
  );
}
