import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'crypto';

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

// Scopes for login + calendar sync
const LOGIN_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
];

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow for login/registration
 * No authentication required (user is logging in)
 * Returns redirect URL to Google consent screen
 */
export async function GET() {
  try {
    // Create state parameter for CSRF protection
    // For login, we don't have userId yet, just timestamp + nonce
    const stateData = {
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
      type: 'login', // Distinguish from calendar-only auth
    };

    // Encode state as base64
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Generate OAuth URL with login scopes
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: LOGIN_SCOPES,
      state,
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true,
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('[Google Login Auth] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
