import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, storeTokens } from '@/lib/googleCalendar';
import crypto from 'crypto';

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
      console.error('[Google Callback] OAuth error');
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
    const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET;
    if (!stateSecret) {
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=OAuth+configuration+missing', request.url)
      );
    }

    const [payload, signature] = state.split('.');
    if (!payload || !signature) {
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=Invalid+state', request.url)
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', stateSecret)
      .update(payload)
      .digest('hex');

    if (signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.redirect(
        new URL('/calendar?google=error&message=Invalid+state', request.url)
      );
    }
    try {
      stateData = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
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
      console.error('[Google Callback] Missing tokens');
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

    // Redirect to calendar page with success message
    return NextResponse.redirect(
      new URL('/calendar?google=connected', request.url)
    );
  } catch (error) {
    console.error('[Google Callback] Error');
    return NextResponse.redirect(
      new URL('/calendar?google=error&message=Connection+failed', request.url)
    );
  }
}
