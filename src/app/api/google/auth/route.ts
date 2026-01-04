import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/middleware';
import { getAuthToken } from '@/lib/authToken';
import { getAuthUrl } from '@/lib/googleCalendar';
import crypto from 'crypto';

/**
 * GET /api/google/auth
 * Initiates Google OAuth flow
 * Returns redirect URL to Google consent screen
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

    // Create state parameter to prevent CSRF
    // Contains: userId + timestamp + random bytes
    const stateData = {
      userId: user.id,
      firmId: user.firmId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET;
    if (!stateSecret) {
      return NextResponse.json(
        { error: 'OAuth configuration missing' },
        { status: 500 }
      );
    }

    // Encode state as base64 + HMAC signature
    const payload = Buffer.from(JSON.stringify(stateData)).toString('base64');
    const signature = crypto
      .createHmac('sha256', stateSecret)
      .update(payload)
      .digest('hex');
    const state = `${payload}.${signature}`;

    // Generate OAuth URL
    const authUrl = getAuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('[Google Auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
