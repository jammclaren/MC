-- CreateTable
CREATE TABLE "IntelOverallAssessment" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelOverallAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntelOverallAssessment_createdAt_idx" ON "IntelOverallAssessment"("createdAt");

-- AddForeignKey
ALTER TABLE "IntelOverallAssessment" ADD CONSTRAINT "IntelOverallAssessment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
