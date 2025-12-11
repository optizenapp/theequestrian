import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

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
    
    // Insert review into database
    const { rows } = await sql`
      INSERT INTO reviews (
        product_id,
        product_handle,
        product_title,
        rating,
        title,
        content,
        author_name,
        author_email,
        verified_purchase,
        order_id,
        status,
        source
      ) VALUES (
        ${body.productId},
        ${body.productHandle || ''},
        ${body.productTitle || ''},
        ${body.rating},
        ${body.title || ''},
        ${body.content},
        ${body.authorName},
        ${body.authorEmail || null},
        ${body.verifiedPurchase || false},
        ${body.orderId || null},
        'pending',
        'custom'
      )
      RETURNING *
    `;
    
    console.log('✅ Review submitted successfully:', rows[0]);
    
    return NextResponse.json({ 
      review: rows[0],
      message: 'Review submitted successfully. It will be published after moderation.'
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

