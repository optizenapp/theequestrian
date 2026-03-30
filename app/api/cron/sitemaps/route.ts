import { NextRequest, NextResponse } from 'next/server';
import { publishSitemapsToS3 } from '@/lib/sitemap/s3-publisher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  try {
    const envSecret = process.env.CRON_SECRET;
    if (envSecret) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token !== envSecret) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await publishSitemapsToS3();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron:sitemaps] failed', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to publish sitemaps' },
      { status: 500 }
    );
  }
}
