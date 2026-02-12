import { NextResponse } from 'next/server';
import { createManualRedirect } from '@/lib/redirects/manual';
import { markRollupStatus } from '@/lib/not-found/rollup-store';

type SuggestionRow = {
  from: string;
  suggested_to: string;
  type?: string;
  selected?: boolean;
  is_external?: boolean;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const normalizePath = (value: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '/';
  const withoutHash = trimmed.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery.startsWith('/')) return `/${withoutQuery}`;
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) return withoutQuery.slice(0, -1);
  return withoutQuery;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rows = Array.isArray(body?.rows) ? (body.rows as SuggestionRow[]) : [];
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No suggestion rows were provided.' }, { status: 400 });
    }

    const toApply = rows
      .filter((row) => row && row.selected !== false && !row.is_external)
      .map((row) => ({
        from: normalizePath(row.from || ''),
        to: normalizePath(row.suggested_to || ''),
        type: row.type || '301',
      }))
      .filter((row) => row.from && row.to && row.from !== row.to);

    if (toApply.length === 0) {
      return NextResponse.json({ error: 'No valid rows selected to implement.' }, { status: 400 });
    }

    let applied = 0;
    for (const row of toApply) {
      await createManualRedirect(row.from, row.to, row.type, 'ai_404_tool');
      await markRollupStatus(row.from, 'manual');
      applied += 1;
    }

    return NextResponse.json({
      applied,
      totalSubmitted: rows.length,
      skipped: rows.length - applied,
    });
  } catch (error) {
    console.error('Implement 404 suggestion tool redirects error:', error);
    return NextResponse.json({ error: 'Failed to implement redirects.' }, { status: 500 });
  }
}
