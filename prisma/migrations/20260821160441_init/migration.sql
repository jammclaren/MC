-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMMAND', 'JTF_COMMANDER', 'JTF_STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "ThreatCategory" AS ENUM ('CTG', 'LTG', 'CBC');

-- CreateEnum
CREATE TYPE "NeutralizationType" AS ENUM ('CAPTURED', 'KILLED', 'APPREHENDED', 'SURRENDERED');

-- CreateEnum
CREATE TYPE "ForceStatus" AS ENUM ('PSR', 'NPSR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "jtfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JTF" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaOfOps" TEXT,

    CONSTRAINT "JTF_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brigade" TEXT,
    "province" TEXT,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicator" (
    "id" TEXT NOT NULL,
    "category" "ThreatCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "subgroup" TEXT,
    "targetYE" INTEGER,

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccomplishmentRecord" (
    "id" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "jtfId" TEXT,
    "quarter" TEXT NOT NULL,
    "neutralizationType" "NeutralizationType",
    "forceStatus" "ForceStatus",
    "count" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccomplishmentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HviLogEntry" (
    "id" TEXT NOT NULL,
    "category" "ThreatCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "outcome" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "narrative" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HviLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RidoSettlement" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "involving" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RidoSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionArea" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "unitId" TEXT,
    "region" TEXT,
    "province" TEXT NOT NULL,
    "city" TEXT,
    "municipality" TEXT,
    "barangay" TEXT,
    "hotspotCategory" TEXT,
    "hotspotReason" TEXT,
    "numPrecincts" INTEGER,
    "numCenters" INTEGER,
    "registeredVoters" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "ElectionArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TroopDeployment" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "electionAreaId" TEXT,
    "unitLabel" TEXT,
    "deployedToPolling" INTEGER NOT NULL DEFAULT 0,
    "qrf" INTEGER NOT NULL DEFAULT 0,
    "afpOfficers" INTEGER NOT NULL DEFAULT 0,
    "afpEnlisted" INTEGER NOT NULL DEFAULT 0,
    "caa" INTEGER NOT NULL DEFAULT 0,
    "wavsTav" INTEGER NOT NULL DEFAULT 0,
    "pnpOfficers" INTEGER NOT NULL DEFAULT 0,
    "pnpEnlisted" INTEGER NOT NULL DEFAULT 0,
    "checkpointOps" INTEGER NOT NULL DEFAULT 0,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TroopDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "jtfId" TEXT NOT NULL,
    "electionAreaId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "result" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionOpsStatus" (
    "id" TEXT NOT NULL,
    "electionAreaId" TEXT NOT NULL,
    "paraphTotalTreasurer" INTEGER,
    "paraphDeliveredTreasurer" INTEGER,
    "paraphTotalPrecinct" INTEGER,
    "paraphDeliveredPrecinct" INTEGER,
    "acmTestedSealed" BOOLEAN NOT NULL DEFAULT false,
    "votingStarted" BOOLEAN NOT NULL DEFAULT false,
    "votingClosed" BOOLEAN NOT NULL DEFAULT false,
    "transmissionStatus" TEXT,
    "municipalCanvassPct" DOUBLE PRECISION,
    "municipalProclaimed" BOOLEAN NOT NULL DEFAULT false,
    "provincialCanvassPct" DOUBLE PRECISION,
    "provincialProclaimed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionOpsStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_jtfId_idx" ON "User"("jtfId");

-- CreateIndex
CREATE UNIQUE INDEX "JTF_name_key" ON "JTF"("name");

-- CreateIndex
CREATE INDEX "Unit_jtfId_idx" ON "Unit"("jtfId");

-- CreateIndex
CREATE INDEX "AccomplishmentRecord_jtfId_idx" ON "AccomplishmentRecord"("jtfId");

-- CreateIndex
CREATE INDEX "AccomplishmentRecord_quarter_idx" ON "AccomplishmentRecord"("quarter");

-- CreateIndex
CREATE UNIQUE INDEX "AccomplishmentRecord_indicatorId_jtfId_quarter_forceStatus__key" ON "AccomplishmentRecord"("indicatorId", "jtfId", "quarter", "forceStatus", "neutralizationType");

-- CreateIndex
CREATE INDEX "RidoSettlement_jtfId_idx" ON "RidoSettlement"("jtfId");

-- CreateIndex
CREATE UNIQUE INDEX "RidoSettlement_jtfId_quarter_involving_key" ON "RidoSettlement"("jtfId", "quarter", "involving");

-- CreateIndex
CREATE INDEX "ElectionArea_jtfId_idx" ON "ElectionArea"("jtfId");

-- CreateIndex
CREATE INDEX "ElectionArea_unitId_idx" ON "ElectionArea"("unitId");

-- CreateIndex
CREATE INDEX "TroopDeployment_jtfId_idx" ON "TroopDeployment"("jtfId");

-- CreateIndex
CREATE INDEX "TroopDeployment_electionAreaId_idx" ON "TroopDeployment"("electionAreaId");

-- CreateIndex
CREATE INDEX "Incident_jtfId_idx" ON "Incident"("jtfId");

-- CreateIndex
CREATE INDEX "Incident_electionAreaId_idx" ON "Incident"("electionAreaId");

-- CreateIndex
CREATE INDEX "Incident_date_idx" ON "Incident"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionOpsStatus_electionAreaId_key" ON "ElectionOpsStatus"("electionAreaId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccomplishmentRecord" ADD CONSTRAINT "AccomplishmentRecord_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccomplishmentRecord" ADD CONSTRAINT "AccomplishmentRecord_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RidoSettlement" ADD CONSTRAINT "RidoSettlement_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionArea" ADD CONSTRAINT "ElectionArea_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionArea" ADD CONSTRAINT "ElectionArea_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroopDeployment" ADD CONSTRAINT "TroopDeployment_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TroopDeployment" ADD CONSTRAINT "TroopDeployment_electionAreaId_fkey" FOREIGN KEY ("electionAreaId") REFERENCES "ElectionArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_jtfId_fkey" FOREIGN KEY ("jtfId") REFERENCES "JTF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_electionAreaId_fkey" FOREIGN KEY ("electionAreaId") REFERENCES "ElectionArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionOpsStatus" ADD CONSTRAINT "ElectionOpsStatus_electionAreaId_fkey" FOREIGN KEY ("electionAreaId") REFERENCES "ElectionArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
