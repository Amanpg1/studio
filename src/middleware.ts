import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('firebase-auth-token');

  const authenticatedRoutes = [
    '/dashboard',
    '/profile',
    '/scan',
    '/history',
  ];
  const unauthenticatedRoutes = ['/login', '/signup'];

  const isProtectedRoute = authenticatedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  if (unauthenticatedRoutes.includes(pathname) && sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/scan/:path*', '/history/:path*', '/login', '/signup'],
};
