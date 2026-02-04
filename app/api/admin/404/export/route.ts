import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        path,
        latest_referrer,
        source,
        hit_count,
        ga4_views,
        last_seen,
        suggestion_target,
        suggestion_reason,
        status
      FROM not_found_rollup
      ORDER BY last_seen DESC
    `;

    // Create CSV content
    const headers = 'path,latest_referrer,source,hit_count,ga4_views,last_seen,suggestion_target,suggestion_reason,status\n';
    const rows = result.rows.map(row => {
      const path = `"${(row.path || '').replace(/"/g, '""')}"`;
      const referrer = `"${(row.latest_referrer || '').replace(/"/g, '""')}"`;
      const source = row.source || '';
      const hitCount = row.hit_count || 0;
      const ga4Views = row.ga4_views || 0;
      const lastSeen = row.last_seen || '';
      const suggestionTarget = `"${(row.suggestion_target || '').replace(/"/g, '""')}"`;
      const suggestionReason = `"${(row.suggestion_reason || '').replace(/"/g, '""')}"`;
      const status = row.status || 'pending';
      
      return `${path},${referrer},${source},${hitCount},${ga4Views},${lastSeen},${suggestionTarget},${suggestionReason},${status}`;
    }).join('\n');
    
    const csv = headers + rows;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="404s.csv"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export 404s' }, { status: 500 });
  }
}
