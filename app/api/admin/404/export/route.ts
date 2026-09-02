import { NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { ensureNotFoundRollupTable } from '@/lib/not-found/rollup-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Ensure table exists
    await ensureNotFoundRollupTable();

    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 10000;

    const result = await sql`
      SELECT 
        path,
        latest_referrer,
        source,
        hit_count,
        ga4_views,
        last_seen,
        suggested_to AS suggestion_target,
        suggested_reason AS suggestion_reason,
        status
      FROM not_found_rollup
      ORDER BY last_seen DESC
      LIMIT ${Number.isFinite(limit) && limit > 0 ? limit : 10000}
    `;

    const headersLine =
      'path,latest_referrer,source,hit_count,ga4_views,last_seen,suggestion_target,suggestion_reason,status\n';
    const rows = result.rows
      .map((row) => {
        const path = `"${(row.path || '').replace(/"/g, '""')}"`;
        const referrer = `"${(row.latest_referrer || '').replace(/"/g, '""')}"`;
        const source = row.source || '';
        const hitCount = row.hit_count || 0;
        const ga4Views = row.ga4_views || 0;
        const lastSeen = row.last_seen ? new Date(row.last_seen).toISOString() : '';
        const suggestionTarget = `"${(row.suggestion_target || '').replace(/"/g, '""')}"`;
        const suggestionReason = `"${(row.suggestion_reason || '').replace(/"/g, '""')}"`;
        const status = row.status || 'pending';
        return `${path},${referrer},${source},${hitCount},${ga4Views},${lastSeen},${suggestionTarget},${suggestionReason},${status}`;
      })
      .join('\n');

    const csv = headersLine + rows + (rows ? '\n' : '');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="404s.csv"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    
    // Return error as CSV so user can see what went wrong
    const errorCsv = `error\n"${String(error).replace(/"/g, '""')}"`;
    return new NextResponse(errorCsv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="404s-error.csv"',
      },
    });
  }
}
