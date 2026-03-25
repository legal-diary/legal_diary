-- Rename existing HearingStatus enum values (safe, no data loss)
ALTER TYPE "HearingStatus" RENAME VALUE 'SCHEDULED' TO 'UPCOMING';
ALTER TYPE "HearingStatus" RENAME VALUE 'COMPLETED' TO 'CLOSED';

-- Add new PENDING status value
ALTER TYPE "HearingStatus" ADD VALUE 'PENDING';

-- Add new ActivityAction value
ALTER TYPE "ActivityAction" ADD VALUE 'HEARING_CLOSED';

-- Add closure fields to Hearing table
ALTER TABLE "Hearing" ADD COLUMN "closureNote" TEXT;
ALTER TABLE "Hearing" ADD COLUMN "closedById" TEXT;
ALTER TABLE "Hearing" ADD COLUMN "closedAt" TIMESTAMP(3);

-- Add foreign key constraint for closedBy
ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on closedById
CREATE INDEX "Hearing_closedById_idx" ON "Hearing"("closedById");
