import { NextRequest, NextResponse } from 'next/server';
import { getProductReviewsWithStats } from '@/lib/reviews/product-reviews';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    // productId is actually the product handle now
    const productHandle = productId;
    const { reviews, stats } = await getProductReviewsWithStats(productHandle);
    
    return NextResponse.json({
      reviews,
      stats,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

