import { NextRequest, NextResponse } from 'next/server';

// Routes exempt from API key validation
// These are endpoints that receive browser redirects or external monitoring calls
// and cannot include custom headers
const EXEMPT_ROUTES = [
  '/api/health',
  '/api/google/callback', // Google Calendar OAuth redirect (browser GET)
];

function isExemptRoute(pathname: string): boolean {
  return EXEMPT_ROUTES.some(route => pathname === route);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Skip exempt routes
  if (isExemptRoute(pathname)) {
    return NextResponse.next();
  }

  // Validate API key
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.NEXT_PUBLIC_API_KEY;

  if (!expectedKey) {
    console.error('[Middleware] NEXT_PUBLIC_API_KEY environment variable is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Forbidden: Invalid or missing API key' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
