import { google, calendar_v3 } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

// Google OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes required for calendar access
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Hearing type to Google Calendar color mapping
// Google Calendar color IDs: https://developers.google.com/calendar/api/v3/reference/colors
const HEARING_TYPE_COLORS: Record<string, string> = {
  ARGUMENTS: '9',           // Blue
  EVIDENCE_RECORDING: '6',  // Orange
  FINAL_HEARING: '11',      // Red
  INTERIM_HEARING: '10',    // Green
  JUDGMENT_DELIVERY: '3',   // Purple
  PRE_HEARING: '7',         // Cyan
  OTHER: '8',               // Gray
};

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Store encrypted tokens in database
 */
export async function storeTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date
) {
  const encryptedAccessToken = encrypt(accessToken);
  const encryptedRefreshToken = encrypt(refreshToken);

  await prisma.googleCalendarToken.upsert({
    where: { userId },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
    },
    create: {
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
    },
  });
}

/**
 * Get decrypted tokens for a user
 */
export async function getTokens(userId: string) {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) {
    return null;
  }

  return {
    accessToken: decrypt(tokenRecord.accessToken),
    refreshToken: decrypt(tokenRecord.refreshToken),
    expiresAt: tokenRecord.expiresAt,
    calendarId: tokenRecord.calendarId,
  };
}

/**
 * Refresh tokens if expired
 */
export async function refreshTokensIfNeeded(userId: string): Promise<string | null> {
  const tokens = await getTokens(userId);
  if (!tokens) {
    return null;
  }

  // Check if token expires in next 5 minutes
  const now = new Date();
  const expiresIn = tokens.expiresAt.getTime() - now.getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresIn > fiveMinutes) {
    return tokens.accessToken;
  }

  // Token expired or expiring soon, refresh it
  try {
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token && credentials.expiry_date) {
      await storeTokens(
        userId,
        credentials.access_token,
        tokens.refreshToken, // Keep original refresh token
        new Date(credentials.expiry_date)
      );
      return credentials.access_token;
    }
  } catch (error) {
    console.error('[GoogleCalendar] Token refresh failed:', error);
    // Delete invalid tokens
    await prisma.googleCalendarToken.delete({
      where: { userId },
    }).catch(() => {}); // Ignore if already deleted
  }

  return null;
}

/**
 * Get authenticated Calendar API client
 */
export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
  const accessToken = await refreshTokensIfNeeded(userId);
  if (!accessToken) {
    return null;
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Check if user has Google Calendar connected
 */
export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const tokens = await getTokens(userId);
  return tokens !== null;
}

/**
 * Disconnect Google Calendar (revoke tokens)
 */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const tokens = await getTokens(userId);

  if (tokens) {
    try {
      // Revoke token with Google
      await oauth2Client.revokeToken(tokens.accessToken);
    } catch (error) {
      console.error('[GoogleCalendar] Token revocation failed:', error);
      // Continue with deletion even if revocation fails
    }
  }

  // Delete token record
  await prisma.googleCalendarToken.delete({
    where: { userId },
  }).catch(() => {}); // Ignore if already deleted

  // Delete all calendar sync records for user's hearings
  const userCases = await prisma.case.findMany({
    where: { createdById: userId },
    select: { id: true },
  });

  const caseIds = userCases.map(c => c.id);

  await prisma.calendarSync.deleteMany({
    where: {
      Hearing: {
        caseId: { in: caseIds },
      },
    },
  });
}

// ============================================
// Calendar Event Operations
// ============================================

interface HearingEventData {
  hearingId: string;
  caseNumber: string;
  caseTitle: string;
  clientName: string;
  hearingDate: Date;
  hearingTime?: string | null;
  hearingType: string;
  courtRoom?: string | null;
  notes?: string | null;
}

/**
 * Create a Google Calendar event for a hearing
 */
export async function createCalendarEvent(
  userId: string,
  hearing: HearingEventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Google Calendar not connected' };
  }

  try {
    // Parse hearing time or default to 10:00 AM
    const [hours, minutes] = hearing.hearingTime
      ? hearing.hearingTime.split(':').map(Number)
      : [10, 0];

    const startTime = new Date(hearing.hearingDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1); // Default 1 hour duration

    const event: calendar_v3.Schema$Event = {
      summary: `${hearing.caseNumber} - ${hearing.hearingType.replace(/_/g, ' ')}`,
      description: [
        `Case: ${hearing.caseTitle}`,
        `Client: ${hearing.clientName}`,
        hearing.courtRoom ? `Court Room: ${hearing.courtRoom}` : '',
        hearing.notes ? `\nNotes: ${hearing.notes}` : '',
        '\n---',
        'Created by Legal Diary',
      ].filter(Boolean).join('\n'),
      location: hearing.courtRoom || undefined,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      colorId: HEARING_TYPE_COLORS[hearing.hearingType] || HEARING_TYPE_COLORS.OTHER,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 }, // 1 day before
          { method: 'popup', minutes: 60 },   // 1 hour before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    if (response.data.id) {
      // Store sync record
      await prisma.calendarSync.create({
        data: {
          hearingId: hearing.hearingId,
          googleEventId: response.data.id,
          syncStatus: 'SYNCED',
        },
      });

      return { success: true, eventId: response.data.id };
    }

    return { success: false, error: 'No event ID returned' };
  } catch (error) {
    console.error('[GoogleCalendar] Create event failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a Google Calendar event for a hearing
 */
export async function updateCalendarEvent(
  userId: string,
  hearing: HearingEventData
): Promise<{ success: boolean; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Google Calendar not connected' };
  }

  // Get existing sync record
  const syncRecord = await prisma.calendarSync.findFirst({
    where: { hearingId: hearing.hearingId },
  });

  if (!syncRecord) {
    // No existing event, create new one
    return createCalendarEvent(userId, hearing);
  }

  try {
    const [hours, minutes] = hearing.hearingTime
      ? hearing.hearingTime.split(':').map(Number)
      : [10, 0];

    const startTime = new Date(hearing.hearingDate);
    startTime.setHours(hours, minutes, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const event: calendar_v3.Schema$Event = {
      summary: `${hearing.caseNumber} - ${hearing.hearingType.replace(/_/g, ' ')}`,
      description: [
        `Case: ${hearing.caseTitle}`,
        `Client: ${hearing.clientName}`,
        hearing.courtRoom ? `Court Room: ${hearing.courtRoom}` : '',
        hearing.notes ? `\nNotes: ${hearing.notes}` : '',
        '\n---',
        'Created by Legal Diary',
      ].filter(Boolean).join('\n'),
      location: hearing.courtRoom || undefined,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      colorId: HEARING_TYPE_COLORS[hearing.hearingType] || HEARING_TYPE_COLORS.OTHER,
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId: syncRecord.googleEventId,
      requestBody: event,
    });

    // Update sync record
    await prisma.calendarSync.update({
      where: { id: syncRecord.id },
      data: {
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED',
        errorMessage: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[GoogleCalendar] Update event failed:', error);

    // Update sync record with error
    await prisma.calendarSync.update({
      where: { id: syncRecord.id },
      data: {
        syncStatus: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a Google Calendar event for a hearing
 */
export async function deleteCalendarEvent(
  userId: string,
  hearingId: string
): Promise<{ success: boolean; error?: string }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { success: false, error: 'Google Calendar not connected' };
  }

  const syncRecord = await prisma.calendarSync.findFirst({
    where: { hearingId },
  });

  if (!syncRecord) {
    return { success: true }; // No event to delete
  }

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: syncRecord.googleEventId,
    });

    // Delete sync record
    await prisma.calendarSync.delete({
      where: { id: syncRecord.id },
    });

    return { success: true };
  } catch (error) {
    console.error('[GoogleCalendar] Delete event failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sync all hearings for a user to Google Calendar
 */
export async function syncAllHearings(
  userId: string,
  firmId: string,
  assignedUserId?: string
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const calendar = await getCalendarClient(userId);
  if (!calendar) {
    return { synced: 0, failed: 0, errors: ['Google Calendar not connected'] };
  }

  // Get all hearings for user's firm
  const hearings = await prisma.hearing.findMany({
    where: {
      Case: {
        firmId,
        ...(assignedUserId
          ? {
              assignments: {
                some: {
                  userId: assignedUserId,
                },
              },
            }
          : {}),
      },
      status: { in: ['SCHEDULED', 'POSTPONED'] },
    },
    include: {
      Case: {
        select: {
          caseNumber: true,
          caseTitle: true,
          clientName: true,
        },
      },
      CalendarSync: true,
    },
  });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const hearing of hearings) {
    const hearingData: HearingEventData = {
      hearingId: hearing.id,
      caseNumber: hearing.Case.caseNumber,
      caseTitle: hearing.Case.caseTitle,
      clientName: hearing.Case.clientName,
      hearingDate: hearing.hearingDate,
      hearingTime: hearing.hearingTime,
      hearingType: hearing.hearingType,
      courtRoom: hearing.courtRoom,
      notes: hearing.notes,
    };

    const result = hearing.CalendarSync.length > 0
      ? await updateCalendarEvent(userId, hearingData)
      : await createCalendarEvent(userId, hearingData);

    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push(`${hearing.Case.caseNumber}: ${result.error}`);
    }
  }

  return { synced, failed, errors };
}
