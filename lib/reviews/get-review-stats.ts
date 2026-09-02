/**
 * Get review statistics for a product
 * 
 * This function fetches review data from your review system (Yotpo, custom DB, etc.)
 * Returns null if no reviews exist - schema will gracefully omit AggregateRating
 */

import type { ReviewStats } from '@/lib/utils/product-schema';

/**
 * Fetch review statistics for a product
 * 
 * @param productHandle - Product handle (e.g., "kazoo-dog-rug-armadillo-jacket-charcoal")
 * @returns Review stats or null if no reviews
 */
export async function getReviewStats(productHandle: string): Promise<ReviewStats | null> {
  try {
    // Fetch from Vercel Postgres database
    const { sql } = await import('@/lib/db/vercel-postgres');
    
    const result = await sql`
      SELECT 
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(*) as review_count
      FROM reviews
      WHERE product_handle = ${productHandle} AND status = 'approved'
    `;
    
    if (result.rows[0] && parseInt(result.rows[0].review_count) > 0) {
      return {
        averageRating: parseFloat(result.rows[0].average_rating),
        reviewCount: parseInt(result.rows[0].review_count)
      };
    }
    
    // No reviews found - return null (schema will gracefully omit aggregateRating)
    return null;
    
  } catch (error) {
    console.error('Error fetching review stats:', error);
    // Graceful fallback - return null instead of breaking the page
    return null;
  }
}

/**
 * Get review stats with caching
 * Caches for 1 hour to reduce API calls
 */
const reviewStatsCache = new Map<string, { stats: ReviewStats | null; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getReviewStatsWithCache(productId: string): Promise<ReviewStats | null> {
  const now = Date.now();
  const cached = reviewStatsCache.get(productId);
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.stats;
  }
  
  const stats = await getReviewStats(productId);
  reviewStatsCache.set(productId, { stats, timestamp: now });
  
  return stats;
}

