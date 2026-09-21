-- CreateEnum
CREATE TYPE "CmoActivityCategory" AS ENUM ('PUBLIC_AFFAIRS', 'CIVIL_AFFAIRS', 'PSYOPS', 'IEC');

-- CreateTable
CREATE TABLE "CmoActivity" (
    "id" TEXT NOT NULL,
    "category" "CmoActivityCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmoActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CmoActivity_category_idx" ON "CmoActivity"("category");

-- CreateIndex
CREATE INDEX "CmoActivity_date_idx" ON "CmoActivity"("date");

-- AddForeignKey
ALTER TABLE "CmoActivity" ADD CONSTRAINT "CmoActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
