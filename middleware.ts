import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
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
      return NextResponse.redirect(new URL('/admin/reviews', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
