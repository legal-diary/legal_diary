import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';

/**
 * GET /api/firms/advocates
 * Get all advocates in the current user's firm
 * Only accessible by ADMIN users
 */
export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMINs can fetch the advocate list
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all advocates in the firm
    const advocates = await prisma.user.findMany({
      where: {
        firmId: user.firmId,
        role: 'ADVOCATE',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(advocates);
  } catch (error) {
    console.error('Error fetching advocates');
    return NextResponse.json(
      { error: 'Failed to fetch advocates' },
      { status: 500 }
    );
  }
}
