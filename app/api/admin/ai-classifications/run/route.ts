import { NextResponse } from 'next/server';
import { runClassification } from '@/lib/ai/classify-products-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === 'number' ? body.limit : 50;
    const start = typeof body.start === 'number' ? body.start : 0;
    const dryRun = Boolean(body.dryRun);

    const result = await runClassification({
      start,
      limit,
      dryRun,
      saveDb: !dryRun,
      saveCsv: false, // Disabled in production - Vercel has read-only filesystem
    });

    return NextResponse.json({
      started: true,
      total: result.total,
      saved: result.saved,
      message: `Classification complete (start=${start}, limit=${limit}${dryRun ? ', dry-run' : ''}).`,
    });
  } catch (error) {
    console.error('Error starting classification job:', error);
    return NextResponse.json({ error: 'Failed to start classification job' }, { status: 500 });
  }
}
