import { cache } from 'react';
import { sql } from '@/lib/db/vercel-postgres';

export type StoreReviewStats = {
  average_rating: number;
  total_reviews: number;
};

/** Aggregate approved review stats for the store (cached per request). */
export const getStoreReviewStats = cache(async (): Promise<StoreReviewStats | null> => {
  try {
    const { rows } = await sql`
      SELECT
        AVG(rating::numeric) AS average_rating,
        COUNT(*)::int AS total_reviews
      FROM reviews
      WHERE status = 'approved'
    `;

    const row = rows[0];
    const total = Number(row?.total_reviews ?? 0);
    if (total === 0) return null;

    return {
      average_rating: parseFloat(String(row?.average_rating ?? 0)) || 0,
      total_reviews: total,
    };
  } catch (error) {
    console.error('[getStoreReviewStats] Failed:', error);
    return null;
  }
});

/** e.g. 347 → "300+ reviews", 42 → "42 reviews" */
export function formatStoreReviewCount(count: number): string {
  if (count >= 100) {
    const rounded = Math.floor(count / 100) * 100;
    return `${rounded}+ reviews`;
  }
  return count === 1 ? '1 review' : `${count} reviews`;
}
