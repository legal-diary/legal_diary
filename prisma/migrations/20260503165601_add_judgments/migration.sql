-- CreateEnum
CREATE TYPE "JudgmentType" AS ENUM ('RESEARCH', 'OFFICE_JUDGMENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'JUDGMENT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'JUDGMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'JUDGMENT_DELETED';

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'JUDGMENT';

-- CreateTable
CREATE TABLE "Judgment" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "JudgmentType" NOT NULL,
    "category" TEXT NOT NULL,
    "headnote" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Judgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgmentAttachment" (
    "id" TEXT NOT NULL,
    "judgmentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgmentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Judgment_firmId_idx" ON "Judgment"("firmId");

-- CreateIndex
CREATE INDEX "Judgment_createdById_idx" ON "Judgment"("createdById");

-- CreateIndex
CREATE INDEX "JudgmentAttachment_judgmentId_idx" ON "JudgmentAttachment"("judgmentId");

-- AddForeignKey
ALTER TABLE "Judgment" ADD CONSTRAINT "Judgment_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judgment" ADD CONSTRAINT "Judgment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgmentAttachment" ADD CONSTRAINT "JudgmentAttachment_judgmentId_fkey" FOREIGN KEY ("judgmentId") REFERENCES "Judgment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
