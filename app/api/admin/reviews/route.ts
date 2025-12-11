import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Get all reviews with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    let query = 'SELECT * FROM reviews WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (product_title ILIKE $${paramIndex} OR author_name ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await sql.query(query, params);
    
    // Get stats
    const { rows: statsRows } = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) as total_count,
        ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 2) as avg_rating
      FROM reviews
    `;
    
    return NextResponse.json({
      reviews: rows,
      stats: statsRows[0],
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

