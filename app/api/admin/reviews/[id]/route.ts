import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Update review (approve/reject or edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.status) {
      // Update status (approve/reject)
      const { rows } = await sql`
        UPDATE reviews
        SET status = ${body.status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      return NextResponse.json({ review: rows[0] });
    } else {
      // Update review content
      const { rows } = await sql`
        UPDATE reviews
        SET 
          title = ${body.title || ''},
          content = ${body.content},
          rating = ${body.rating},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      return NextResponse.json({ review: rows[0] });
    }
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// Delete review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await sql`
      DELETE FROM reviews
      WHERE id = ${id}
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

