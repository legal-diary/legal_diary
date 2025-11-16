import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function verifyToken(token: string) {
  try {
    console.log('[verifyToken] Received token (first 20 chars):', token?.substring(0, 20));
    console.log('[verifyToken] Token length:', token?.length);

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { include: { firmMember: true } } },
    });

    console.log('[verifyToken] Session found:', !!session);

    if (!session) {
      console.log('[verifyToken] No session found in database for token');
      return null;
    }

    // Check if session is expired
    const now = new Date();
    const isExpired = session.expiresAt < now;
    console.log('[verifyToken] Session expiresAt:', session.expiresAt.toISOString());
    console.log('[verifyToken] Current time:', now.toISOString());
    console.log('[verifyToken] Is expired:', isExpired);

    if (isExpired) {
      console.log('[verifyToken] Session expired, deleting');
      await prisma.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    console.log('[verifyToken] Token verified successfully for user:', session.user.email);
    return session.user;
  } catch (error) {
    console.error('[verifyToken] Token verification error:', error);
    return null;
  }
}

export async function withAuth(handler: Function) {
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
    (request as any).user = user;
    return handler(request);
  };
}
