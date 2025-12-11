import { NextRequest, NextResponse } from 'next/server';

// TODO: Replace with actual database insert once Vercel Postgres is set up
// This is a placeholder that simulates review submission

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    if (!body.productId || !body.rating || !body.content || !body.authorName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // TODO: Replace with actual database insert:
    // const { rows } = await sql`
    //   INSERT INTO reviews (
    //     product_id,
    //     product_handle,
    //     product_title,
    //     rating,
    //     title,
    //     content,
    //     author_name,
    //     author_email,
    //     verified_purchase,
    //     order_id,
    //     status,
    //     source
    //   ) VALUES (
    //     ${body.productId},
    //     ${body.productHandle || ''},
    //     ${body.productTitle || ''},
    //     ${body.rating},
    //     ${body.title},
    //     ${body.content},
    //     ${body.authorName},
    //     ${body.authorEmail || null},
    //     ${body.verifiedPurchase || false},
    //     ${body.orderId || null},
    //     'pending',
    //     'custom'
    //   )
    //   RETURNING *
    // `;
    
    // Mock response for development
    const mockReview = {
      id: 'mock-' + Date.now(),
      ...body,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    
    console.log('📝 Review submitted (mock):', mockReview);
    
    return NextResponse.json({ review: mockReview }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

