import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import { sql } from '@vercel/postgres';

interface NotFoundRow {
  path: string;
  latest_referrer?: string;
  source?: string;
  hit_count?: string;
  ga4_views?: string;
  last_seen?: string;
  suggestion_target?: string;
  suggestion_reason?: string;
  status?: string;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const csvContent = await file.text();
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as NotFoundRow[];

    let imported = 0;
    for (const row of records) {
      if (!row.path) continue;

      const path = row.path.trim();
      const latestReferrer = row.latest_referrer?.trim() || null;
      const source = row.source?.trim() || 'import';
      const hitCount = parseInt(row.hit_count || '0', 10);
      const ga4Views = parseInt(row.ga4_views || '0', 10);
      const suggestionTarget = row.suggestion_target?.trim() || null;
      const suggestionReason = row.suggestion_reason?.trim() || null;
      const status = (row.status?.trim() || 'pending') as 'pending' | 'ignored' | 'manual';

      await sql`
        INSERT INTO not_found_rollup (
          path, 
          latest_referrer, 
          source, 
          hit_count, 
          ga4_views, 
          last_seen,
          suggestion_target,
          suggestion_reason,
          status,
          updated_at
        )
        VALUES (
          ${path},
          ${latestReferrer},
          ${source},
          ${hitCount},
          ${ga4Views},
          NOW(),
          ${suggestionTarget},
          ${suggestionReason},
          ${status},
          NOW()
        )
        ON CONFLICT (path) DO UPDATE
        SET 
          latest_referrer = COALESCE(EXCLUDED.latest_referrer, not_found_rollup.latest_referrer),
          source = EXCLUDED.source,
          hit_count = not_found_rollup.hit_count + EXCLUDED.hit_count,
          ga4_views = not_found_rollup.ga4_views + EXCLUDED.ga4_views,
          last_seen = NOW(),
          suggestion_target = COALESCE(EXCLUDED.suggestion_target, not_found_rollup.suggestion_target),
          suggestion_reason = COALESCE(EXCLUDED.suggestion_reason, not_found_rollup.suggestion_reason),
          status = EXCLUDED.status,
          updated_at = NOW()
      `;
      imported += 1;
    }

    return NextResponse.json({ imported, total: records.length });
  } catch (error) {
    console.error('404 import error:', error);
    return NextResponse.json({ error: 'Failed to import 404s' }, { status: 500 });
  }
}
