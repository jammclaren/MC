-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK');

-- CreateEnum
CREATE TYPE "SocialIncidentClass" AS ENUM ('VIOLENT', 'NON_VIOLENT');

-- AlterEnum
ALTER TYPE "WarfightingFunction" ADD VALUE 'CMO';

-- CreateTable
CREATE TABLE "SocialMediaPost" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL DEFAULT 'FACEBOOK',
    "externalPostId" TEXT,
    "pageName" TEXT NOT NULL,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "postUrl" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "classification" "SocialIncidentClass",
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "sourceNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialMediaPost_postedAt_idx" ON "SocialMediaPost"("postedAt");

-- CreateIndex
CREATE INDEX "SocialMediaPost_classification_idx" ON "SocialMediaPost"("classification");

-- CreateIndex
CREATE INDEX "SocialMediaPost_isHighlighted_idx" ON "SocialMediaPost"("isHighlighted");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMediaPost_platform_externalPostId_key" ON "SocialMediaPost"("platform", "externalPostId");

-- AddForeignKey
ALTER TABLE "SocialMediaPost" ADD CONSTRAINT "SocialMediaPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
