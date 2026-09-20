-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('WHITE', 'BLUE', 'RED');

-- CreateTable
CREATE TABLE "AlertLevelStatus" (
    "id" TEXT NOT NULL,
    "level" "AlertLevel" NOT NULL DEFAULT 'WHITE',
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertLevelStatus_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AlertLevelStatus" ADD CONSTRAINT "AlertLevelStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
