import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling URL redirects
 * 
 * Redirects old Shopify collection URLs to new custom structure:
 * - /collections/handle → /handle
 * - /collections/handle/tag → /handle/tag
 * 
 * Products remain at /products/handle (canonical URL)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old collection URLs: /collections/* → /*
  if (pathname.startsWith('/collections/')) {
    // Remove /collections prefix, keep everything else
    const pathWithoutCollections = pathname.replace('/collections/', '/');
    const newUrl = new URL(pathWithoutCollections, request.url);
    
    // Preserve query parameters if any
    newUrl.search = request.nextUrl.search;
    
    return NextResponse.redirect(newUrl, 301);
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    '/collections/:path*',
  ],
};



