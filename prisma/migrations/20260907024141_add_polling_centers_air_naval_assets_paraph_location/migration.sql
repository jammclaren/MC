-- AlterTable
ALTER TABLE "ElectionOpsStatus" ADD COLUMN     "paraphLocation" TEXT;

-- AlterTable
ALTER TABLE "TroopDeployment" ADD COLUMN     "airAssetCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "airAssetType" TEXT,
ADD COLUMN     "deployedToPollingCenters" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "navalAssetCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "navalAssetType" TEXT;
