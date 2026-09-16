import { NextRequest, NextResponse } from 'next/server';
import { buildMetaCatalogCsv } from '@/lib/meta/feed';
import { uploadMetaCatalogToS3 } from '@/lib/meta/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret) return true;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return token === envSecret || headerSecret === envSecret;
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[cron:meta-catalog-feed] Start');
    const { csv, itemCount } = await buildMetaCatalogCsv();
    const result = await uploadMetaCatalogToS3(csv);

    console.log('[cron:meta-catalog-feed] Upload succeeded', {
      itemCount,
      url: result.url,
      bucket: result.bucket,
      key: result.key,
    });

    return NextResponse.json({
      ok: true,
      itemCount,
      url: result.url,
      bucket: result.bucket,
      key: result.key,
    });
  } catch (error) {
    console.error('Cron Meta catalog feed upload error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload Meta catalog feed' },
      { status: 500 }
    );
  }
}
