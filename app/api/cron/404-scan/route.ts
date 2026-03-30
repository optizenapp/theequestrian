import { NextResponse } from 'next/server';
import { scanNotFoundUrls } from '@/lib/not-found/scan';

/**
 * Not scheduled in vercel.json (full sitemap + link crawl hammers origin / DB / Shopify).
 * Call manually when needed, e.g. GET /api/cron/404-scan from an authenticated admin context.
 */
export async function GET() {
  try {
    const result = await scanNotFoundUrls({
      pageLimit: null,
      linkLimit: null,
      includeLinks: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron 404 scan error:', error);
    return NextResponse.json({ error: 'Failed to scan site' }, { status: 500 });
  }
}
