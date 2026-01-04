import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, getAuthToken } from '@/lib/authToken';

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    // Delete session
    await prisma.session.deleteMany({
      where: { token },
    });

    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
