import { sql } from '@/lib/db/vercel-postgres';
import { getCanonicalHrefByHandles } from '@/lib/shopify/product-href';

export interface PublicReview {
  id: string;
  product_id: string;
  product_handle: string | null;
  product_title: string;
  rating: number;
  title: string;
  content: string;
  author_name: string;
  verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
}

interface ReviewRow {
  id: string;
  product_id: string;
  product_handle: string | null;
  product_title: string | null;
  rating: number | string;
  title: string | null;
  content: string;
  author_name: string;
  verified_purchase: boolean | null;
  helpful_count: number | string | null;
  not_helpful_count: number | string | null;
  created_at: string | Date;
}

export interface PublicReviewsData {
  reviews: PublicReview[];
  productHrefByHandle: Record<string, string>;
}

const toNumber = (value: number | string | null): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
};

export async function getPublicReviews(): Promise<PublicReviewsData> {
  const { rows } = await sql<ReviewRow>`
    SELECT
      id,
      product_id,
      product_handle,
      product_title,
      rating,
      title,
      content,
      author_name,
      verified_purchase,
      helpful_count,
      not_helpful_count,
      created_at
    FROM reviews
    WHERE status = 'approved'
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const reviews = rows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_handle: row.product_handle,
    product_title: row.product_title ?? 'Product',
    rating: toNumber(row.rating),
    title: row.title ?? '',
    content: row.content,
    author_name: row.author_name,
    verified_purchase: row.verified_purchase ?? false,
    helpful_count: toNumber(row.helpful_count),
    not_helpful_count: toNumber(row.not_helpful_count),
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }));

  const handles = reviews
    .map((review) => review.product_handle)
    .filter((handle): handle is string => Boolean(handle));
  const productHrefByHandle = await getCanonicalHrefByHandles(handles);

  return { reviews, productHrefByHandle };
}
