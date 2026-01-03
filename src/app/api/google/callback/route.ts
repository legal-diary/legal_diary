import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, storeTokens } from '@/lib/googleCalendar';

/**
 * GET /api/google/callback
 * Handles OAuth callback from Google
 * Exchanges code for tokens and stores them encrypted
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle user cancellation or errors
    if (error) {
      console.error('[Google Callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=' + encodeURIComponent(error), request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=Missing+code+or+state', request.url)
      );
    }

    // Decode and validate state
    let stateData: { userId: string; firmId: string; timestamp: number; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=Invalid+state', request.url)
      );
    }

    // Check state timestamp (valid for 10 minutes)
    const tenMinutes = 10 * 60 * 1000;
    if (Date.now() - stateData.timestamp > tenMinutes) {
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=State+expired', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error('[Google Callback] Missing tokens:', tokens);
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=Failed+to+get+tokens', request.url)
      );
    }

    // Calculate expiry date
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Store encrypted tokens
    await storeTokens(
      stateData.userId,
      tokens.access_token,
      tokens.refresh_token,
      expiresAt
    );

    console.log('[Google Callback] Successfully connected for user:', stateData.userId);

    // Redirect to calendar page with success message
    return NextResponse.redirect(
      new URL('/calendar?google=connected', request.url)
    );
  } catch (error) {
    console.error('[Google Callback] Error:', error);
    return NextResponse.redirect(
      new URL('/calendar?google=error&message=Connection+failed', request.url)
    );
  }
}
