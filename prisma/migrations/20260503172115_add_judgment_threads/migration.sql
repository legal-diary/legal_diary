-- CreateTable
CREATE TABLE "JudgmentThread" (
    "id" TEXT NOT NULL,
    "judgmentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JudgmentThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JudgmentThread_judgmentId_idx" ON "JudgmentThread"("judgmentId");

-- CreateIndex
CREATE INDEX "JudgmentThread_createdById_idx" ON "JudgmentThread"("createdById");

-- AddForeignKey
ALTER TABLE "JudgmentThread" ADD CONSTRAINT "JudgmentThread_judgmentId_fkey" FOREIGN KEY ("judgmentId") REFERENCES "Judgment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgmentThread" ADD CONSTRAINT "JudgmentThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
