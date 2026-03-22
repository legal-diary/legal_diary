-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'CASE_CLOSED';
ALTER TYPE "ActivityAction" ADD VALUE 'CASE_REOPENED';

-- AlterEnum
ALTER TYPE "CaseStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT;

-- AlterTable
ALTER TABLE "FileDocument" ADD COLUMN     "isFinalOrder" BOOLEAN NOT NULL DEFAULT false;
