-- DropForeignKey
ALTER TABLE "TroopDeployment" DROP CONSTRAINT IF EXISTS "TroopDeployment_jtfId_fkey";
ALTER TABLE "TroopDeployment" DROP CONSTRAINT IF EXISTS "TroopDeployment_electionAreaId_fkey";

-- DropTable
DROP TABLE IF EXISTS "TroopDeployment";

-- CreateTable
CREATE TABLE "SitRep" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkpointOpsTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SitRep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" TEXT NOT NULL,
    "sitRepId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroupUnit" (
    "id" TEXT NOT NULL,
    "taskGroupId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskGroupUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroupCriticalAsset" (
    "id" TEXT NOT NULL,
    "taskGroupId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,

    CONSTRAINT "TaskGroupCriticalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckpointOp" (
    "id" TEXT NOT NULL,
    "sitRepId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "CheckpointOp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArmedEngagement" (
    "id" TEXT NOT NULL,
    "sitRepId" TEXT NOT NULL,
    "unitInvolved" TEXT NOT NULL,
    "confrontedThreat" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "results" TEXT NOT NULL,

    CONSTRAINT "ArmedEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignificantActivity" (
    "id" TEXT NOT NULL,
    "sitRepId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SignificantActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SitRep_jtfId_idx" ON "SitRep"("jtfId");

-- CreateIndex
CREATE INDEX "TaskGroup_sitRepId_idx" ON "TaskGroup"("sitRepId");

-- CreateIndex
CREATE INDEX "TaskGroupUnit_taskGroupId_idx" ON "TaskGroupUnit"("taskGroupId");

-- CreateIndex
CREATE INDEX "TaskGroupCriticalAsset_taskGroupId_idx" ON "TaskGroupCriticalAsset"("taskGroupId");

-- CreateIndex
CREATE INDEX "CheckpointOp_sitRepId_idx" ON "CheckpointOp"("sitRepId");

-- CreateIndex
CREATE UNIQUE INDEX "ArmedEngagement_sitRepId_key" ON "ArmedEngagement"("sitRepId");

-- CreateIndex
CREATE INDEX "SignificantActivity_sitRepId_idx" ON "SignificantActivity"("sitRepId");

-- AddForeignKey
ALTER TABLE "SitRep" ADD CONSTRAINT "SitRep_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitRep" ADD CONSTRAINT "SitRep_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroup" ADD CONSTRAINT "TaskGroup_sitRepId_fkey" FOREIGN KEY ("sitRepId") REFERENCES "SitRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroupUnit" ADD CONSTRAINT "TaskGroupUnit_taskGroupId_fkey" FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskGroupCriticalAsset" ADD CONSTRAINT "TaskGroupCriticalAsset_taskGroupId_fkey" FOREIGN KEY ("taskGroupId") REFERENCES "TaskGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointOp" ADD CONSTRAINT "CheckpointOp_sitRepId_fkey" FOREIGN KEY ("sitRepId") REFERENCES "SitRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArmedEngagement" ADD CONSTRAINT "ArmedEngagement_sitRepId_fkey" FOREIGN KEY ("sitRepId") REFERENCES "SitRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignificantActivity" ADD CONSTRAINT "SignificantActivity_sitRepId_fkey" FOREIGN KEY ("sitRepId") REFERENCES "SitRep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
