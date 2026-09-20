-- CreateTable
CREATE TABLE "UnitCondition" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "personnelPct" INTEGER NOT NULL,
    "equipmentPct" INTEGER NOT NULL,
    "maintenancePct" INTEGER NOT NULL,
    "facilityPct" INTEGER NOT NULL,
    "trainingPct" INTEGER NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitCondition_jtfId_key" ON "UnitCondition"("jtfId");

-- AddForeignKey
ALTER TABLE "UnitCondition" ADD CONSTRAINT "UnitCondition_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitCondition" ADD CONSTRAINT "UnitCondition_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
