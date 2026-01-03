import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma, withRetry } from '@/lib/prisma';
import { generateSessionToken } from '@/lib/auth';
import { encrypt } from '@/lib/encryption';

// Google OAuth2 configuration for login
// Use GOOGLE_AUTH_REDIRECT_URI if set, otherwise fall back to /auth/google/callback
const getRedirectUri = () => {
  if (process.env.GOOGLE_AUTH_REDIRECT_URI) {
    return process.env.GOOGLE_AUTH_REDIRECT_URI;
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/auth/google/callback`;
};

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getRedirectUri()
);

interface StateData {
  timestamp: number;
  nonce: string;
  type: string;
}

interface GoogleUserInfo {
  id: string; // Google 'sub' identifier
  email: string;
  name?: string;
  picture?: string;
}

/**
 * POST /api/auth/google/callback
 * Handles Google OAuth callback
 * Exchanges code for tokens, creates/finds user, returns auth token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Validate state parameter (CSRF protection)
    if (!state) {
      return NextResponse.json(
        { error: 'State parameter is required' },
        { status: 400 }
      );
    }

    let stateData: StateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 400 }
      );
    }

    // Check state validity (10 minute expiry)
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - stateData.timestamp > TEN_MINUTES) {
      return NextResponse.json(
        { error: 'Authentication expired. Please try again.' },
        { status: 400 }
      );
    }

    // Verify this is a login state (not calendar-only)
    if (stateData.type !== 'login') {
      return NextResponse.json(
        { error: 'Invalid authentication type' },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    let tokens;
    try {
      const response = await oauth2Client.getToken(code);
      tokens = response.tokens;
    } catch (error) {
      console.error('[Google Auth Callback] Token exchange failed:', error);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code' },
        { status: 400 }
      );
    }

    if (!tokens.access_token) {
      return NextResponse.json(
        { error: 'No access token received from Google' },
        { status: 400 }
      );
    }

    // Get user info from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    let userInfo: GoogleUserInfo;
    try {
      const response = await oauth2.userinfo.get();
      userInfo = {
        id: response.data.id!,
        email: response.data.email!,
        name: response.data.name || undefined,
        picture: response.data.picture || undefined,
      };
    } catch (error) {
      console.error('[Google Auth Callback] Failed to get user info:', error);
      return NextResponse.json(
        { error: 'Failed to get user information from Google' },
        { status: 400 }
      );
    }

    if (!userInfo.email || !userInfo.id) {
      return NextResponse.json(
        { error: 'Could not retrieve email from Google account' },
        { status: 400 }
      );
    }

    // Find existing user by googleId OR email
    let user = await withRetry(() =>
      prisma.user.findFirst({
        where: {
          OR: [
            { googleId: userInfo.id },
            { email: userInfo.email },
          ],
        },
        include: {
          Firm_User_firmIdToFirm: {
            select: {
              name: true,
            },
          },
        },
      })
    );

    let isNewUser = false;
    let needsFirmSetup = false;

    if (user) {
      // Existing user - link Google account if not already linked
      if (!user.googleId) {
        await withRetry(() =>
          prisma.user.update({
            where: { id: user!.id },
            data: { googleId: userInfo.id },
          })
        );
      }

      // Check if user needs firm setup
      needsFirmSetup = !user.firmId;
    } else {
      // New user - create account
      isNewUser = true;
      needsFirmSetup = true;

      user = await withRetry(() =>
        prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name || userInfo.email.split('@')[0],
            googleId: userInfo.id,
            password: null, // OAuth-only user
            firmId: null, // Will be set after firm selection
          },
          include: {
            Firm_User_firmIdToFirm: {
              select: {
                name: true,
              },
            },
          },
        })
      );
    }

    // Store Google Calendar tokens (encrypted)
    if (tokens.access_token && tokens.refresh_token) {
      const encryptedAccessToken = encrypt(tokens.access_token);
      const encryptedRefreshToken = encrypt(tokens.refresh_token);
      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // Default 1 hour

      await withRetry(() =>
        prisma.googleCalendarToken.upsert({
          where: { userId: user!.id },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
          },
          create: {
            userId: user!.id,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt,
          },
        })
      );
    }

    // Create session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await withRetry(() =>
      prisma.session.create({
        data: {
          userId: user!.id,
          token: sessionToken,
          expiresAt,
        },
      })
    );

    // Prepare user data (without password)
    const { password: _, Firm_User_firmIdToFirm, ...userWithoutPassword } = user;
    const userData = {
      ...userWithoutPassword,
      firm_name: Firm_User_firmIdToFirm?.name || null,
    };

    return NextResponse.json({
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      user: userData,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      isNewUser,
      needsFirmSetup,
      googleCalendarConnected: !!(tokens.access_token && tokens.refresh_token),
    });
  } catch (error) {
    console.error('[Google Auth Callback] Error:', error);
    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : String(error))
          : undefined,
      },
      { status: 500 }
    );
  }
}
