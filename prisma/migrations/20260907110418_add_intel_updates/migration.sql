-- CreateEnum
CREATE TYPE "IntelCategory" AS ENUM ('NON_VIOLENT', 'VIOLENT');

-- CreateTable
CREATE TABLE "IntelUpdate" (
    "id" TEXT NOT NULL,
    "category" "IntelCategory" NOT NULL,
    "activity" TEXT NOT NULL,
    "threatGroup" TEXT,
    "province" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "source" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntelUpdate_category_idx" ON "IntelUpdate"("category");

-- CreateIndex
CREATE INDEX "IntelUpdate_province_idx" ON "IntelUpdate"("province");

-- CreateIndex
CREATE INDEX "IntelUpdate_date_idx" ON "IntelUpdate"("date");

-- AddForeignKey
ALTER TABLE "IntelUpdate" ADD CONSTRAINT "IntelUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
