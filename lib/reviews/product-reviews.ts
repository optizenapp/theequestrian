import { sql } from '@vercel/postgres';

export interface ProductReview {
  id: string;
  product_id: string;
  product_handle: string;
  product_title: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  author_email: string | null;
  verified_purchase: boolean;
  order_id: string | null;
  helpful_count: number;
  not_helpful_count: number;
  status: string;
  created_at: string;
}

export interface ProductReviewStats {
  product_id: string;
  total_reviews: number;
  average_rating: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
}

interface ProductReviewRow extends Omit<ProductReview, 'created_at'> {
  created_at: string | Date;
}

interface ProductReviewStatsRow {
  product_handle: string;
  total_reviews: number | string;
  average_rating: number | string;
  rating_1_count: number | string;
  rating_2_count: number | string;
  rating_3_count: number | string;
  rating_4_count: number | string;
  rating_5_count: number | string;
}

export async function getProductReviewsWithStats(
  productHandle: string
): Promise<{ reviews: ProductReview[]; stats: ProductReviewStats }> {
  try {
    const { rows: reviews } = await sql<ProductReviewRow>`
      SELECT * FROM reviews
      WHERE product_handle = ${productHandle}
        AND status = 'approved'
      ORDER BY created_at DESC
    `;

    const { rows: statsRows } = await sql<ProductReviewStatsRow>`
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
      WHERE product_handle = ${productHandle}
        AND status = 'approved'
      GROUP BY product_handle
    `;

    const statsRow = statsRows[0];
    const stats: ProductReviewStats = {
      product_id: statsRow?.product_handle ?? productHandle,
      total_reviews: Number(statsRow?.total_reviews ?? 0),
      average_rating: Number(statsRow?.average_rating ?? 0),
      rating_1_count: Number(statsRow?.rating_1_count ?? 0),
      rating_2_count: Number(statsRow?.rating_2_count ?? 0),
      rating_3_count: Number(statsRow?.rating_3_count ?? 0),
      rating_4_count: Number(statsRow?.rating_4_count ?? 0),
      rating_5_count: Number(statsRow?.rating_5_count ?? 0),
    };

    return {
      reviews: reviews.map((review) => ({
        ...review,
        created_at:
          review.created_at instanceof Date
            ? review.created_at.toISOString()
            : review.created_at,
      })),
      stats,
    };
  } catch (error) {
    console.error('Error fetching product reviews with stats:', error);
    return {
      reviews: [],
      stats: {
        product_id: productHandle,
        total_reviews: 0,
        average_rating: 0,
        rating_1_count: 0,
        rating_2_count: 0,
        rating_3_count: 0,
        rating_4_count: 0,
        rating_5_count: 0,
      },
    };
  }
}
