-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "closingComment" TEXT;

-- CreateIndex
CREATE INDEX "Todo_closedById_idx" ON "Todo"("closedById");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
