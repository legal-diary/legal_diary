# Performance Report — Team A2 (Performance/Scale Optimizer)

## Summary
This report documents targeted performance/scalability improvements focused on database query efficiency, pagination, client bundle reductions, and safe server-side caching. Changes were scoped to preserve existing behavior while improving response times and payload sizes under high traffic.

## Before/After Evidence (Qualitative)
- **Before**: Case and hearing list endpoints returned unbounded results, increasing DB load and response sizes as data grows. Case list in the UI fetched the full dataset every time.
- **After**: Both `/api/cases` and `/api/hearings` support pagination with server-side limits, reducing response size and load. The UI now fetches a single page of cases and a month-bounded set of hearings.

- **Before**: `/api/dashboard/today` included full hearing histories per case in a single query, which scaled poorly as case histories grew.
- **After**: `/api/dashboard/today` now loads only the minimum needed per hearing and computes previous/next dates with a single follow-up query, avoiding heavy nested includes.

- **Before**: `mammoth` was imported eagerly into the document viewer client bundle.
- **After**: `mammoth` is dynamically imported only when viewing DOCX files, reducing the default bundle size.

- **Before**: Every authenticated request always hit the DB for token verification.
- **After**: Added short-lived, in-memory token cache (30s TTL, capped size) to reduce redundant DB lookups while preserving security.

## Changes Made
- Added pagination support to `/api/cases` and `/api/hearings` with `page`/`limit` params and total counts.
- Bounded calendar hearing fetches by month with `startDate`/`endDate` params.
- Optimized `/api/dashboard/today` to avoid heavy nested includes.
- Introduced safe, short-lived in-memory cache for `verifyToken` DB lookups.
- Dynamically imported `mammoth` to reduce client bundle cost.
- Added minimal timing instrumentation for document analysis (no PII).

## Files Touched
- `src/app/api/cases/route.ts`
- `src/app/api/hearings/route.ts`
- `src/app/api/dashboard/today/route.ts`
- `src/app/cases/page.tsx`
- `src/components/HearingCalendar/HearingCalendar.tsx`
- `src/components/Documents/DocumentViewer.tsx`
- `src/lib/middleware.ts`
- `src/app/api/cases/[id]/ai/analyze-documents/route.ts`

## Rollback Plan
1. Revert this commit (or specific files) using `git revert <commit_sha>`.
2. Remove pagination params from client calls if reverting API changes.
3. Delete `docs/PERF_REPORT.md` if required.

## Notes on Safety & Privacy
- Token cache is short-lived and keyed by session token, with a strict TTL and cap. No user data is logged.
- No user/case PII is added to logs or cache keys. Logs only include coarse timing and error contexts.
