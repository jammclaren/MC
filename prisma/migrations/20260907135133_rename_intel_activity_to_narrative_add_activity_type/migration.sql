ALTER TABLE "IntelUpdate" RENAME COLUMN "activity" TO "narrative";
ALTER TABLE "IntelUpdate" ADD COLUMN "activityType" TEXT;
