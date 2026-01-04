import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';

/**
 * GET /api/firms/members
 * Get all members in the current user's firm
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

    // Only ADMINs can view team members
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all members in the firm (excluding current user optionally)
    const members = await prisma.user.findMany({
      where: {
        firmId: user.firmId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' }, // ADMINs first
        { name: 'asc' },
      ],
    });

    // Get firm details including owner
    const firm = await prisma.firm.findUnique({
      where: { id: user.firmId },
      select: {
        id: true,
        name: true,
        ownerId: true,
      },
    });

    return NextResponse.json({
      members,
      firm,
      currentUserId: user.id,
    });
  } catch (error) {
    console.error('Error fetching firm members');
    return NextResponse.json(
      { error: 'Failed to fetch firm members' },
      { status: 500 }
    );
  }
}
