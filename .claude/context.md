# Claude Context for Legal Diary Project

**Last Updated:** November 16, 2025
**Project:** Legal Diary - Legal Practice Management System
**Status:** Code Review Complete | Critical Fixes Required

---

## QUICK START FOR NEW SESSIONS

### What is This Project?

**Legal Diary** is a comprehensive legal practice management system built with Next.js 16, React 19, TypeScript, and Ant Design. It enables advocates and law firms to:
- Manage legal cases with complete tracking
- Schedule court hearings in a visual calendar
- Upload and organize case documents
- Get AI-powered insights using OpenAI's Claude API

### Current Project Status

**Build Status:** ✅ PASS (TypeScript compiles, production build successful)

**Code Review Status:** ✅ COMPLETE (35+ issues identified)

**Critical Issues Found:** 5 (MUST FIX BEFORE DEPLOYMENT)

**Overall Health:** 7/10

---

## CRITICAL CONTEXT

### 🔴 EXPOSED SECURITY KEY (IMMEDIATE ACTION NEEDED)

**ISSUE:** OpenAI API key is exposed in `.env.local` file
**LOCATION:** Root directory `.env.local`
**KEY:** <redacted>

**IMMEDIATE ACTIONS:**
1. Revoke this key in OpenAI dashboard
2. Generate new API key
3. Update .env.local
4. Remove .env.local from git history
5. Add .env.local to .gitignore

---

## PROJECT STRUCTURE

### Key Directories
```
src/
├── app/
│   ├── api/              # API endpoints (auth, cases, hearings)
│   ├── dashboard/        # Main dashboard
│   ├── cases/           # Case management pages
│   ├── calendar/        # Hearing calendar
│   └── [login|register]/ # Auth pages
├── components/          # React components (Layout, Calendar, etc.)
├── context/            # AuthContext for global auth state
├── lib/               # Utilities (auth, prisma, openai, middleware)
└── generated/         # Auto-generated Prisma types
```

### Database
- **Type:** PostgreSQL
- **ORM:** Prisma
- **Tables:** 8 (User, Session, Firm, Case, Hearing, FileDocument, AISummary, Reminder)

---

## CRITICAL ISSUES SUMMARY

### Issue #1: Exposed API Key ⚠️ SECURITY CRITICAL
**Status:** Not Fixed | **Time to Fix:** 15 minutes
**Action:** Revoke key and rotate immediately

### Issue #2: Missing Error Boundaries ⚠️ CRITICAL
**Status:** Not Fixed | **Time to Fix:** 2 hours
**Files:** Dashboard, Cases list, Case detail pages
**Impact:** App crashes on component errors with no fallback UI

### Issue #3: Memory Leaks in useEffect ⚠️ HIGH
**Status:** Not Fixed | **Time to Fix:** 2 hours
**Files:** `src/app/dashboard/page.tsx`, `src/app/cases/[id]/page.tsx`
**Impact:** Memory leak warnings, state updates after unmount

### Issue #4: Unprotected JSON.parse() ⚠️ HIGH
**Status:** Not Fixed | **Time to Fix:** 1 hour
**Files:** AuthContext.tsx, Cases detail page
**Impact:** App crashes if localStorage corrupted

### Issue #5: setState in Effect ⚠️ HIGH
**Status:** Not Fixed | **Time to Fix:** 30 minutes
**File:** ProtectedRoute.tsx
**Impact:** React warnings, cascading renders

---

## FIXES COMPLETED IN LAST SESSION

✅ Fixed TypeScript compilation errors
- Corrected enum imports (Priority → was CasePriority)
- Fixed Prisma client import path
- Added null safety checks for user.firmId across all API routes
- Fixed Ant Design Calendar component prop
- Fixed Menu divider type annotation

✅ Successfully built production version
- 14 pages compiled
- 8 API endpoints compiled
- Build time: 3.2 seconds

✅ Identified and documented all issues
- 35+ issues cataloged
- Severity levels assigned
- Fix priorities defined
- Estimated times calculated

---

## NEXT STEPS (PRIORITY ORDER)

### This Session - Priority 1 (Critical - 1-2 days)
- [ ] Rotate exposed API key
- [ ] Implement error boundaries (3 files)
- [ ] Fix memory leaks in useEffect (2 files)
- [ ] Fix JSON.parse() error handling (2 files)
- [ ] Fix setState in effect (1 file)

### Next Session - Priority 2 (High - 3-5 days)
- [ ] Add JSON parsing error handling to API routes (3 files)
- [ ] Add string length validation to input fields
- [ ] Add file upload magic byte validation
- [ ] Replace `any` types with proper TypeScript interfaces
- [ ] Add user-facing error messages for AI failures

### Following Session - Priority 3 (Medium - 1 week)
- [ ] Fix all ESLint errors (12) and warnings (23)
- [ ] Add missing date validation
- [ ] Implement proper error messages
- [ ] Add comprehensive testing

---

## TECHNOLOGY STACK

**Frontend:**
- Next.js 16.0.3 (Turbopack)
- React 19.2.0
- TypeScript 5
- Ant Design 5.28.1
- dayjs 1.11.19
- Axios 1.13.2

**Backend:**
- Node.js 18+
- Next.js API Routes
- Prisma 6.19.0
- PostgreSQL 12+

**AI:**
- OpenAI API (Claude 3.5 Sonnet)

**Security:**
- bcryptjs (password hashing)
- Token-based authentication (7-day expiry)
- Rate limiting on login

---

## DEVELOPMENT COMMANDS

```bash
# Start development
npm run dev                 # http://localhost:3000

# Build & Test
npm run build              # Production build
npx tsc --noEmit          # Type check
npm run lint              # ESLint

# Database
npx prisma generate       # Generate Prisma client
npx prisma migrate dev    # Create migration
npx prisma studio        # GUI database editor

# Database utilities
npx prisma db reset       # Reset (⚠️ deletes data)
npx prisma db push        # Sync schema
```

---

## IMPORTANT FILE LOCATIONS

| Item | Path |
|------|------|
| Documentation | `PROJECT_DOCUMENTATION.md` |
| Environment | `.env.local` |
| Database Schema | `prisma/schema.prisma` |
| Auth Context | `src/context/AuthContext.tsx` |
| API Routes | `src/app/api/` |
| Utilities | `src/lib/` |
| Components | `src/components/` |

---

## ENVIRONMENT VARIABLES

```env
DATABASE_URL="postgresql://legal_user:LegalDiary@123@localhost:5432/legal_diary"
OPENAI_API_KEY=sk-xxx... (NEEDS ROTATION - KEY EXPOSED)
NEXTAUTH_SECRET=your-32-char-random-string
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
UPLOAD_DIR=public/uploads
```

⚠️ **CRITICAL:** The OPENAI_API_KEY is exposed and must be rotated immediately.

---

## GIT HISTORY

**Latest Commits:**
- Session 3: Comprehensive code review, TypeScript fixes, successful build
- Session 2: Database and Prisma setup
- Session 1: Initial project creation

**Current Branch:** master
**Uncommitted Changes:** Multiple files modified for TypeScript fixes

---

## KEY INSIGHTS FOR NEXT SESSION

1. **Start with Priority 1 fixes** - They're critical for stability and security
2. **Error boundaries first** - Prevents app crashes during error handling work
3. **Test after each fix** - Use `npm run build` to verify changes
4. **Keep this context updated** - Update this file as you work

---

## DOCUMENTATION REFERENCE

For detailed information, see `PROJECT_DOCUMENTATION.md` which includes:
- Complete feature descriptions
- Full API endpoint documentation
- Database schema details
- Security considerations
- Deployment guidelines
- Troubleshooting guide

---

## CONTACT & NOTES

**Project Owner:** Legal Diary Team
**Development Environment:** Windows (C:\coding\Legal Diary\legal-diary)
**Target Users:** Advocates and law firms
**Deployment Target:** Vercel (recommended) or Docker

**Last Review Date:** November 16, 2025
**Reviewer:** Claude Code
**Health Score:** 7/10 (Build works, but critical fixes needed)

---

## QUICK DIAGNOSTIC

To check project status quickly:

```bash
# Verify build
npm run build 2>&1 | tail -20

# Check types
npx tsc --noEmit 2>&1

# Check linting
npm run lint 2>&1 | head -50
```

If all pass with no errors = Project is ready for feature work
If build fails = Stop and debug build errors
If type errors = Fix TypeScript issues first

---

**This context file updates when work is completed on the project.**
**Refer back to this file when starting new development sessions.**
