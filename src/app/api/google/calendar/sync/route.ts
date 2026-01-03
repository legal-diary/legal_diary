import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/middleware';
import { syncAllHearings, isGoogleCalendarConnected } from '@/lib/googleCalendar';

/**
 * POST /api/google/calendar/sync
 * Sync all hearings to Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.firmId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if connected
    const connected = await isGoogleCalendarConnected(user.id);
    if (!connected) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    // Sync all hearings
    const result = await syncAllHearings(
      user.id,
      user.firmId,
      user.role === 'ADMIN' ? undefined : user.id
    );

    console.log('[Google Sync] Completed:', result);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
      message: `Synced ${result.synced} hearings, ${result.failed} failed`,
    });
  } catch (error) {
    console.error('[Google Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync hearings' },
      { status: 500 }
    );
  }
}
