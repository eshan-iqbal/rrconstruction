import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authToken = request.cookies.get('auth_token')?.value;
  const isAuthPage = pathname.startsWith('/login');
  const isApiRoute = pathname.startsWith('/api/');
  const isApiAuth = pathname.startsWith('/api/auth');

  // Allow auth API calls
  if (isApiAuth) {
    return NextResponse.next();
  }

  // Verify JWT token
  const session = authToken ? await verifyAuthToken(authToken) : null;

  // If trying to access login page while already authenticated with a valid JWT
  if (isAuthPage) {
    if (session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // If not authenticated
  if (!session) {
    // For API routes, return 401 JSON instead of redirecting with HTML
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
