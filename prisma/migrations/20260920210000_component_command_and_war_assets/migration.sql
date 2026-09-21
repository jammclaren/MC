-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COMPONENT_COMMAND';

-- AlterTable
ALTER TABLE "TaskGroup" ADD COLUMN     "wavCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wavUnserviceable" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tavCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tavUnserviceable" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "artilleryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "artilleryUnserviceable" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "navalCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "navalUnserviceable" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('AIR', 'NAVAL');

-- CreateTable
CREATE TABLE "ComponentSitRep" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentSitRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentSitRepUnit" (
    "id" TEXT NOT NULL,
    "componentSitRepId" TEXT NOT NULL,
    "component" "ComponentType" NOT NULL,
    "unitName" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComponentSitRepUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentSitRepAsset" (
    "id" TEXT NOT NULL,
    "componentSitRepId" TEXT NOT NULL,
    "component" "ComponentType" NOT NULL,
    "assetName" TEXT NOT NULL,
    "number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComponentSitRepAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComponentSitRep_createdById_idx" ON "ComponentSitRep"("createdById");

-- CreateIndex
CREATE INDEX "ComponentSitRepUnit_componentSitRepId_idx" ON "ComponentSitRepUnit"("componentSitRepId");

-- CreateIndex
CREATE INDEX "ComponentSitRepAsset_componentSitRepId_idx" ON "ComponentSitRepAsset"("componentSitRepId");

-- AddForeignKey
ALTER TABLE "ComponentSitRep" ADD CONSTRAINT "ComponentSitRep_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSitRepUnit" ADD CONSTRAINT "ComponentSitRepUnit_componentSitRepId_fkey" FOREIGN KEY ("componentSitRepId") REFERENCES "ComponentSitRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentSitRepAsset" ADD CONSTRAINT "ComponentSitRepAsset_componentSitRepId_fkey" FOREIGN KEY ("componentSitRepId") REFERENCES "ComponentSitRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
