import { NextRequest, NextResponse } from 'next/server';

/**
 * Backward-compatible entrypoint:
 * if App URL is set to /api/shopify/vendor-oauth, forward to /install.
 */
export async function GET(request: NextRequest) {
  const url = new URL('/api/shopify/vendor-oauth/install', request.url);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

