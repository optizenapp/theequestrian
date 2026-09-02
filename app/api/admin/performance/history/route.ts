import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageType = searchParams.get('pageType');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let query;
    if (pageType && pageType !== 'all') {
      query = sql`
        SELECT id, page_type, page_url, scan_date, strategy, performance_score, 
               accessibility_score, best_practices_score, seo_score,
               fcp, lcp, cls, tbt, si, status, ai_analyzed_at
        FROM performance_scans
        WHERE page_type = ${pageType}
        ORDER BY scan_date DESC
        LIMIT ${limit}
      `;
    } else {
      query = sql`
        SELECT id, page_type, page_url, scan_date, strategy, performance_score, 
               accessibility_score, best_practices_score, seo_score,
               fcp, lcp, cls, tbt, si, status, ai_analyzed_at
        FROM performance_scans
        ORDER BY scan_date DESC
        LIMIT ${limit}
      `;
    }

    const result = await query;

    return NextResponse.json({
      success: true,
      scans: result.rows,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
