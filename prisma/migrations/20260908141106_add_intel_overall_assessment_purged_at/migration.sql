-- AlterTable
ALTER TABLE "IntelOverallAssessment" ADD COLUMN     "purgedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "IntelOverallAssessment_purgedAt_idx" ON "IntelOverallAssessment"("purgedAt");
