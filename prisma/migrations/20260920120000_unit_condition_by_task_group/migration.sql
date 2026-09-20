-- Existing rows predate the taskGroupName dimension (they were one row
-- per JTF, demo/test data); clear them rather than backfilling a
-- placeholder value.
TRUNCATE TABLE "UnitCondition";

-- DropIndex
DROP INDEX "UnitCondition_jtfId_key";

-- AlterTable
ALTER TABLE "UnitCondition" ADD COLUMN     "taskGroupName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UnitCondition_jtfId_taskGroupName_key" ON "UnitCondition"("jtfId", "taskGroupName");
