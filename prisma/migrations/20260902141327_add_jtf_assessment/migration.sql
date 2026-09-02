-- CreateTable
CREATE TABLE "JtfAssessment" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JtfAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JtfAssessment_jtfId_idx" ON "JtfAssessment"("jtfId");

-- CreateIndex
CREATE INDEX "JtfAssessment_createdAt_idx" ON "JtfAssessment"("createdAt");

-- AddForeignKey
ALTER TABLE "JtfAssessment" ADD CONSTRAINT "JtfAssessment_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JtfAssessment" ADD CONSTRAINT "JtfAssessment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
