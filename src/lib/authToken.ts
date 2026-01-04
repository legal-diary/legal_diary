import { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'authToken';

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const headerToken = authHeader?.replace('Bearer ', '');
  if (headerToken) {
    return headerToken;
  }

  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  return cookieToken ?? null;
}
