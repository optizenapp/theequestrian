import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await sql`
      SELECT id, page_type, page_url, scan_date, performance_score, 
             accessibility_score, best_practices_score, seo_score,
             fcp, lcp, cls, tbt, si, raw_data, ai_recommendations,
             ai_analyzed_at, status, error_message
      FROM performance_scans
      WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      scan: result.rows[0],
    });
  } catch (error) {
    console.error('Scan fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await sql`
      DELETE FROM performance_scans
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Scan deleted',
    });
  } catch (error) {
    console.error('Scan delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete scan' },
      { status: 500 }
    );
  }
}
