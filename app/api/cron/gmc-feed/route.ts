import { NextResponse } from 'next/server';
import { buildGmcFeedXml } from '@/lib/gmc/feed';
import { uploadGmcFeedToS3 } from '@/lib/gmc/s3';
import { logGmcFeedUpload, logGmcFeedUploadError } from '@/lib/db/gmc-feed-log';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[cron:gmc-feed] Start');
    const { xml, itemCount } = await buildGmcFeedXml();
    const result = await uploadGmcFeedToS3(xml);
    
    // Log successful upload to database
    await logGmcFeedUpload({
      itemCount,
      fileSizeBytes: Buffer.byteLength(xml, 'utf8'),
      s3Url: result.url,
      s3Bucket: result.bucket,
      s3Key: result.key,
      source: 'cron',
    });
    
    console.log('[cron:gmc-feed] Upload succeeded', {
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
    console.error('Cron GMC feed upload error:', error);
    
    // Log failed upload to database
    await logGmcFeedUploadError({
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      source: 'cron',
    });
    
    return NextResponse.json({ ok: false, error: 'Failed to upload GMC feed' }, { status: 500 });
  }
}
