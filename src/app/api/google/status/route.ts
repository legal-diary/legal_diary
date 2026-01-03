import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/middleware';
import { isGoogleCalendarConnected, getTokens } from '@/lib/googleCalendar';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/google/status
 * Check if user has Google Calendar connected
 * Returns connection status and last sync info
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const connected = await isGoogleCalendarConnected(user.id);

    if (!connected) {
      return NextResponse.json({
        connected: false,
        lastSync: null,
        syncedCount: 0,
      });
    }

    // Get token info for expiry
    const tokens = await getTokens(user.id);

    // Get sync statistics
    const syncStats = await prisma.calendarSync.groupBy({
      by: ['syncStatus'],
      where: {
        Hearing: {
          Case: {
            firmId: user.firmId || undefined,
          },
        },
      },
      _count: true,
    });

    const syncedCount = syncStats.find(s => s.syncStatus === 'SYNCED')?._count || 0;
    const failedCount = syncStats.find(s => s.syncStatus === 'FAILED')?._count || 0;

    // Get last sync time
    const lastSync = await prisma.calendarSync.findFirst({
      where: {
        Hearing: {
          Case: {
            firmId: user.firmId || undefined,
          },
        },
      },
      orderBy: {
        lastSyncedAt: 'desc',
      },
      select: {
        lastSyncedAt: true,
      },
    });

    return NextResponse.json({
      connected: true,
      expiresAt: tokens?.expiresAt || null,
      lastSync: lastSync?.lastSyncedAt || null,
      syncedCount,
      failedCount,
    });
  } catch (error) {
    console.error('[Google Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get Google Calendar status' },
      { status: 500 }
    );
  }
}
