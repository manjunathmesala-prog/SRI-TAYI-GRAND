import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessRoute } from '@/lib/rbac/types';
import { verifyEdgeSession } from '@/lib/auth-edge';

/**
 * Extracts the user's role from a signed token without requiring Node-only crypto in Edge
 */

/**
 * Defense-in-Depth Edge Routing Middleware for Sri Tayi Grand
 * Guards all /admin routes against unauthenticated and unauthorized access.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip non-admin paths and public admin assets
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Public admin pages that do not require an active staff session
  const publicAdminPaths = [
    '/admin/login',
    '/admin/rfid/standee', // Public QR standee display for walk-in reception
    '/admin/403',          // Access Denied explanation screen
  ];

  if (publicAdminPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // 2. Validate session cookie presence for admin portal pages
  const sessionCookie = request.cookies.get('stg_session')?.value;
  const authHeader = request.headers.get('authorization');
  const token = sessionCookie || authHeader;

  const session = token ? await verifyEdgeSession(token) : null;
  if (!session) {
    // If it's an API route under /api/admin, let route-level 401/403 handlers return clean JSON
    if (pathname.startsWith('/api/admin')) {
      if (pathname === '/api/admin/auth') {
        return NextResponse.next();
      }
      return NextResponse.next();
    }

    // For web dashboard pages, redirect unauthorized visitors to the login screen
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Edge-Level RBAC Route Interception: Verify permission for requested path
  const role = session.role;
  if (!canAccessRoute(role, pathname)) {
    const forbiddenUrl = new URL('/admin/403', request.url);
    forbiddenUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths starting with /admin
     */
    '/admin/:path*',
  ],
};
