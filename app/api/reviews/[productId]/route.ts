import { NextRequest, NextResponse } from 'next/server';

// TODO: Replace with actual database query once Vercel Postgres is set up
// This is a placeholder that returns mock data for development

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  
  // Mock data for development
  // TODO: Replace with:
  // const { rows: reviews } = await sql`
  //   SELECT * FROM reviews
  //   WHERE product_id = ${productId}
  //   AND status = 'approved'
  //   ORDER BY created_at DESC
  // `;
  //
  // const { rows: stats } = await sql`
  //   SELECT * FROM review_stats
  //   WHERE product_id = ${productId}
  // `;
  
  const mockResponse = {
    reviews: [],
    stats: {
      product_id: productId,
      total_reviews: 0,
      average_rating: 0,
      rating_1_count: 0,
      rating_2_count: 0,
      rating_3_count: 0,
      rating_4_count: 0,
      rating_5_count: 0,
    },
  };
  
  return NextResponse.json(mockResponse);
}

