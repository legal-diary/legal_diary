import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function verifyToken(token: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { include: { firmMember: true } } },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Token verification error:', error);
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
