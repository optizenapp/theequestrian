import { NextResponse } from 'next/server';
import { scanNotFoundUrls } from '@/lib/not-found/scan';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pageLimit = typeof body?.pageLimit === 'number' ? body.pageLimit : 300;
    const linkLimit = typeof body?.linkLimit === 'number' ? body.linkLimit : 500;
    const includeLinks = typeof body?.includeLinks === 'boolean' ? body.includeLinks : false;
    const result = await scanNotFoundUrls({ pageLimit, linkLimit, includeLinks });
    return NextResponse.json(result);
  } catch (error) {
    console.error('404 scan error:', error);
    return NextResponse.json({ error: 'Failed to scan site' }, { status: 500 });
  }
}
