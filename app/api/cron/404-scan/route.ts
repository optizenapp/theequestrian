import { NextResponse } from 'next/server';
import { scanNotFoundUrls } from '@/lib/not-found/scan';

export async function GET() {
  try {
    const result = await scanNotFoundUrls({
      pageLimit: 300,
      linkLimit: 500,
      includeLinks: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron 404 scan error:', error);
    return NextResponse.json({ error: 'Failed to scan site' }, { status: 500 });
  }
}
