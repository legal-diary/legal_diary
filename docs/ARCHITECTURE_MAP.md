# Architecture Map — Legal Diary

## Scope
This document maps the runtime structure of the Legal Diary Next.js application, including folder-by-folder summaries, major modules, and integration points. It is derived from repository documentation and direct source inspection under `src/` and `prisma/`.

## Repository Layout (High Level)
- `src/`
  - `app/` — Next.js App Router pages and API route handlers.
  - `components/` — UI modules for dashboards, cases, calendar, auth flows, and settings.
  - `context/` — Global auth state via `AuthContext`.
  - `data/` — Static reference data (court holiday calendar).
  - `lib/` — Shared utilities for auth, Prisma, middleware, OpenAI, file processing, and Google Calendar.
- `prisma/` — Prisma schema and migrations.
- `public/uploads/` — Local filesystem storage for uploaded case documents.

## Folder-by-Folder Summary

### `src/app/`
- **Routing root**
  - `layout.tsx` — Application shell; wraps all pages in `AuthProvider`.
  - `globals.css` — Global CSS.
  - `page.tsx` — Home redirect: sends authenticated users to `/dashboard`, unauthenticated to `/login`.
- **Auth pages**
  - `login/page.tsx` — Email/password login, Google OAuth initiation.
  - `register/page.tsx` — Registration and firm join/create flow, plus Google OAuth.
  - `auth/google/callback/page.tsx` — Client handler for Google OAuth callback; exchanges auth code for session.
- **Core feature pages**
  - `dashboard/page.tsx` — “Legal Referencer” dashboard with hearings and quick add/edit.
  - `cases/page.tsx` — Cases list (filtering + minimal query).
  - `cases/create/page.tsx` — Case creation + optional file upload.
  - `cases/[id]/page.tsx` — Case detail: overview, hearings, documents, AI analysis, assignments.
  - `calendar/page.tsx` — Hearing calendar and Google Calendar sync.
  - `settings/page.tsx` — Google Calendar integration, password management, team management.
- **API routes** (`app/api/**/route.ts`)
  - Auth: login/register/logout, Google OAuth, firm setup, password management.
  - Cases: CRUD + uploads + AI analysis + assignment.
  - Hearings: CRUD + AI insights + Google Calendar sync hooks.
  - Dashboard: summary queries for dashboard + “today” view.
  - Documents: text file content fetch.
  - Firms: firm list + team management + advocates.
  - Google Calendar: OAuth, sync, status, disconnect.
  - Health check.

### `src/components/`
- **Layout**
  - `Layout/DashboardLayout.tsx` — Navigation shell, menu routing, logout.
  - `ProtectedRoute.tsx` — Client-side auth guard (localStorage check).
- **Dashboard**
  - `Dashboard/DashboardSkeleton.tsx` — Skeleton states.
- **Cases**
  - `Cases/AIAnalysisTab.tsx` — Reanalysis + document analysis + custom prompt AI flows.
  - `Cases/CaseAssignment.tsx` — Admin assignment flow to advocates.
- **Calendar**
  - `HearingCalendar/HearingCalendar.tsx` — Calendar UI, hearing CRUD, Google sync.
- **Google Calendar**
  - `GoogleCalendar/GoogleCalendarConnect.tsx` — Connection status + sync controls.
- **Documents**
  - `Documents/DocumentViewer.tsx` — Document rendering by type; uses `/api/documents/[id]/content` for text.
- **Auth**
  - `Auth/FirmSelectionModal.tsx` — Post-OAuth firm selection.
  - `Auth/SetPasswordModal.tsx` — Post-OAuth password setup.
- **Settings**
  - `Settings/TeamManagement.tsx` — Admin role management and member removal.
  - `Settings/SetPassword.tsx` — Password management page section.
- **Skeletons**
  - `Skeletons/index.tsx` — Loading placeholders for major pages.

### `src/context/`
- `AuthContext.tsx` — Stores auth token/user in localStorage, manages login/register/logout, and gates post-OAuth firm/password setup modals.

### `src/lib/`
- `prisma.ts` — Prisma client singleton + `withRetry` helper.
- `middleware.ts` — `verifyToken` + `withAuth` utilities for API authentication.
- `auth.ts` — Password hashing and session token generation.
- `rateLimit.ts` — In-memory login rate limiter.
- `openai.ts` — AI analysis functions (case, hearing, document, custom prompt) via OpenAI.
- `fileProcessor.ts` — PDF/DOCX/TXT/XLSX extraction and content truncation.
- `googleCalendar.ts` — Google OAuth, token storage, calendar sync operations.
- `encryption.ts` — AES-GCM token encryption for Google tokens.

### `src/data/`
- `bangaloreCourtHolidays2026.ts` — Calendar metadata for holiday/sitting-day classification used in hearing calendar.

### `prisma/`
- `schema.prisma` — Models for users, firms, cases, hearings, reminders, sessions, documents, AI summaries, Google tokens, and calendar sync state.

## Major Modules & Responsibilities

### 1) Auth
- **Client:** `src/context/AuthContext.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/auth/google/callback/page.tsx`, `src/components/Auth/*`.
- **Server:** `src/app/api/auth/*/route.ts`.
- **Session storage:** `Session` table in Prisma.
- **Auth check:** `verifyToken` in `src/lib/middleware.ts` used by most API routes.

### 2) Cases
- **Client pages:** `src/app/cases/page.tsx`, `src/app/cases/create/page.tsx`, `src/app/cases/[id]/page.tsx`.
- **Server routes:** `src/app/api/cases/route.ts`, `src/app/api/cases/[id]/route.ts`, `/upload`, `/assign`, `/ai/*`.
- **DB models:** `Case`, `CaseAssignment`, `FileDocument`, `AISummary`.

### 3) Hearings & Calendar
- **Client pages/components:** `src/app/dashboard/page.tsx`, `src/app/calendar/page.tsx`, `src/components/HearingCalendar/HearingCalendar.tsx`.
- **Server routes:** `src/app/api/hearings/route.ts`, `src/app/api/hearings/[id]/route.ts`, `src/app/api/dashboard/*.ts`.
- **DB models:** `Hearing`, `Reminder`, `CalendarSync`.

### 4) Documents & Uploads
- **Client:** `DocumentViewer` in `src/components/Documents/DocumentViewer.tsx`.
- **Server:** upload route `src/app/api/cases/[id]/upload/route.ts`, text content route `src/app/api/documents/[id]/content/route.ts`.
- **Storage:** local filesystem under `public/uploads/<caseId>/...`.
- **Extraction:** `src/lib/fileProcessor.ts`.

### 5) AI Insights
- **Client:** `AIAnalysisTab` in `src/components/Cases/AIAnalysisTab.tsx`, quick reanalysis actions in `src/app/cases/[id]/page.tsx`.
- **Server:** `src/lib/openai.ts` used from case and hearing routes.
- **DB models:** `AISummary` for persisted case analysis.

## Prisma Instantiation & DB Access
- **Singleton client:** `src/lib/prisma.ts` exports `prisma` and `withRetry`.
- **Usage:** API route handlers call `prisma.*` directly (e.g., `src/app/api/cases/route.ts`, `src/app/api/hearings/route.ts`, `src/app/api/firms/*`).
- **Retry helper:** `withRetry` wraps select Prisma queries to improve resilience on cold-start DB connections.

## External Integrations

| Integration | Purpose | Key Files |
| --- | --- | --- |
| OpenAI (gpt-4o) | Case summaries, document analysis, hearing insights, custom analysis | `src/lib/openai.ts`, `src/app/api/cases/[id]/ai/*`, `src/app/api/hearings/route.ts` |
| Google OAuth | Login + calendar authorization | `src/app/api/auth/google/*`, `src/app/api/google/*`, `src/lib/googleCalendar.ts` |
| Google Calendar API | Hearing event sync + status | `src/lib/googleCalendar.ts`, `src/app/api/google/*`, `src/components/GoogleCalendar/GoogleCalendarConnect.tsx` |
| Local filesystem | Document uploads stored under `/public/uploads` | `src/app/api/cases/[id]/upload/route.ts`, `src/app/api/documents/[id]/content/route.ts` |
| PDF/DOCX parsing | Document content extraction | `src/lib/fileProcessor.ts` |

## Notes on Sensitive Data Handling
- Auth relies on session tokens stored in DB and passed in `Authorization: Bearer <token>` headers.
- Google tokens are encrypted via `src/lib/encryption.ts` before storage.
- File uploads live in `public/uploads`, which implies direct URL access to stored documents.
