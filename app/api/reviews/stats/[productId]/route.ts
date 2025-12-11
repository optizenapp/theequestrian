import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    // productId is actually the product handle now
    const productHandle = productId;
    
    // Query by product_handle instead of product_id
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
      WHERE product_handle = ${productHandle}
        AND status = 'approved'
      GROUP BY product_handle
    `;
    
    // Return stats or default empty stats
    return NextResponse.json(rows[0] || {
      product_handle: productHandle,
      total_reviews: 0,
      average_rating: 0,
      rating_1_count: 0,
      rating_2_count: 0,
      rating_3_count: 0,
      rating_4_count: 0,
      rating_5_count: 0,
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review stats' },
      { status: 500 }
    );
  }
}

