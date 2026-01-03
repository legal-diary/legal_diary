# Legal Diary - AI Assistant Context File

**Last Updated:** January 3, 2026

## Project Overview

**Legal Diary** is a full-stack case management system designed for law firms and legal practitioners. It serves as a **Legal Referencer** - a daily task management tool that helps advocates track court hearings, manage cases, and maintain their legal practice.

### Tech Stack
- **Frontend:** Next.js 16.0.7 (App Router) with React 19.2.1
- **UI Library:** Ant Design 5.28.1
- **Backend:** Next.js API routes
- **Database:** PostgreSQL with Prisma ORM 6.19.0
- **AI Integration:** OpenAI GPT-4o for case analysis
- **Authentication:** JWT with session-based token management + Google OAuth
- **Google Integration:** Google Calendar sync via googleapis
- **Styling:** CSS Variables + Responsive vh/vw units

### Repository
- **GitHub:** https://github.com/siddharth654321/legal_diary
- **Local Path:** `C:\coding\Legal Diary\legal-diary`

---

## Application Architecture

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts         # JWT login with rate limiting
│   │   │   ├── register/route.ts      # User + Firm registration
│   │   │   ├── logout/route.ts        # Session invalidation
│   │   │   ├── setup-firm/route.ts    # Firm setup for Google OAuth users
│   │   │   └── google/
│   │   │       ├── route.ts           # Google Sign-In initiation
│   │   │       └── callback/route.ts  # Google Sign-In callback
│   │   ├── cases/
│   │   │   ├── route.ts               # GET all, POST new case
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET, PUT, DELETE case
│   │   │       ├── upload/route.ts    # Document upload
│   │   │       └── ai/
│   │   │           ├── analyze-documents/route.ts
│   │   │           ├── custom-analysis/route.ts
│   │   │           └── reanalyze/route.ts
│   │   ├── dashboard/
│   │   │   ├── route.ts               # Dashboard statistics
│   │   │   └── today/route.ts         # Today's hearings for legal referencer
│   │   ├── hearings/
│   │   │   ├── route.ts               # GET all, POST new hearing
│   │   │   └── [id]/route.ts          # GET, PUT, DELETE hearing
│   │   ├── google/
│   │   │   ├── auth/route.ts          # Google Calendar OAuth initiation
│   │   │   ├── callback/route.ts      # Google Calendar OAuth callback
│   │   │   ├── status/route.ts        # Connection status
│   │   │   ├── disconnect/route.ts    # Disconnect Google Calendar
│   │   │   └── calendar/
│   │   │       └── sync/
│   │   │           ├── route.ts       # Sync all hearings
│   │   │           └── [hearingId]/route.ts  # Sync single hearing
│   │   ├── documents/
│   │   │   └── [id]/content/route.ts  # Document content retrieval
│   │   ├── firms/route.ts             # Firm management
│   │   └── health/route.ts            # Health check endpoint
│   ├── auth/
│   │   └── google/callback/page.tsx   # Google OAuth callback page
│   ├── dashboard/page.tsx             # Legal Referencer dashboard
│   ├── cases/
│   │   ├── page.tsx                   # Cases list with filters
│   │   ├── create/page.tsx            # New case form
│   │   └── [id]/page.tsx              # Case details + AI analysis
│   ├── calendar/page.tsx              # Hearing calendar view
│   ├── settings/page.tsx              # Settings & integrations
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── layout.tsx                     # Root layout with AuthProvider
├── components/
│   ├── Layout/DashboardLayout.tsx     # Main app layout (sidebar + header)
│   ├── ProtectedRoute.tsx             # Route guard component
│   ├── HearingCalendar/
│   │   └── HearingCalendar.tsx        # Full-featured calendar component
│   ├── GoogleCalendar/
│   │   └── GoogleCalendarConnect.tsx  # Google Calendar connection UI
│   ├── Auth/
│   │   └── FirmSelectionModal.tsx     # Firm selection for Google auth
│   ├── Cases/
│   │   └── AIAnalysisTab.tsx          # AI analysis UI
│   ├── Documents/
│   │   └── DocumentViewer.tsx         # Document viewing component
│   ├── Dashboard/
│   │   └── DashboardSkeleton.tsx      # Dashboard loading skeleton
│   └── Skeletons/
│       └── index.tsx                  # Reusable skeleton components
├── context/
│   └── AuthContext.tsx                # Auth state with token management
├── lib/
│   ├── prisma.ts                      # Prisma client singleton
│   ├── auth.ts                        # Password hashing, token generation
│   ├── middleware.ts                  # Token verification
│   ├── openai.ts                      # OpenAI GPT-4o integration
│   ├── rateLimit.ts                   # Login attempt rate limiting
│   ├── fileProcessor.ts               # Document parsing
│   ├── encryption.ts                  # Encryption utilities for tokens
│   └── googleCalendar.ts              # Google Calendar API integration
└── generated/prisma/                  # Prisma generated client
```

---

## Database Schema (Prisma)

### Core Models

#### User
```prisma
model User {
  id, email, name, password, firmId, role (ADVOCATE|ADMIN|SUPPORT_STAFF)
  - Can own a firm (ownedFirm) or be a member (firmMember)
  - Creates cases and has sessions
  - Has GoogleCalendarToken for calendar integration
}
```

#### Firm
```prisma
model Firm {
  id, name, address, phone, email, ownerId
  - Has one owner and multiple members
  - All cases belong to a firm
}
```

#### Case
```prisma
model Case {
  id, caseNumber (unique), caseTitle, clientName, clientEmail, clientPhone
  description, status, priority, opponents, courtName, judgeAssigned
  - Has many hearings, fileDocuments
  - Has one aiSummary
}
```

#### Hearing
```prisma
model Hearing {
  id, caseId, hearingDate, hearingTime, hearingType, courtRoom, notes, status
  - Types: ARGUMENTS, EVIDENCE_RECORDING, FINAL_HEARING, INTERIM_HEARING, JUDGMENT_DELIVERY, PRE_HEARING, OTHER
  - Status: SCHEDULED, POSTPONED, COMPLETED, CANCELLED
  - Has many CalendarSync records for Google Calendar integration
  - Has many Reminders
}
```

#### GoogleCalendarToken (NEW)
```prisma
model GoogleCalendarToken {
  id, userId (unique), accessToken, refreshToken, expiresAt, calendarId
  - Stores encrypted Google OAuth tokens for each user
  - Enables Google Calendar sync functionality
}
```

#### CalendarSync (NEW)
```prisma
model CalendarSync {
  id, hearingId, googleEventId (unique), lastSyncedAt, syncStatus, errorMessage
  - Tracks sync status between hearings and Google Calendar events
  - syncStatus: SYNCED, PENDING, ERROR
}
```

#### Reminder
```prisma
model Reminder {
  id, hearingId, reminderType, reminderTime, status, sentAt
  - Types: ONE_DAY_BEFORE, ONE_HOUR_BEFORE, etc.
  - Status: PENDING, SENT, FAILED
}
```

#### AISummary
```prisma
model AISummary {
  id, caseId (unique), summary, keyPoints (JSON), insights
  - Stores AI-generated case analysis
}
```

### Enums
- **CaseStatus:** ACTIVE, PENDING_JUDGMENT, CONCLUDED, APPEAL, DISMISSED
- **Priority:** LOW, MEDIUM, HIGH, URGENT
- **HearingType:** ARGUMENTS, EVIDENCE_RECORDING, FINAL_HEARING, etc.
- **HearingStatus:** SCHEDULED, POSTPONED, COMPLETED, CANCELLED
- **ReminderType:** ONE_DAY_BEFORE, ONE_HOUR_BEFORE, etc.
- **ReminderStatus:** PENDING, SENT, FAILED

---

## Key Features

### 1. Legal Referencer Dashboard (`/dashboard`)
The main dashboard redesigned as a **Legal Referencer** showing:
- **Today's date** prominently displayed
- **Today's Schedule table** with columns:
  - Previous Date | Case Number | Party Name | Position/Stage | Next Date | Court | Notes
- **Hearing Management section** below to add/edit upcoming hearings
- Quick stats showing total matters for today
- Skeleton loading states for better UX

### 2. Case Management (`/cases`, `/cases/[id]`)
- Create, view, edit, delete cases
- Upload documents (PDF, Word, etc.)
- Filter by status, priority, search by case number/client
- Tabbed interface: Overview, Hearings, Documents, AI Analysis
- Document viewer component for in-app viewing

### 3. AI Analysis (OpenAI GPT-4o)
- **Case Re-analysis:** Generate summary, key points, insights from case data + documents
- **Document Analysis:** Analyze selected documents for key findings, risks, recommendations
- **Custom Analysis:** Ask custom questions about the case with AI

### 4. Hearing Calendar (`/calendar`) - ENHANCED
- **Karnataka High Court Calendar 2026** with court holidays and working days
- **Interactive Month View** with Year/Month selectors (no Year view toggle)
- **Color-Coded Legend:**
  - Working Day (green)
  - Holiday/Sunday/2nd Sat (red)
  - Court Vacation (blue)
  - Restricted Holiday (yellow)
  - Sitting Day (purple)
- **Date Details Modal** (Google Calendar-style):
  - Shows full date with day status
  - "Schedule New Hearing" button at top
  - Timeline view of all hearings sorted by time
  - Color-coded timeline connectors by hearing type
  - View/Edit/Delete action buttons for each hearing
- **Hearing Details Modal:**
  - Full hearing information
  - Google Calendar sync status
  - Edit and Delete buttons
- **Google Calendar Integration:**
  - Connect Google Calendar from Settings
  - Sync hearings to Google Calendar
  - Sync status indicator (synced/not synced)
  - Re-sync individual hearings

### 5. Settings Page (`/settings`) - NEW
- Integrations management
- Google Calendar connection/disconnection
- Connected services overview

### 6. Authentication
- **JWT Authentication:** Token-based (7-day expiry)
- **Google Sign-In:** OAuth 2.0 with firm selection
- Rate limiting on login (5 attempts per 15 minutes)
- Mandatory firm association during registration
- Token expiry checking with auto-logout
- Firm setup flow for Google-authenticated users

### 7. Google Calendar Integration - NEW
- OAuth 2.0 authentication flow
- Encrypted token storage
- Bi-directional sync capability
- Individual hearing sync
- Bulk sync all hearings
- Sync status tracking
- Auto-refresh of expired tokens

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user with firm |
| POST | `/api/auth/login` | Login and get JWT token |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/auth/google` | Initiate Google Sign-In |
| GET | `/api/auth/google/callback` | Google Sign-In callback |
| POST | `/api/auth/setup-firm` | Setup firm for Google users |

### Cases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List all cases for firm |
| POST | `/api/cases` | Create new case |
| GET | `/api/cases/[id]` | Get case details |
| PUT | `/api/cases/[id]` | Update case |
| DELETE | `/api/cases/[id]` | Delete case |
| POST | `/api/cases/[id]/upload` | Upload documents |

### AI Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cases/[id]/ai/reanalyze` | Re-analyze case with AI |
| POST | `/api/cases/[id]/ai/analyze-documents` | Analyze specific documents |
| POST | `/api/cases/[id]/ai/custom-analysis` | Custom AI query |

### Hearings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hearings` | List all hearings |
| POST | `/api/hearings` | Create new hearing |
| GET | `/api/hearings/[id]` | Get hearing details |
| PUT | `/api/hearings/[id]` | Update hearing |
| DELETE | `/api/hearings/[id]` | Delete hearing |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get dashboard statistics |
| GET | `/api/dashboard/today` | Get today's hearings with prev/next dates |

### Google Calendar - NEW
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/google/auth` | Initiate Google Calendar OAuth |
| GET | `/api/google/callback` | OAuth callback handler |
| GET | `/api/google/status` | Get connection status |
| POST | `/api/google/disconnect` | Disconnect Google Calendar |
| POST | `/api/google/calendar/sync` | Sync all hearings |
| POST | `/api/google/calendar/sync/[hearingId]` | Sync single hearing |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents/[id]/content` | Get document content |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/legal_diary"

# OpenAI
OPENAI_API_KEY=sk-proj-...

# NextAuth
NEXTAUTH_SECRET=your_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (for Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Calendar OAuth
GOOGLE_CALENDAR_CLIENT_ID=your_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_calendar_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/google/callback

# Encryption (for token storage)
ENCRYPTION_KEY=your_32_character_encryption_key

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
UPLOAD_DIR=public/uploads
```

**For Vercel Deployment:**
- Set `DATABASE_URL` to your production PostgreSQL connection string
- Set `OPENAI_API_KEY` with a valid production key
- Update `NEXTAUTH_URL` to your Vercel domain
- Configure Google OAuth redirect URIs for production domain
- Set `ENCRYPTION_KEY` securely

---

## Design Guidelines

### Theme: Minimalistic Lawyer
- **Primary Color:** Navy (#1a3a52) - Trust, Authority
- **Secondary:** Charcoal (#5a5a5a) - Professionalism
- **Accent:** Gold (#d4af37) - Prestige
- **Background:** White (#ffffff) and Light Gray-Blue (#f5f7fa)
- **No gradients** - Clean, professional aesthetic

### Responsive Design
- All units use `vh`, `vw`, `rem` (not `px`)
- Typography uses `clamp()` for fluid scaling
- Mobile-first with progressive enhancement
- Desktop sidebar hidden on mobile, replaced with drawer

---

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run Prisma migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate
```

---

## Recent Changes (January 2026)

### Calendar Enhancement
1. **Date Details Modal** (Google Calendar-style):
   - Click any date to open detailed view
   - Timeline view showing all hearings sorted by time
   - Color-coded timeline connectors by hearing type
   - View/Edit/Delete action buttons for each hearing
   - "Schedule New Hearing" button at top

2. **Improved Calendar Header:**
   - Removed Month/Year toggle
   - Kept Year and Month dropdown selectors only
   - Calendar locked to Month view

3. **Data Refresh Fix:**
   - Added `await` to `fetchCalendarData()` calls
   - Calendar now updates immediately after CRUD operations

4. **UI Cleanup:**
   - Commented out Google Calendar Status Card (was showing sync stats)
   - Cleaner calendar interface

### Google Calendar Integration (December 2025)
1. **OAuth 2.0 Integration:**
   - Connect Google Calendar from Settings page
   - Encrypted token storage in database
   - Auto-refresh of expired tokens

2. **Hearing Sync:**
   - Sync all hearings to Google Calendar
   - Sync individual hearings
   - Sync status tracking (synced/not synced)
   - Re-sync capability

3. **New Database Models:**
   - `GoogleCalendarToken` for OAuth tokens
   - `CalendarSync` for tracking sync status

### Google Sign-In (December 2025)
1. **OAuth Authentication:**
   - Sign in with Google option on login page
   - Firm selection modal for new Google users
   - Seamless integration with existing auth system

---

## Key Code Patterns

### Authentication Flow
```typescript
// All API routes verify token:
const token = request.headers.get('authorization')?.replace('Bearer ', '');
const user = await verifyToken(token);
if (!user || !user.firmId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Protected Routes (Client)
```tsx
<ProtectedRoute>
  <DashboardLayout>
    {/* Page content */}
  </DashboardLayout>
</ProtectedRoute>
```

### Firm-Scoped Data
All case and hearing queries are scoped to the user's firm:
```typescript
await prisma.case.findMany({
  where: { firmId: user.firmId }
});
```

### Google Calendar Token Encryption
```typescript
// Tokens are encrypted before storage
import { encrypt, decrypt } from '@/lib/encryption';
const encryptedToken = encrypt(accessToken);
```

---

## Component Architecture

### HearingCalendar Component (`src/components/HearingCalendar/HearingCalendar.tsx`)
- Full-featured calendar with Karnataka High Court holidays
- State management for modals: `scheduleModalOpen`, `hearingDetailsModalOpen`, `dateDetailsModalOpen`
- Edit mode for hearing updates: `isEditMode`, `editingHearing`
- Google Calendar integration: `googleCalendarConnected`, `isSyncedToGoogle()`
- Custom header with Year/Month selectors
- Date cell rendering with holiday colors and hearing pills
- Multiple modal types: Schedule, Hearing Details, Date Details

### GoogleCalendarConnect Component
- Connection status display
- Connect/Disconnect buttons
- Loading states
- Error handling

---

## Known Issues / Notes

1. **Ant Design v5 Warning:** Console warning about React 19 compatibility - can be ignored
2. **OpenAI API Key:** Ensure `.env` has a valid API key
3. **Local Database:** Uses PostgreSQL on localhost:5432 - ensure it's running
4. **Google OAuth:** Requires configured OAuth credentials in Google Cloud Console
5. **Source Maps Warning:** Some warnings about invalid source maps during dev - can be ignored

---

## Contact

**Repository Owner:** Siddharth
**GitHub:** https://github.com/siddharth654321/legal_diary
