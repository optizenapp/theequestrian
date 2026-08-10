import { NextRequest, NextResponse } from 'next/server';
import { buildGmcFeedXml } from '@/lib/gmc/feed';
import { uploadGmcFeedToS3 } from '@/lib/gmc/s3';
import { logGmcFeedUpload, logGmcFeedUploadError } from '@/lib/db/gmc-feed-log';
import {
  fetchGmcDatafeedNow,
  syncGmcDatafeedFetchSchedule,
} from '@/lib/gmc/content';
import { syncGmcShippingSettings } from '@/lib/gmc/shipping';
import { cleanupStaleGmcOffers } from '@/lib/gmc/cleanup';

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
    console.log('[cron:gmc-feed] Start');
    const { xml, itemCount, variantIds } = await buildGmcFeedXml();
    const result = await uploadGmcFeedToS3(xml);

    await logGmcFeedUpload({
      itemCount,
      fileSizeBytes: Buffer.byteLength(xml, 'utf8'),
      s3Url: result.url,
      s3Bucket: result.bucket,
      s3Key: result.key,
      source: 'cron',
    });

    const sideEffects: Record<string, unknown> = {};

    try {
      sideEffects.datafeed = await syncGmcDatafeedFetchSchedule();
    } catch (error) {
      sideEffects.datafeedError = error instanceof Error ? error.message : String(error);
      console.error('[cron:gmc-feed] datafeed schedule sync failed', error);
    }

    try {
      sideEffects.fetchNow = await fetchGmcDatafeedNow();
    } catch (error) {
      sideEffects.fetchNowError = error instanceof Error ? error.message : String(error);
      console.error('[cron:gmc-feed] fetchNow failed', error);
    }

    try {
      sideEffects.shipping = await syncGmcShippingSettings();
    } catch (error) {
      sideEffects.shippingError = error instanceof Error ? error.message : String(error);
      console.error('[cron:gmc-feed] shipping sync failed', error);
    }

    try {
      sideEffects.cleanup = await cleanupStaleGmcOffers({
        feedVariantIds: variantIds,
        itemCount,
        dryRun: false,
      });
    } catch (error) {
      sideEffects.cleanupError = error instanceof Error ? error.message : String(error);
      console.error('[cron:gmc-feed] cleanup failed', error);
    }

    console.log('[cron:gmc-feed] Upload succeeded', {
      itemCount,
      url: result.url,
      bucket: result.bucket,
      key: result.key,
      sideEffects,
    });

    return NextResponse.json({
      ok: true,
      itemCount,
      url: result.url,
      bucket: result.bucket,
      key: result.key,
      sideEffects,
    });
  } catch (error) {
    console.error('Cron GMC feed upload error:', error);

    await logGmcFeedUploadError({
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      source: 'cron',
    });

    return NextResponse.json({ ok: false, error: 'Failed to upload GMC feed' }, { status: 500 });
  }
}
