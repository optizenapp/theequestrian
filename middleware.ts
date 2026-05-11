import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { blogRedirects, collectionRedirects, pageRedirects } from '@/lib/redirects/maps';

const goneResponse = () =>
  new NextResponse(null, {
    status: 410,
    statusText: 'Gone',
    headers: {
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, max-age=86400',
    },
  });

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const decodedPath = decodeURIComponent(pathname);
  const searchParams = request.nextUrl.searchParams;

  // Keep SES SNS webhook requests untouched so AWS delivery is never redirected.
  if (pathname === '/api/webhooks/aws/ses-sns') {
    return NextResponse.next();
  }

  // Force www — redirect apex domain to www before any other logic.
  if (request.nextUrl.hostname === 'theequestrian.com.au') {
    const wwwUrl = request.nextUrl.clone();
    wwwUrl.hostname = 'www.theequestrian.com.au';
    return NextResponse.redirect(wwwUrl, 301);
  }

  // Duplicate brand URLs: consolidate on canonical brand handles.
  if (pathname === '/brands/kentucky-horsewear') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/brands/kentucky';
    return NextResponse.redirect(redirectUrl, 301);
  }

  if (pathname === '/brands/ego-7') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/brands/ego7';
    return NextResponse.redirect(redirectUrl, 301);
  }

  if (pathname === '/accessories/collectibles') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/accessories/toys';
    return NextResponse.redirect(redirectUrl, 301);
  }

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

  // ------------------------------------------------------------------
  // 1. KILL MULTI-TAG "+" COMBINATIONS
  // ------------------------------------------------------------------
  if (decodedPath.includes('+')) {
    return goneResponse();
  }

  // ------------------------------------------------------------------
  // 2. KILL RSS / ATOM FEEDS
  // ------------------------------------------------------------------
  if (decodedPath.endsWith('.atom') || decodedPath.endsWith('.rss')) {
    return goneResponse();
  }

  // ------------------------------------------------------------------
  // 3. KILL SHOPIFY APP JUNK
  // ------------------------------------------------------------------
  const appJunkPatterns = ['globo_basis', 'globo-', 'secomapp', 'toolbox'];
  if (appJunkPatterns.some((pattern) => decodedPath.includes(pattern))) {
    return goneResponse();
  }

  // ------------------------------------------------------------------
  // 4. KILL /collections/ CATCH-ALL (after redirects are checked)
  // ------------------------------------------------------------------
  if (decodedPath.startsWith('/collections/') || decodedPath === '/collections') {
    return goneResponse();
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

  const noindexParamKeys = new Set([
    'brand',
    'variant',
    'size',
    'price',
    'color',
    'colour',
    'sort',
    'sort_by',
    'page',
    'filter',
  ]);
  const shouldNoindexQueryPage = Array.from(searchParams.keys()).some((key) =>
    noindexParamKeys.has(key.toLowerCase())
  );
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  if (shouldNoindexQueryPage) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/collections/:path*',
    '/blogs/:path*',
    '/pages/:path*',
    '/cart/c/:path*',
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt).*)',
  ],
};
