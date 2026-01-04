import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthToken } from '@/lib/authToken';

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { User: { include: { Firm_User_firmIdToFirm: true } } },
    });

    if (!session || !session.User) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const hasPassword = !!session.User.password;
    const { password: _, Firm_User_firmIdToFirm, ...userWithoutPassword } = session.User;
    const userData = {
      ...userWithoutPassword,
      firm_name: Firm_User_firmIdToFirm?.name || null,
    };

    return NextResponse.json(
      {
        user: userData,
        expiresAt: session.expiresAt.toISOString(),
        needsFirmSetup: !session.User.firmId,
        needsPasswordSetup: !hasPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session lookup error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
