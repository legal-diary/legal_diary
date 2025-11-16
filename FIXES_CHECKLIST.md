# Legal Diary - Fixes Implementation Checklist

**Comprehensive checklist for all identified issues**

**How to Use:** Check off each item as you complete it, copy updates back to `.claude/context.md`

---

## 🔴 PRIORITY 1 - CRITICAL (DO IMMEDIATELY)

**Expected Time:** 6-8 hours total | **Target:** Complete in 1 day

### Security

- [ ] **API Key Rotation**
  - [ ] Open OpenAI dashboard
  - [ ] Revoke current key: `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`
  - [ ] Generate new API key
  - [ ] Update `.env.local` with new key
  - [ ] Test OpenAI integration works
  - [ ] Remove `.env.local` from git history: `git rm --cached .env.local && git commit -m "Remove .env.local"`
  - [ ] Add to `.gitignore`: `.env.local`
  - [ ] Verify not in git anymore: `git log --all --full-history -- .env.local`
  - **File:** `.env.local`
  - **Time:** 15 minutes

### Error Boundaries

- [ ] **Create ErrorBoundary Component**
  - [ ] Create file: `src/components/ErrorBoundary.tsx`
  - [ ] Import React, Result from antd, Button from antd
  - [ ] Implement class component with getDerivedStateFromError
  - [ ] Add componentDidCatch for logging
  - [ ] Render error UI with reload button
  - [ ] Test component works
  - **File:** `src/components/ErrorBoundary.tsx` (NEW)
  - **Time:** 1 hour

- [ ] **Wrap Dashboard Page**
  - [ ] Import ErrorBoundary in `src/app/dashboard/page.tsx`
  - [ ] Wrap component children with ErrorBoundary
  - [ ] Test error handling manually
  - **File:** `src/app/dashboard/page.tsx`
  - **Time:** 30 minutes

- [ ] **Wrap Cases List Page**
  - [ ] Import ErrorBoundary in `src/app/cases/page.tsx`
  - [ ] Wrap children with ErrorBoundary
  - [ ] Test error handling
  - **File:** `src/app/cases/page.tsx`
  - **Time:** 30 minutes

- [ ] **Wrap Case Detail Page**
  - [ ] Import ErrorBoundary in `src/app/cases/[id]/page.tsx`
  - [ ] Wrap children with ErrorBoundary
  - [ ] Test error handling
  - **File:** `src/app/cases/[id]/page.tsx`
  - **Time:** 30 minutes

### Memory Leak Fixes

- [ ] **Fix Dashboard useEffect**
  - [ ] Open `src/app/dashboard/page.tsx` (lines 34-74)
  - [ ] Add `let mounted = true` before async function
  - [ ] Check `if (mounted)` before each `setState`
  - [ ] Add cleanup: `return () => { mounted = false; }`
  - [ ] Test for React warnings in console
  - **File:** `src/app/dashboard/page.tsx`
  - **Lines:** 34-74
  - **Time:** 1 hour

- [ ] **Fix Case Detail useEffect**
  - [ ] Open `src/app/cases/[id]/page.tsx` (lines 68-92)
  - [ ] Add `let mounted = true` before async function
  - [ ] Check `if (mounted)` before each `setState`
  - [ ] Add cleanup: `return () => { mounted = false; }`
  - [ ] Test for React warnings
  - **File:** `src/app/cases/[id]/page.tsx`
  - **Lines:** 68-92
  - **Time:** 1 hour

### JSON.parse() Error Handling

- [ ] **Fix AuthContext.tsx**
  - [ ] Open `src/context/AuthContext.tsx` (line 53)
  - [ ] Find: `setUser(JSON.parse(savedUser));`
  - [ ] Wrap in try-catch block
  - [ ] Clear localStorage on error
  - [ ] Test with corrupted localStorage data
  - **File:** `src/context/AuthContext.tsx`
  - **Line:** 53
  - **Time:** 30 minutes

- [ ] **Fix Case Detail Page**
  - [ ] Open `src/app/cases/[id]/page.tsx` (line 279)
  - [ ] Find: `JSON.parse(caseData.aiSummary.keyPoints)`
  - [ ] Wrap in try-catch block
  - [ ] Handle parsing errors gracefully
  - [ ] Check for null/undefined before parsing
  - [ ] Test with invalid JSON
  - **File:** `src/app/cases/[id]/page.tsx`
  - **Line:** 279
  - **Time:** 30 minutes

### setState in Effect

- [ ] **Fix ProtectedRoute.tsx**
  - [ ] Open `src/components/ProtectedRoute.tsx` (line 21)
  - [ ] Reorder: set state BEFORE routing
  - [ ] Current: `router.push()` then `setState`
  - [ ] New: `setState` then `router.push()`
  - [ ] Verify ESLint no longer shows warning
  - **File:** `src/components/ProtectedRoute.tsx`
  - **Line:** 21
  - **Time:** 30 minutes

### Verification

- [ ] **Build passes**
  - [ ] Run: `npm run build`
  - [ ] No TypeScript errors
  - [ ] No build warnings

- [ ] **No React warnings**
  - [ ] Run: `npm run dev`
  - [ ] Open browser console (F12)
  - [ ] No "setState during effect" warnings
  - [ ] No "memory leak" warnings

- [ ] **Test API key works**
  - [ ] Create a new case
  - [ ] Verify AI summary generates
  - [ ] Check OpenAI dashboard usage

---

## 🟠 PRIORITY 2 - HIGH (THIS WEEK)

**Expected Time:** 12-16 hours total | **Target:** Complete in 3-4 days

### API Error Handling

- [ ] **Fix cases/route.ts - JSON parsing**
  - [ ] File: `src/app/api/cases/route.ts` (line 68)
  - [ ] Wrap `await request.json()` in try-catch
  - [ ] Return 400 on JSON parsing error
  - [ ] Test with invalid JSON
  - **Time:** 30 minutes

- [ ] **Fix cases/[id]/route.ts - JSON parsing**
  - [ ] File: `src/app/api/cases/[id]/route.ts` (line 96)
  - [ ] Wrap `await request.json()` in try-catch
  - [ ] Return 400 on JSON parsing error
  - [ ] Test with invalid JSON
  - **Time:** 30 minutes

- [ ] **Fix hearings/route.ts - JSON parsing**
  - [ ] File: `src/app/api/hearings/route.ts` (line 65)
  - [ ] Wrap `await request.json()` in try-catch
  - [ ] Return 400 on JSON parsing error
  - [ ] Test with invalid JSON
  - **Time:** 30 minutes

- [ ] **Add response error checking**
  - [ ] File: `src/app/api/cases/route.ts` (POST handler)
  - [ ] Check `if (!response.ok)` after fetch
  - [ ] Return proper error status
  - [ ] Test with 400+ status codes
  - **Time:** 1 hour

### Input Validation

- [ ] **Add string length limits to cases/route.ts (POST)**
  - [ ] File: `src/app/api/cases/route.ts` (lines 57-68)
  - [ ] Add validation for: `caseTitle` (max 500 chars)
  - [ ] Add validation for: `description` (max 5000 chars)
  - [ ] Add validation for: `clientName` (max 200 chars)
  - [ ] Return 400 if length exceeded
  - [ ] Test with long strings
  - **Time:** 1 hour

- [ ] **Add string length limits to cases/[id]/route.ts (PUT)**
  - [ ] File: `src/app/api/cases/[id]/route.ts` (lines 101-105)
  - [ ] Same validations as above
  - [ ] Test with boundary values
  - **Time:** 1 hour

- [ ] **Add enum validation to hearings/route.ts**
  - [ ] File: `src/app/api/hearings/route.ts` (POST handler)
  - [ ] Validate `hearingType` against allowed enums
  - [ ] Return 400 if invalid
  - [ ] Test with invalid types
  - **Time:** 1 hour

- [ ] **Add future date validation to hearings/route.ts**
  - [ ] File: `src/app/api/hearings/route.ts` (line 88)
  - [ ] Check `hearingDate > now()`
  - [ ] Return 400 if date in past
  - [ ] Test with past/future dates
  - **Time:** 1 hour

### File Upload Security

- [ ] **Add magic byte validation to upload/route.ts**
  - [ ] File: `src/app/api/cases/[id]/upload/route.ts` (line 88)
  - [ ] Read file magic bytes (first 8 bytes)
  - [ ] Verify against expected file type signature
  - [ ] Compare MIME type AND magic bytes
  - [ ] Return 400 if mismatch
  - [ ] Test with spoofed files
  - **Time:** 2 hours

- [ ] **Fix race condition in directory creation**
  - [ ] File: `src/app/api/cases/[id]/upload/route.ts` (lines 109-111)
  - [ ] Replace check-then-create with try-catch
  - [ ] Handle EEXIST error properly
  - [ ] Test with concurrent requests
  - **Time:** 1 hour

### Type Safety

- [ ] **Create CaseFormValues interface**
  - [ ] Add to `src/app/cases/create/page.tsx`
  - [ ] Replace `any` in form handler
  - [ ] Add proper types for all form fields
  - **Time:** 1 hour

- [ ] **Create HearingFormValues interface**
  - [ ] Add to `src/components/HearingCalendar/HearingCalendar.tsx`
  - [ ] Replace `any` in form handler
  - [ ] Type all form fields
  - **Time:** 1 hour

- [ ] **Replace other `any` types**
  - [ ] Audit all remaining `any` uses (15+ instances)
  - [ ] Create proper interfaces for each
  - [ ] Update all usages
  - [ ] Run TypeScript check
  - **Time:** 3 hours

### AI Error Messages

- [ ] **Add AI error handling to cases/route.ts**
  - [ ] File: `src/app/api/cases/route.ts` (lines 102-119)
  - [ ] Instead of silent catch, return warning in response
  - [ ] Include `aiSummaryStatus: 'failed'` in response
  - [ ] Log error for debugging
  - [ ] Test with offline OpenAI
  - **Time:** 1 hour

- [ ] **Add AI error handling to hearings/route.ts**
  - [ ] File: `src/app/api/hearings/route.ts` (lines 113-127)
  - [ ] Same approach as cases
  - [ ] Return status in response
  - **Time:** 1 hour

- [ ] **Display AI errors to user**
  - [ ] Update case list to show warning if AI failed
  - [ ] Update case detail to show warning
  - [ ] Add notification toast message
  - **Time:** 2 hours

### Verification

- [ ] **All Priority 2 items complete**
  - [ ] Run: `npm run build` - should pass
  - [ ] Run: `npm run lint` - check for improvements
  - [ ] Run: `npx tsc --noEmit` - should pass
  - [ ] Manual testing of all API endpoints

---

## 🟡 PRIORITY 3 - MEDIUM (THIS SPRINT)

**Expected Time:** 12-16 hours | **Target:** Complete in 1 week

### ESLint Fixes

- [ ] **Fix 12 ESLint Errors**
  - [ ] Run: `npm run lint`
  - [ ] Fix each error (max 5 minutes each)
  - [ ] Focus on type issues first
  - [ ] Use `--fix` flag where possible: `npm run lint -- --fix`
  - **Time:** 2 hours

- [ ] **Fix 23 ESLint Warnings**
  - [ ] Run: `npm run lint`
  - [ ] Remove unused imports
  - [ ] Remove unused variables
  - [ ] Fix dependency arrays in useEffect
  - **Time:** 3 hours

- [ ] **Verify ESLint passes**
  - [ ] Run: `npm run lint`
  - [ ] No errors, no warnings
  - [ ] All files clean

### Email Validation

- [ ] **Improve email regex**
  - [ ] Files: Multiple (auth, cases, etc.)
  - [ ] Current: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - [ ] New: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`
  - [ ] Test with edge cases
  - **Time:** 1 hour

### Testing

- [ ] **Add unit tests for auth**
  - [ ] Test login endpoint
  - [ ] Test password hashing
  - [ ] Test token generation
  - **Time:** 3 hours

- [ ] **Add unit tests for cases**
  - [ ] Test case creation
  - [ ] Test case validation
  - [ ] Test case filtering
  - **Time:** 3 hours

- [ ] **Add integration tests**
  - [ ] Test full auth flow
  - [ ] Test case creation with AI
  - [ ] Test hearing scheduling
  - **Time:** 4 hours

### Documentation

- [ ] **Update API documentation**
  - [ ] Document all error codes
  - [ ] Document validation rules
  - [ ] Update PROJECT_DOCUMENTATION.md

- [ ] **Create troubleshooting guide**
  - [ ] Document common errors
  - [ ] Add solutions
  - [ ] Include error codes

- [ ] **Document changes made**
  - [ ] Update FIXES_CHECKLIST.md
  - [ ] Update .claude/context.md

---

## 🔵 PRIORITY 4 - LOW (NEXT QUARTER)

**Expected Time:** Open-ended | **Target:** After Priority 1-3 complete

### Testing & Quality

- [ ] Add E2E tests with Cypress/Playwright
- [ ] Add performance tests
- [ ] Add security scanning
- [ ] Setup CI/CD pipeline (GitHub Actions)

### Monitoring & Logging

- [ ] Implement structured logging
- [ ] Add error tracking (Sentry)
- [ ] Add performance monitoring
- [ ] Add analytics

### Optimization

- [ ] Image optimization
- [ ] Bundle size analysis
- [ ] Database query optimization
- [ ] Implement caching

### Features

- [ ] Email notifications
- [ ] SMS reminders
- [ ] Case templates
- [ ] Advanced search/filters
- [ ] Bulk operations
- [ ] Export to PDF

---

## PROGRESS TRACKING

### Session Statistics

| Session | Completed | In Progress | Total |
|---------|-----------|-------------|-------|
| Session 3 (This) | 5 | 0 | 5 |
| Session 4 (Next) | 0 | 0 | 15 |
| Session 5+ | 0 | 0 | 30+ |

### Time Tracking

| Priority | Estimated | Actual | Status |
|----------|-----------|--------|--------|
| P1 (Critical) | 6-8h | ___ | Not Started |
| P2 (High) | 12-16h | ___ | Not Started |
| P3 (Medium) | 12-16h | ___ | Not Started |
| **Total** | **30-40h** | ___ | **Overall** |

---

## IMPORTANT NOTES

### Before You Start

1. **Read** `PROJECT_DOCUMENTATION.md` for full context
2. **Read** `.claude/context.md` for quick reference
3. **Run** `npm run build` to verify current status
4. **Backup** current work: `git add . && git commit -m "Checkpoint before fixes"`

### During Work

1. **Test after each fix:** `npm run build`
2. **Commit frequently:** `git commit -m "Fix: [issue description]"`
3. **Update this checklist** as you complete items
4. **Update .claude/context.md** with progress

### After Each Session

1. **Update .claude/context.md** with:
   - Completed items
   - Remaining work
   - Next session priorities
   - Any blockers discovered

2. **Create final commit:**
   ```bash
   git add .
   git commit -m "Session [N]: [Summary of work done]"
   ```

---

## QUICK REFERENCE

### Essential Commands

```bash
# Verify status
npm run build          # Build and check
npx tsc --noEmit      # Type check only
npm run lint          # Lint only

# Development
npm run dev           # Start dev server
npm run lint -- --fix # Auto-fix linting

# Database
npx prisma generate   # Generate types
npx prisma studio    # Open GUI
```

### Files to Edit (By Priority)

**Priority 1:**
1. `.env.local` - Rotate API key
2. `src/components/ErrorBoundary.tsx` - Create new file
3. `src/app/dashboard/page.tsx` - Add error boundary
4. `src/app/cases/page.tsx` - Add error boundary
5. `src/app/cases/[id]/page.tsx` - Fix memory leak & error boundary
6. `src/context/AuthContext.tsx` - Fix JSON.parse
7. `src/components/ProtectedRoute.tsx` - Fix setState
8. And 2 more useEffect fixes

**Priority 2:**
1. `src/app/api/cases/route.ts` - 2 fixes
2. `src/app/api/cases/[id]/route.ts` - Multiple fixes
3. `src/app/api/cases/[id]/upload/route.ts` - Security fix
4. `src/app/api/hearings/route.ts` - Multiple fixes

---

## COMPLETION CRITERIA

### Priority 1 Complete When:
- [ ] API key rotated and verified
- [ ] `npm run build` passes without errors
- [ ] No React console warnings
- [ ] All 5 critical files fixed
- [ ] `.env.local` removed from git

### Priority 2 Complete When:
- [ ] All API validation in place
- [ ] All input lengths checked
- [ ] File uploads secured
- [ ] Type safety improved (mostly)
- [ ] AI errors user-facing

### Priority 3 Complete When:
- [ ] ESLint fully passes
- [ ] 50%+ test coverage
- [ ] Documentation complete
- [ ] No known bugs

---

**Last Updated:** November 16, 2025
**Checked By:** Claude Code
**Next Review:** After Priority 1 completion

