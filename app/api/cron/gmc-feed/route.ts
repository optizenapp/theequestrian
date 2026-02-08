import { NextResponse } from 'next/server';
import { buildGmcFeedXml } from '@/lib/gmc/feed';
import { uploadGmcFeedToS3 } from '@/lib/gmc/s3';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { xml, itemCount } = await buildGmcFeedXml();
    const result = await uploadGmcFeedToS3(xml);
    return NextResponse.json({
      ok: true,
      itemCount,
      url: result.url,
      bucket: result.bucket,
      key: result.key,
    });
  } catch (error) {
    console.error('Cron GMC feed upload error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to upload GMC feed' }, { status: 500 });
  }
}
