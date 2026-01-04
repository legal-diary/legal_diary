import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/uploads/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/uploads/:path*'],
};
