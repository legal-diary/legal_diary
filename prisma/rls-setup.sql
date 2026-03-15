-- ============================================
-- LEGAL DIARY - RLS SAFETY NET SETUP
-- ============================================
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
--
-- This script:
-- 1. Creates a restricted database role (app_prisma) for Prisma
-- 2. Enables RLS on sensitive tables
-- 3. Creates firm-isolation policies
-- 4. Policies use current_setting('app.current_firm_id', true)
--    which must be set via SET LOCAL before each transaction
--
-- IMPORTANT: Test in a staging environment first!
-- ============================================

-- ============================================
-- STEP 1: Create restricted role for Prisma
-- ============================================

-- Create the role (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_prisma') THEN
    CREATE ROLE app_prisma LOGIN PASSWORD '23313432@Sid';
  END IF;
END
$$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO app_prisma;

-- Grant CRUD on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_prisma;

-- Grant usage on all sequences (needed for auto-increment/serial columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_prisma;

-- Ensure future tables also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_prisma;

-- IMPORTANT: Do NOT grant BYPASSRLS to this role
-- The postgres superuser role bypasses RLS, but app_prisma will not

-- ============================================
-- STEP 2: Enable RLS on sensitive tables
-- ============================================

-- Tables with direct firmId
ALTER TABLE "Case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;

-- Tables linked to Case (firm isolation via join)
ALTER TABLE "Hearing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CaseAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AISummary" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Create firm-isolation policies
-- ============================================
-- These policies use current_setting('app.current_firm_id', true)
-- The 'true' parameter means it returns NULL if not set (instead of error)
--
-- Policy logic:
-- - If app.current_firm_id IS SET: only allow rows matching that firmId
-- - If app.current_firm_id IS NOT SET (NULL/empty): allow all rows
--   (this is the "safety net" approach - doesn't break existing code,
--    but blocks cross-firm access when context IS set)

-- === Case table (direct firmId) ===
CREATE POLICY "firm_isolation_case" ON "Case"
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR "firmId" = current_setting('app.current_firm_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR "firmId" = current_setting('app.current_firm_id', true)
  );

-- === ActivityLog table (direct firmId) ===
CREATE POLICY "firm_isolation_activity_log" ON "ActivityLog"
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR "firmId" = current_setting('app.current_firm_id', true)
  )
  WITH CHECK (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR "firmId" = current_setting('app.current_firm_id', true)
  );

-- === Hearing table (linked via Case.firmId) ===
CREATE POLICY "firm_isolation_hearing" ON "Hearing"
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "Hearing"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  )
  WITH CHECK (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "Hearing"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  );

-- === FileDocument table (linked via Case.firmId) ===
CREATE POLICY "firm_isolation_file_document" ON "FileDocument"
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "FileDocument"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  )
  WITH CHECK (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "FileDocument"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  );

-- === CaseAssignment table (linked via Case.firmId) ===
CREATE POLICY "firm_isolation_case_assignment" ON "CaseAssignment"
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "CaseAssignment"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  )
  WITH CHECK (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "CaseAssignment"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  );

-- === AISummary table (linked via Case.firmId) ===
CREATE POLICY "firm_isolation_ai_summary" ON "AISummary"
  FOR ALL
  USING (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "AISummary"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  )
  WITH CHECK (
    COALESCE(current_setting('app.current_firm_id', true), '') = ''
    OR EXISTS (
      SELECT 1 FROM "Case"
      WHERE "Case"."id" = "AISummary"."caseId"
      AND "Case"."firmId" = current_setting('app.current_firm_id', true)
    )
  );

-- ============================================
-- STEP 4: Verify setup
-- ============================================
-- Run these queries to verify RLS is enabled:

-- Check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('Case', 'ActivityLog', 'Hearing', 'FileDocument', 'CaseAssignment', 'AISummary');

-- Check policies
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public';

-- ============================================
-- STEP 5: Test (run as app_prisma role)
-- ============================================
-- SET ROLE app_prisma;
--
-- -- Without firm context: should return ALL rows (safety net allows)
-- SELECT count(*) FROM "Case";
--
-- -- With firm context: should return only matching firm rows
-- SET LOCAL app.current_firm_id = 'your_firm_id_here';
-- SELECT count(*) FROM "Case";
--
-- -- With WRONG firm context: should return 0 rows
-- SET LOCAL app.current_firm_id = 'nonexistent_firm_id';
-- SELECT count(*) FROM "Case";
--
-- RESET ROLE;

-- ============================================
-- NOTE: After running this script, update your
-- DATABASE_URL to use the app_prisma role:
--
-- DATABASE_URL="postgresql://app_prisma.vlnchumszvsoemelfict:YOUR_PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
-- DIRECT_URL stays as postgres superuser (needed for migrations)
-- ============================================
