import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function verifyToken(token: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { User: { include: { Firm_User_firmIdToFirm: true } } },
    });

    if (!session || !session.User) {
      return null;
    }

    // Check if session is expired
    const now = new Date();
    if (session.expiresAt < now) {
      await prisma.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    return session.User;
  } catch (error) {
    console.error('[verifyToken] Token verification error');
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
