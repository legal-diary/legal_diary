import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const TOKEN_CACHE_TTL_MS = 30_000;
const MAX_TOKEN_CACHE_SIZE = 500;
type SessionWithUser = Prisma.SessionGetPayload<{
  include: { User: { include: { Firm_User_firmIdToFirm: true } } };
}>;

const tokenCache = new Map<
  string,
  { user: SessionWithUser['User']; expiresAt: Date; cachedAt: number }
>();

const getCachedUser = (token: string) => {
  const cached = tokenCache.get(token);
  if (!cached) return null;

  const now = Date.now();
  const isCacheExpired = now - cached.cachedAt > TOKEN_CACHE_TTL_MS;
  const isSessionExpired = cached.expiresAt < new Date();

  if (isCacheExpired || isSessionExpired) {
    tokenCache.delete(token);
    return null;
  }

  return cached.user;
};

const setCachedUser = (token: string, user: SessionWithUser['User'], expiresAt: Date) => {
  if (tokenCache.size >= MAX_TOKEN_CACHE_SIZE) {
    const oldestKey = tokenCache.keys().next().value as string | undefined;
    if (oldestKey) tokenCache.delete(oldestKey);
  }

  tokenCache.set(token, {
    user,
    expiresAt,
    cachedAt: Date.now(),
  });
};

export async function verifyToken(token: string) {
  try {
    const cachedUser = getCachedUser(token);
    if (cachedUser) {
      return cachedUser;
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { User: { include: { Firm_User_firmIdToFirm: true } } },
    });

    if (!session || !session.User) {
      return null;
    }

    // Check if session is expired
    const now = new Date();
    const isExpired = session.expiresAt < now;

    if (isExpired) {
      await prisma.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    setCachedUser(token, session.User, session.expiresAt);
    return session.User;
  } catch (error) {
    console.error('[verifyToken] Token verification error:', error);
    return null;
  }
}

type AuthedRequest = NextRequest & { user: SessionWithUser['User'] };

export async function withAuth(handler: (request: AuthedRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Add user to request
    const authedRequest = request as AuthedRequest;
    authedRequest.user = user;
    return handler(authedRequest);
  };
}
