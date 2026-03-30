import { NextResponse } from 'next/server';

/** Permanent redirect: old sitemap name → `/sitemap/categories.xml`. */
export function GET(request: Request) {
  const u = new URL(request.url);
  u.pathname = '/sitemap/categories.xml';
  u.search = '';
  return NextResponse.redirect(u, 308);
}
