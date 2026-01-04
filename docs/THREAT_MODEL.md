# Threat Model — Legal Diary

**Scope:** Legal Diary (Next.js + Prisma + PostgreSQL) handling legal/PII data, file uploads, AI analysis, and Google Calendar sync.

## System Overview
Legal Diary is a legal practice management app with authenticated users (advocates/admins/support staff) operating within a firm. The system stores case data, hearing schedules, documents, and AI summaries in PostgreSQL. Files are uploaded to storage under `public/uploads`. AI analysis is delegated to OpenAI, and Google Calendar sync uses OAuth tokens stored in the database.

## Trust Boundaries
```
Browser (user)
  ↕ HTTPS
Next.js server (API routes, app router)
  ↕ Prisma
PostgreSQL database
  ↕
File storage (public/uploads on server filesystem)
  ↕
External AI provider (OpenAI)
  ↕
External calendar provider (Google Calendar API)
```

**Boundaries:**
1. **Browser ↔ Server:** Authentication tokens and PII traverse this boundary.
2. **Server ↔ Database:** Case data, user data, tokens, and AI summaries stored at rest.
3. **Server ↔ File Storage:** Uploaded files written/read; currently served as public assets.
4. **Server ↔ AI Provider:** Documents and case details transmitted to OpenAI.
5. **Server ↔ Google APIs:** OAuth tokens and event payloads transmitted to Google.

## Assets (What Needs Protection)
- **Legal case data:** case titles, descriptions, client PII, hearing notes.
- **Uploaded documents:** contracts, briefs, court filings, evidence.
- **Credentials & tokens:** session tokens, Google OAuth tokens, `OPENAI_API_KEY`.
- **Audit logs:** may contain sensitive data if not scrubbed.

## Attack Surface Inventory
- **Authentication & session handling:** `src/app/api/auth/*`, `src/lib/middleware.ts`, `src/context/AuthContext.tsx`.
- **Authorization & multi-tenant isolation:** `src/app/api/cases/*`, `src/app/api/hearings/*`, `src/app/api/firms/*`.
- **File upload & serving:** `src/app/api/cases/[id]/upload/route.ts`, `public/uploads`.
- **Document content reading:** `src/app/api/documents/[id]/content/route.ts`.
- **AI endpoints:** `src/app/api/cases/[id]/ai/*`, `src/lib/openai.ts`, `src/lib/fileProcessor.ts`.
- **Google OAuth & calendar:** `src/app/api/google/*`, `src/app/api/auth/google/*`, `src/lib/googleCalendar.ts`.
- **Dashboard aggregation:** `src/app/api/dashboard/route.ts`.

## Data Classification & Handling Rules
- **Restricted (Highest sensitivity):**
  - Client PII, case descriptions, case documents, hearing notes.
  - **Rules:** Never log in plaintext; encrypt at rest; limit access to firm and assignment; avoid public storage; shortest retention possible.
- **Confidential:**
  - Session tokens, Google OAuth tokens, `OPENAI_API_KEY`, encryption keys.
  - **Rules:** Never log; store encrypted (server-side); rotate on exposure; limit scope and TTL.
- **Internal:**
  - Metadata (case counts, firm list for UI).
  - **Rules:** Avoid unauthenticated access when possible; return minimal data.

## Threats by Boundary (STRIDE-oriented)
### 1) Browser ↔ Server
- **Spoofing:** Stolen tokens (localStorage) used to impersonate users.
- **Tampering:** Malformed JSON bodies causing 500s.
- **Information Disclosure:** User-specific responses cached or logged.
- **Repudiation:** Insufficient audit logging with tamper-evident integrity.
- **DoS:** Large uploads or AI endpoints without rate limits.

### 2) Server ↔ Database
- **Information Disclosure:** PII exposed if queries are not scoped to firm.
- **Tampering:** Unvalidated input leading to inconsistent data or stored XSS payloads.
- **Elevation of Privilege:** Assignment/role endpoints without strict authorization.

### 3) Server ↔ File Storage (public/uploads)
- **Information Disclosure:** Unauthenticated access to uploaded documents.
- **Tampering:** Uploading disguised executables; lack of malware scanning.

### 4) Server ↔ AI Provider
- **Information Disclosure:** Full document content sent to third-party provider.
- **Prompt Injection:** Malicious document content steering AI output.
- **DoS/Cost Abuse:** Unbounded requests and document sizes.

### 5) Server ↔ Google APIs
- **Token Exposure:** OAuth tokens stored in DB and used to sync.
- **CSRF/OAuth State Abuse:** Weak state validation could allow token binding to wrong user.

## Security Assumptions
- HTTPS is enforced in production.
- API requests include `Authorization: Bearer <token>` and are validated via `verifyToken`.
- Database is secured and not publicly accessible.
- Environment variables are managed outside of git.

## Key Mitigations (High Level)
- Store uploads outside `public/` and serve via authenticated routes or signed URLs.
- Remove sensitive logging; adopt PII-safe structured logging.
- Add request validation and error handling for malformed JSON.
- Add rate limiting to AI endpoints and uploads.
- Add prompt-injection mitigations and data minimization/redaction before sending to AI.
- Harden OAuth state handling with signed state or server-side nonce store.
- Ensure cache headers are `no-store` or `private` with correct `Vary: Authorization` for user-specific data.

## Caching Risks (User-Specific Data)
- Dashboard and case endpoints return user/firm-specific data. If a CDN or proxy ignores `Cache-Control: private`, data could be cached and served cross-user. Ensure `no-store` for sensitive endpoints or set `private` with strict proxy configuration and `Vary: Authorization`.

## Secret Exposure Response Plan
- If any secret appears in repo/docs or logs:
  1) Revoke/rotate immediately.
  2) Scrub from git history (e.g., BFG or git filter-repo).
  3) Update `.gitignore` and CI checks to block secrets.
  4) Notify impacted parties and document remediation.
