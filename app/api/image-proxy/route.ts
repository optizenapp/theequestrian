import { NextRequest, NextResponse } from 'next/server';

// Only proxy images from these trusted hosts
const ALLOWED_HOSTS = ['cdn.shopify.com', 'theequestrian.com.au'];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );
  if (!isAllowed) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'TheEquestrian-EmailProxy/1.0' },
    });
    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: upstream.status });
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch {
    return new NextResponse('Proxy fetch failed', { status: 502 });
  }
}
