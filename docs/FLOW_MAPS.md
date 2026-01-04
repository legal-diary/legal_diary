# Flow Maps — Legal Diary

## Scope
This document enumerates all routes (App Router pages and API handlers), notes middleware usage, and maps end-to-end flows for key user journeys. It also captures suspected bottlenecks and scalability risks with file references.

---

## Route Inventory

### App Routes (Pages)
- `/` → `src/app/page.tsx` (redirect based on auth state)
- `/login` → `src/app/login/page.tsx`
- `/register` → `src/app/register/page.tsx`
- `/auth/google/callback` → `src/app/auth/google/callback/page.tsx`
- `/dashboard` → `src/app/dashboard/page.tsx`
- `/cases` → `src/app/cases/page.tsx`
- `/cases/create` → `src/app/cases/create/page.tsx`
- `/cases/[id]` → `src/app/cases/[id]/page.tsx`
- `/calendar` → `src/app/calendar/page.tsx`
- `/settings` → `src/app/settings/page.tsx`

### API Routes (Route Handlers)
- **Auth**
  - `POST /api/auth/login` → `src/app/api/auth/login/route.ts`
  - `POST /api/auth/register` → `src/app/api/auth/register/route.ts`
  - `POST /api/auth/logout` → `src/app/api/auth/logout/route.ts`
  - `POST /api/auth/set-password` → `src/app/api/auth/set-password/route.ts`
  - `GET /api/auth/set-password` → `src/app/api/auth/set-password/route.ts`
  - `POST /api/auth/setup-firm` → `src/app/api/auth/setup-firm/route.ts`
  - `GET /api/auth/google` → `src/app/api/auth/google/route.ts`
  - `POST /api/auth/google/callback` → `src/app/api/auth/google/callback/route.ts`
- **Cases**
  - `GET /api/cases` → `src/app/api/cases/route.ts`
  - `POST /api/cases` → `src/app/api/cases/route.ts`
  - `GET /api/cases/[id]` → `src/app/api/cases/[id]/route.ts`
  - `PUT /api/cases/[id]` → `src/app/api/cases/[id]/route.ts`
  - `DELETE /api/cases/[id]` → `src/app/api/cases/[id]/route.ts`
  - `POST /api/cases/[id]/upload` → `src/app/api/cases/[id]/upload/route.ts`
  - `POST /api/cases/[id]/assign` → `src/app/api/cases/[id]/assign/route.ts`
  - `DELETE /api/cases/[id]/assign` → `src/app/api/cases/[id]/assign/route.ts`
  - `GET /api/cases/[id]/assign` → `src/app/api/cases/[id]/assign/route.ts`
  - `POST /api/cases/[id]/ai/reanalyze` → `src/app/api/cases/[id]/ai/reanalyze/route.ts`
  - `POST /api/cases/[id]/ai/analyze-documents` → `src/app/api/cases/[id]/ai/analyze-documents/route.ts`
  - `POST /api/cases/[id]/ai/custom-analysis` → `src/app/api/cases/[id]/ai/custom-analysis/route.ts`
- **Hearings**
  - `GET /api/hearings` → `src/app/api/hearings/route.ts`
  - `POST /api/hearings` → `src/app/api/hearings/route.ts`
  - `GET /api/hearings/[id]` → `src/app/api/hearings/[id]/route.ts`
  - `PUT /api/hearings/[id]` → `src/app/api/hearings/[id]/route.ts`
  - `DELETE /api/hearings/[id]` → `src/app/api/hearings/[id]/route.ts`
- **Dashboard**
  - `GET /api/dashboard` → `src/app/api/dashboard/route.ts`
  - `GET /api/dashboard/today` → `src/app/api/dashboard/today/route.ts`
- **Documents**
  - `GET /api/documents/[id]/content` → `src/app/api/documents/[id]/content/route.ts`
- **Firms**
  - `GET /api/firms` → `src/app/api/firms/route.ts`
  - `GET /api/firms/advocates` → `src/app/api/firms/advocates/route.ts`
  - `GET /api/firms/members` → `src/app/api/firms/members/route.ts`
  - `PUT /api/firms/members/[id]` → `src/app/api/firms/members/[id]/route.ts`
  - `DELETE /api/firms/members/[id]` → `src/app/api/firms/members/[id]/route.ts`
- **Google Calendar**
  - `GET /api/google/status` → `src/app/api/google/status/route.ts`
  - `GET /api/google/auth` → `src/app/api/google/auth/route.ts`
  - `GET /api/google/callback` → `src/app/api/google/callback/route.ts`
  - `POST /api/google/calendar/sync` → `src/app/api/google/calendar/sync/route.ts`
  - `POST /api/google/calendar/sync/[hearingId]` → `src/app/api/google/calendar/sync/[hearingId]/route.ts`
  - `POST /api/google/disconnect` → `src/app/api/google/disconnect/route.ts`
- **Health**
  - `GET /api/health` → `src/app/api/health/route.ts`

### Middleware & Server Actions
- **Token verification helper:** `src/lib/middleware.ts` exposes `verifyToken` and `withAuth` for API handlers.
- **Edge middleware:** None detected (no `src/middleware.ts`).
- **Server Actions:** None detected (`rg "use server" src` returns no results).

---

## End-to-End Flow Maps (Key Journeys)

### 1) Email/Password Login
1. UI: `/login` form submit (`src/app/login/page.tsx`).
2. Client: `AuthContext.login` calls `POST /api/auth/login` (`src/context/AuthContext.tsx`).
3. Server: `login/route.ts` validates, rate-limits (`src/lib/rateLimit.ts`), queries Prisma for user + session (`src/lib/prisma.ts`).
4. Server: returns session token + user data; client saves to localStorage.
5. UI: Protected routes check localStorage (`src/components/ProtectedRoute.tsx`) and allow `/dashboard`.

### 2) Google OAuth Login + Firm Setup
1. UI: Google button on `/login` or `/register` triggers `GET /api/auth/google`.
2. Server: `auth/google/route.ts` returns OAuth URL.
3. Browser: redirect to Google; upon return, client hits `/auth/google/callback` page.
4. Client: `POST /api/auth/google/callback` exchanges code for tokens, creates/updates user, creates session.
5. Client: stores `authToken`, `user`, flags for firm/password setup in localStorage.
6. UI: `AuthContext` opens `FirmSelectionModal` if `firmId` missing → `POST /api/auth/setup-firm`.

### 3) Registration (Email)
1. UI: `/register` form submit (`src/app/register/page.tsx`).
2. Client: `AuthContext.register` → `POST /api/auth/register`.
3. Server: `register/route.ts` creates user + firm (new) or joins existing.
4. Client: auto-login via `/api/auth/login`.

### 4) Dashboard Overview
1. UI: `/dashboard` triggers `GET /api/dashboard` (`src/app/dashboard/page.tsx`).
2. Server: verifies token, runs parallel Prisma queries for hearings and cases (`src/app/api/dashboard/route.ts`).
3. Client: renders header, today hearings, and upcoming list.

### 5) Case List
1. UI: `/cases` loads `GET /api/cases?minimal=true` (`src/app/cases/page.tsx`).
2. Server: role-based filters cases and returns minimal fields (`src/app/api/cases/route.ts`).
3. Client: local filtering for search/status/priority.

### 6) Case Creation + AI Summary
1. UI: `/cases/create` submits to `POST /api/cases` (`src/app/cases/create/page.tsx`).
2. Server: creates case + assignment, triggers `analyzeCaseWithAI` and persists `AISummary` (`src/app/api/cases/route.ts`, `src/lib/openai.ts`).
3. Client: optional document upload → `POST /api/cases/[id]/upload`.

### 7) Case Detail View
1. UI: `/cases/[id]` loads `GET /api/cases/[id]` (`src/app/cases/[id]/page.tsx`).
2. Server: role-based access filter, returns case + documents + AI summary.
3. Client: renders overview, hearings, documents, AI tabs, assignment controls (admin-only).

### 8) Case Update + Document Deletion
1. UI: edit modal submits to `PUT /api/cases/[id]`.
2. Server: validates update fields, deletes selected documents from disk and DB (`src/app/api/cases/[id]/route.ts`).
3. Client: refreshes case data.

### 9) Case Assignment (Admin)
1. UI: Case Assignment controls (`src/components/Cases/CaseAssignment.tsx`).
2. Client: `POST /api/cases/[id]/assign` to add users; `DELETE` to remove.
3. Server: verifies role + firm, updates `CaseAssignment` records.

### 10) Hearing Create/Update/Delete
1. UI: Add/Edit hearing from dashboard or case detail → `POST /api/hearings` or `PUT /api/hearings/[id]`.
2. Server: create hearing + default reminder; optional Google Calendar sync (`src/app/api/hearings/route.ts`, `src/lib/googleCalendar.ts`).
3. Server: optional AI hearing insights (`generateHearingInsights` in `src/lib/openai.ts`).
4. Delete: `DELETE /api/hearings/[id]` with optional Google Calendar deletion.

### 11) Calendar View + Google Sync
1. UI: `/calendar` loads `GET /api/hearings?calendar=true` and `GET /api/cases?minimal=true`.
2. Client: fetches Google status `GET /api/google/status`.
3. User action: sync all or single hearing → `POST /api/google/calendar/sync` or `/sync/[hearingId]`.
4. Server: uses `src/lib/googleCalendar.ts` to create/update events and store `CalendarSync`.

### 12) Document Viewing
1. UI: Document Viewer modal (`src/components/Documents/DocumentViewer.tsx`).
2. For text files: `GET /api/documents/[id]/content` reads filesystem and returns content.
3. For PDFs/images: direct file URL load from `public/uploads/...`.

### 13) AI Analysis
1. UI: AI Analysis Tab (`src/components/Cases/AIAnalysisTab.tsx`).
2. Server: `/api/cases/[id]/ai/*` extracts document content (`src/lib/fileProcessor.ts`) and calls OpenAI (`src/lib/openai.ts`).
3. Response: AI summary or analysis returned to UI and (for reanalysis) saved in `AISummary`.

---

## Top 10 Suspected Bottlenecks (with References)
1. **Large case list queries without pagination** — `GET /api/cases` full include of hearings, documents, assignments (`src/app/api/cases/route.ts`).
2. **Case detail fetch loads multiple relations at once** — `GET /api/cases/[id]` includes `Hearing`, `FileDocument`, `AISummary`, `assignments` (`src/app/api/cases/[id]/route.ts`).
3. **Dashboard query fan-out** — multiple Prisma queries per dashboard load with non-trivial joins (`src/app/api/dashboard/route.ts`).
4. **Calendar view fetch returns all hearings** — no server pagination or date bounding in calendar mode (`src/app/api/hearings/route.ts`).
5. **Document extraction on request path** — `safeExtractFileContent` and PDF parsing are CPU-heavy and synchronous to request (`src/lib/fileProcessor.ts`, `src/app/api/cases/[id]/ai/*`).
6. **AI calls executed inline** — OpenAI requests are blocking during case create or AI actions (`src/app/api/cases/route.ts`, `src/lib/openai.ts`).
7. **Local filesystem I/O for uploads** — synchronous or per-request file ops during uploads and deletes (`src/app/api/cases/[id]/upload/route.ts`, `src/app/api/cases/[id]/route.ts`).
8. **Token verification hits DB each request** — `verifyToken` performs DB lookup for every authorized API call (`src/lib/middleware.ts`).
9. **Google Calendar sync loops per hearing** — sequential event sync for all hearings (`src/lib/googleCalendar.ts`, `src/app/api/google/calendar/sync/route.ts`).
10. **Document rendering in client** — DOCX conversion via `mammoth` in the browser for each view (`src/components/Documents/DocumentViewer.tsx`).

## Top 10 Scalability Risks (with References)
1. **In-memory rate limiter** — resets on server restart and does not scale across instances (`src/lib/rateLimit.ts`).
2. **Local filesystem storage** — uploads in `public/uploads` do not scale across multi-instance deployments (`src/app/api/cases/[id]/upload/route.ts`).
3. **No pagination or limits on core lists** — cases and hearings can grow unbounded (`src/app/api/cases/route.ts`, `src/app/api/hearings/route.ts`).
4. **AI processing is synchronous** — no background job/queue for AI workloads (`src/app/api/cases/route.ts`, `src/app/api/cases/[id]/ai/*`).
5. **Token verification hits DB for every request** — potential DB hot-spot without caching (`src/lib/middleware.ts`).
6. **Google Calendar sync sequential requests** — single-threaded loop can exceed rate limits (`src/lib/googleCalendar.ts`).
7. **Document extraction in API thread** — CPU-heavy parsing competes with API throughput (`src/lib/fileProcessor.ts`).
8. **Large dashboard payloads** — aggregated response includes multiple datasets; can grow with data size (`src/app/api/dashboard/route.ts`).
9. **Client-side localStorage as source of truth** — limited scalability for multi-device or multi-session consistency (`src/context/AuthContext.tsx`).
10. **Per-request full includes** — many endpoints include nested relations (assignments, hearings, files) instead of field-scoped DTOs (`src/app/api/cases/[id]/route.ts`, `src/app/api/cases/route.ts`).
