import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { blogRedirects, collectionRedirects, pageRedirects } from '@/lib/redirects/maps';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect legacy cart permalinks (Shopify cart share URLs)
  // Format: /cart/c/[cart-id]?key=...
  if (pathname.startsWith('/cart/c/')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/cart';
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Redirect legacy collection URLs.
  if (pathname.startsWith('/collections/')) {
    const target = collectionRedirects[pathname];
    if (target) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = target;
      return NextResponse.redirect(redirectUrl, 301);
    }
  }

  // Redirect legacy blog URLs (specific map, then fallback to strip /blogs).
  if (pathname.startsWith('/blogs/')) {
    const target = blogRedirects[pathname] ?? pathname.replace(/^\/blogs/, '');
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = target;
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Redirect legacy page URLs (specific map, then fallback to strip /pages).
  if (pathname.startsWith('/pages/')) {
    const target = pageRedirects[pathname] ?? pathname.replace(/^\/pages/, '');
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = target;
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Check if user is authenticated
    const isAuthenticated = request.cookies.get('admin-auth')?.value === 'true';
    
    // If not authenticated and not on login page, redirect to login
    if (!isAuthenticated && !request.nextUrl.pathname.startsWith('/admin/login')) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // If authenticated and on login page, redirect to dashboard
    if (isAuthenticated && request.nextUrl.pathname.startsWith('/admin/login')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-path', pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/admin/:path*', '/collections/:path*', '/blogs/:path*', '/pages/:path*', '/cart/c/:path*'],
};
