import { sql } from '@/lib/db/vercel-postgres';

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
}

/**
 * Fetch review stats for multiple products in a single query
 */
export async function getReviewStatsForProducts(productHandles: string[]): Promise<Map<string, ReviewStats>> {
  if (!productHandles.length) {
    return new Map();
  }

  try {
    // We can't use = ANY() easily with template literals and array of strings in some SQL clients,
    // but our postgres client supports passing arrays.
    // If not, we might need to construct the query differently.
    // Let's assume standard behavior for now.
    
    // Using a manual construction for the IN clause to be safe with template literals
    // Or we can query all and filter in memory if the list is small (36 items is small)
    
    // Actually, let's just query individually if batching is hard, but Promise.all is better than serial.
    // BUT we want to avoid 36 DB connections if possible.
    
    // Efficient single query approach:
    const { rows } = await sql`
      SELECT 
        product_handle,
        COUNT(*) as total_reviews,
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4_count,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5_count
      FROM reviews
      WHERE product_handle = ANY(${productHandles as any})
        AND status = 'approved'
      GROUP BY product_handle
    `;

    const statsMap = new Map<string, ReviewStats>();
    
    rows.forEach(row => {
      statsMap.set(row.product_handle, {
        total_reviews: parseInt(row.total_reviews) || 0,
        average_rating: parseFloat(row.average_rating) || 0,
        rating_1_count: parseInt(row.rating_1_count) || 0,
        rating_2_count: parseInt(row.rating_2_count) || 0,
        rating_3_count: parseInt(row.rating_3_count) || 0,
        rating_4_count: parseInt(row.rating_4_count) || 0,
        rating_5_count: parseInt(row.rating_5_count) || 0,
      });
    });

    return statsMap;
  } catch (error) {
    console.error('Error fetching batch review stats:', error);
    return new Map();
  }
}

/**
 * Fetch review stats for a single product
 */
export async function getReviewStats(productHandle: string): Promise<ReviewStats | null> {
  const map = await getReviewStatsForProducts([productHandle]);
  return map.get(productHandle) || null;
}

