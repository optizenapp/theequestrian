import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    
    const { rows } = await sql`
      SELECT * FROM review_stats
      WHERE product_id = ${productId}
    `;
    
    // Return stats or default empty stats
    return NextResponse.json(rows[0] || {
      product_id: productId,
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

