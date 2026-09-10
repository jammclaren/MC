-- CreateTable
CREATE TABLE "SocialListeningReport" (
    "id" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "uniqueSources" INTEGER NOT NULL,
    "engagementLabel" TEXT NOT NULL,
    "overallRiskLevel" TEXT NOT NULL,
    "riskRationale" TEXT NOT NULL,
    "dominantNarratives" TEXT[],
    "emergingNarratives" TEXT[],
    "indicatorsToWatch" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialListeningReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialListeningIssue" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mentions" INTEGER NOT NULL,
    "engagementLabel" TEXT NOT NULL,
    "reachLabel" TEXT NOT NULL,
    "authors" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialListeningIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialListeningPlatformMention" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "mentions" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocialListeningPlatformMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialListeningActivity" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "analysis" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialListeningActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialListeningReport_createdAt_idx" ON "SocialListeningReport"("createdAt");

-- CreateIndex
CREATE INDEX "SocialListeningIssue_reportId_idx" ON "SocialListeningIssue"("reportId");

-- CreateIndex
CREATE INDEX "SocialListeningPlatformMention_reportId_idx" ON "SocialListeningPlatformMention"("reportId");

-- CreateIndex
CREATE INDEX "SocialListeningActivity_reportId_idx" ON "SocialListeningActivity"("reportId");

-- AddForeignKey
ALTER TABLE "SocialListeningReport" ADD CONSTRAINT "SocialListeningReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialListeningIssue" ADD CONSTRAINT "SocialListeningIssue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SocialListeningReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialListeningPlatformMention" ADD CONSTRAINT "SocialListeningPlatformMention_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SocialListeningReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialListeningActivity" ADD CONSTRAINT "SocialListeningActivity_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SocialListeningReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
