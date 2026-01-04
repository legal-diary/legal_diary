import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/middleware';
import { disconnectGoogleCalendar } from '@/lib/googleCalendar';
import { getAuthToken } from '@/lib/authToken';

/**
 * POST /api/google/disconnect
 * Disconnect Google Calendar and revoke tokens
 */
export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await disconnectGoogleCalendar(user.id);

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    console.error('[Google Disconnect] Error');
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}
