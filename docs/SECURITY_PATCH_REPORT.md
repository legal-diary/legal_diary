# Security Patch Report — Team B2 Hardening

## Summary of Fixed Findings

### P0-1: Exposed OpenAI API key in documentation
- **Fix:** Removed the plaintext API key from repository documentation and replaced with redacted placeholders.
- **Files:** `.claude/context.md`, `PROJECT_DOCUMENTATION.md`, `DOCUMENTATION_SUMMARY.txt`, `FIXES_CHECKLIST.md`, `SESSION_COMPLETE.md`.
- **Follow-up:** Key rotation is still required outside of this repo.

### P0-2: Uploaded case documents publicly accessible
- **Fix:** New uploads are stored outside `public/` and served through an authenticated download endpoint.
- **Controls added:**
  - Authenticated download route (`/api/documents/[id]/download`).
  - Uploads stored under a private `uploads/` directory.
  - Middleware blocks direct access to `/uploads/*` paths.
  - Legacy files still resolve for authenticated access via download route.

### P0-3: Sensitive tokens/PII logged in plaintext
- **Fix:** Removed token, user email, and document content logging in auth middleware, AI routes, file processor, and case routes.

### P1-1: AI endpoints lacked prompt-injection and data-minimization controls
- **Fixes:**
  - Added safety system prompts and prompt-injection defenses.
  - Added redaction for emails/phone/IDs before sending content to the model.
  - Added request timeouts and per-user rate limiting for AI endpoints.
  - Added total-content size caps on AI analysis inputs.

### P1-2: File type validation relied on MIME/extension only
- **Fix:** Added magic byte validation for PDFs, Office files, images, and text uploads.

### P1-3: Session tokens stored in localStorage
- **Fix:** Moved auth to HTTP-only cookies, removed localStorage token usage, added `/api/auth/session`, and updated protected routes to validate via session.

### P1-4: OAuth state not integrity-protected (Google Calendar)
- **Fix:** OAuth state is now HMAC-signed and verified with a server-side secret.

## Additional Hardening
- Added JSON parsing guards across multiple endpoints.
- Enforced `Cache-Control: no-store` for sensitive dashboard and document content responses.
- Required authentication for firm listing endpoint to prevent enumeration.

## Verification
- `npm run lint`
- `npm run build`
- `npm test`

## Remaining Risks / Follow-ups
- In-memory rate limiting should be replaced with a centralized store (e.g., Redis) for multi-instance deployments.
- Consider migrating legacy public uploads to the private storage directory and deleting remaining files in `public/uploads`.
- Ensure `GOOGLE_OAUTH_STATE_SECRET` (or `NEXTAUTH_SECRET`) is set in all environments.
- Rotate the leaked OpenAI API key and scrub it from git history if required by policy.
