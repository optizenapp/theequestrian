import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling URL redirects
 * 
 * Redirects:
 * 1. Old Shopify collection URLs: /collections/handle → /handle
 * 2. Old product URLs: /products/handle → /{category-path}/handle
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

  // Redirect old product URLs: /products/{handle} → /{category-path}/{handle}
  if (pathname.startsWith('/products/')) {
    const handle = pathname.replace('/products/', '');
    
    // We need to fetch the product to get its category path
    // This will be handled by the /products/[handle]/page.tsx route
    // which will do a server-side redirect to the canonical URL
    // We don't do it in middleware to avoid API calls on every request
    return NextResponse.next();
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    '/collections/:path*',
    '/products/:path*',
  ],
};



